import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { randomUUID } from "node:crypto";
import {
  DEFAULT_ORG_ROOT_NAME,
  ORG_OWNER_UIDS_CAP,
  canAccessAdmin,
  canManagePlatform,
  depthForType,
  isUserAssignableOrgType,
  isValidChildType,
  parseOrgNodeType,
  validateEin,
  validateNpn,
  validateOptionalEmail,
} from "@pulse/shared";
import { db, callableOpts, storageBucket } from "./init";
import { requireCaller } from "./auth";
import { buildOrgNodePath, serializeOrgNode } from "./org-helpers";
import { loadPermissionsForUid } from "./permissions";

export { buildOrgNodePath, serializeOrgNode } from "./org-helpers";

const ORG_ROOT_ID = "root";

/** Roles we may promote to / demote from agency_owner. */
const OWNER_PROMOTABLE = new Set([
  "student",
  "agent",
  "guest",
  "agency_owner",
]);
const PRIVILEGED_ROLES = new Set(["admin", "system", "manager"]);

async function requireOrgAdmin(
  request: { auth?: { uid: string } },
  operation: string,
  platformOnly = false,
) {
  const uid = await requireCaller(request, operation);
  const { permissions } = await loadPermissionsForUid(uid);
  if (platformOnly ? !canManagePlatform(permissions) : !canAccessAdmin(permissions)) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  return uid;
}

function emptyAgencyProfile() {
  return {
    ownerUids: [] as string[],
    logoUrl: null as string | null,
    email: null as string | null,
    paymentsEmail: null as string | null,
    npn: null as string | null,
    agencyLicense: null as string | null,
    ein: null as string | null,
  };
}

function parseOwnerUids(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(raw.map(String).map((s) => s.trim()).filter(Boolean)),
  ].slice(0, ORG_OWNER_UIDS_CAP);
}

function parseAgencyProfileFields(data: Record<string, unknown> | undefined) {
  const out: Record<string, unknown> = {};
  if (!data) return out;

  if ("logoUrl" in data) {
    const v = data.logoUrl;
    if (v === null || v === "") out.logoUrl = null;
    else if (typeof v === "string" && v.trim().startsWith("http") && v.length < 2000) {
      out.logoUrl = v.trim();
    } else {
      throw new HttpsError("invalid-argument", "Invalid logoUrl.");
    }
  }

  if ("email" in data) {
    const email = validateOptionalEmail(
      data.email === null ? "" : String(data.email ?? ""),
    );
    if (!email.ok) throw new HttpsError("invalid-argument", "Invalid email.");
    out.email = email.value;
  }

  if ("paymentsEmail" in data) {
    const email = validateOptionalEmail(
      data.paymentsEmail === null ? "" : String(data.paymentsEmail ?? ""),
    );
    if (!email.ok) {
      throw new HttpsError("invalid-argument", "Invalid paymentsEmail.");
    }
    out.paymentsEmail = email.value;
  }

  if ("npn" in data) {
    const raw = data.npn === null ? "" : String(data.npn ?? "");
    if (!raw.trim()) {
      out.npn = null;
    } else {
      const npn = validateNpn(raw);
      if (!npn.ok) throw new HttpsError("invalid-argument", "Invalid NPN.");
      out.npn = npn.value;
    }
  }

  if ("agencyLicense" in data) {
    const v = data.agencyLicense;
    if (v === null || v === "") out.agencyLicense = null;
    else if (typeof v === "string" && v.trim().length <= 120) {
      out.agencyLicense = v.trim();
    } else {
      throw new HttpsError("invalid-argument", "Invalid agencyLicense.");
    }
  }

  if ("ein" in data) {
    const ein = validateEin(data.ein === null ? "" : String(data.ein ?? ""));
    if (!ein.ok) throw new HttpsError("invalid-argument", "Invalid EIN.");
    out.ein = ein.value;
  }

  if ("ownerUids" in data) {
    out.ownerUids = parseOwnerUids(data.ownerUids);
  }

  return out;
}

async function syncAgencyOwners(opts: {
  orgNodeId: string;
  agencyName: string;
  previous: string[];
  next: string[];
}) {
  const prev = new Set(opts.previous);
  const next = new Set(opts.next);
  const added = [...next].filter((uid) => !prev.has(uid));
  const removed = [...prev].filter((uid) => !next.has(uid));
  if (added.length === 0 && removed.length === 0) return;

  const batch = db.batch();
  let ops = 0;

  for (const uid of added) {
    const ref = db.doc(`users/${uid}`);
    const snap = await ref.get();
    if (!snap.exists) continue;
    const data = snap.data() ?? {};
    const role = String(data.role ?? "guest");
    if (PRIVILEGED_ROLES.has(role)) continue;
    if (!OWNER_PROMOTABLE.has(role) && role !== "agency_owner") continue;
    const patch: Record<string, unknown> = {
      role: "agency_owner",
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (!data.orgNodeId) {
      patch.orgNodeId = opts.orgNodeId;
      patch.agency = opts.agencyName;
    }
    batch.set(ref, patch, { merge: true });
    ops += 1;
  }

  for (const uid of removed) {
    const ref = db.doc(`users/${uid}`);
    const snap = await ref.get();
    if (!snap.exists) continue;
    const role = String(snap.data()?.role ?? "");
    if (role !== "agency_owner") continue;
    batch.set(
      ref,
      { role: "agent", updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    ops += 1;
  }

  if (ops > 0) await batch.commit();

  const { syncAgentParticipantSafe } = await import(
    "./payments-participants-sync"
  );
  for (const uid of [...added, ...removed]) {
    const snap = await db.doc(`users/${uid}`).get();
    if (snap.exists) {
      await syncAgentParticipantSafe(uid, snap.data() ?? {});
    }
  }
}

export const ensureOrgRoot = onCall(callableOpts, async (request) => {
  await requireOrgAdmin(request, "ensureOrgRoot", true);
  const preferredRef = db.doc(`orgNodes/${ORG_ROOT_ID}`);
  const preferredSnap = await preferredRef.get();
  if (preferredSnap.exists) {
    return { node: serializeOrgNode(ORG_ROOT_ID, preferredSnap.data() ?? {}) };
  }

  const existingRoots = await db
    .collection("orgNodes")
    .where("parentId", "==", null)
    .limit(20)
    .get();
  const activeRoot = existingRoots.docs.find((doc) => {
    const data = doc.data();
    return data.type === "organization" && data.active !== false;
  });
  if (activeRoot) {
    return { node: serializeOrgNode(activeRoot.id, activeRoot.data()) };
  }

  const node = {
    name: DEFAULT_ORG_ROOT_NAME,
    type: "organization" as const,
    depth: depthForType("organization"),
    parentId: null as string | null,
    path: buildOrgNodePath([], ORG_ROOT_ID),
    managerUids: [] as string[],
    ...emptyAgencyProfile(),
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await preferredRef.set(node);
  return {
    node: serializeOrgNode(ORG_ROOT_ID, {
      ...node,
      createdAt: null,
      updatedAt: null,
    } as DocumentData),
  };
});

export const listOrgSubtree = onCall(callableOpts, async (request) => {
  await requireOrgAdmin(request, "listOrgSubtree");
  const includeInactive = request.data?.includeInactive === true;
  const fullTree = request.data?.full === true;
  const parentId =
    request.data?.parentId === undefined || request.data?.parentId === null
      ? null
      : String(request.data.parentId);

  if (fullTree) {
    const snap = await db.collection("orgNodes").limit(500).get();
    const nodes = snap.docs
      .filter((doc) => includeInactive || doc.data().active !== false)
      .map((doc) => serializeOrgNode(doc.id, doc.data()));
    return { nodes };
  }

  const snap = await db
    .collection("orgNodes")
    .where("parentId", "==", parentId)
    .limit(200)
    .get();
  const nodes = snap.docs
    .filter((doc) => includeInactive || doc.data().active !== false)
    .map((doc) => serializeOrgNode(doc.id, doc.data()));
  return { nodes };
});

/**
 * Paginated assignable agencies for Admin (matrix + agencies + legacy sub_agency).
 */
export const listAgenciesForAdmin = onCall(callableOpts, async (request) => {
  await requireOrgAdmin(request, "listAgenciesForAdmin");
  const pageSize = Math.max(
    1,
    Math.min(100, Math.round(Number(request.data?.pageSize ?? 25))),
  );
  const pageToken = String(request.data?.pageToken ?? "").trim();
  const includeInactive = request.data?.includeInactive === true;
  const query = String(request.data?.query ?? "").trim().toLowerCase();

  const ORG_PAGE_LIMIT = 400;
  const snaps = await Promise.all([
    db.collection("orgNodes").where("type", "==", "organization").limit(50).get(),
    db
      .collection("orgNodes")
      .where("type", "==", "agency")
      .limit(ORG_PAGE_LIMIT)
      .get(),
    db
      .collection("orgNodes")
      .where("type", "==", "sub_agency")
      .limit(ORG_PAGE_LIMIT)
      .get(),
  ]);

  const seen = new Set<string>();
  let agencies = snaps
    .flatMap((snap) => snap.docs)
    .filter((doc) => {
      if (seen.has(doc.id)) return false;
      seen.add(doc.id);
      return isUserAssignableOrgType(doc.data().type);
    })
    .map((doc) => serializeOrgNode(doc.id, doc.data()))
    .filter((node) => includeInactive || node.active)
    .sort((a, b) => {
      if (a.type !== b.type) {
        const rank = (t: string) =>
          t === "organization" ? 0 : t === "agency" ? 1 : 2;
        return rank(a.type) - rank(b.type);
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });

  if (query) {
    agencies = agencies.filter((node) =>
      node.name.toLowerCase().includes(query),
    );
  }

  let start = 0;
  if (pageToken) {
    const idx = agencies.findIndex(
      (node) => node.id === pageToken || node.name === pageToken,
    );
    start = idx >= 0 ? idx + 1 : 0;
  }
  const page = agencies.slice(start, start + pageSize);
  const last = page[page.length - 1];
  const nextPageToken =
    start + page.length < agencies.length && last && !query ? last.id : null;

  return { agencies: page, nextPageToken };
});

export const createOrgNode = onCall(callableOpts, async (request) => {
  await requireOrgAdmin(request, "createOrgNode", true);
  const name = String(request.data?.name ?? "").trim();
  const type = parseOrgNodeType(request.data?.type);
  const parentId = String(request.data?.parentId ?? "").trim();
  if (!name || name.length > 120) {
    throw new HttpsError("invalid-argument", "Valid name required.");
  }
  if (!type) {
    throw new HttpsError("invalid-argument", "Invalid org node type.");
  }
  if (type === "sub_agency") {
    throw new HttpsError(
      "invalid-argument",
      "Use type agency under another agency instead of sub_agency.",
    );
  }
  if (!parentId) {
    throw new HttpsError("invalid-argument", "parentId required.");
  }

  const parentSnap = await db.doc(`orgNodes/${parentId}`).get();
  if (!parentSnap.exists) {
    throw new HttpsError("not-found", "Parent org node not found.");
  }
  const parentData = parentSnap.data() ?? {};
  const parentType = parseOrgNodeType(parentData.type);
  if (!parentType || !isValidChildType(parentType, type)) {
    throw new HttpsError(
      "invalid-argument",
      `Type ${type} is not a valid child of ${String(parentData.type)}.`,
    );
  }
  if (parentData.active === false) {
    throw new HttpsError("failed-precondition", "Parent node is inactive.");
  }

  const profile = parseAgencyProfileFields(
    request.data as Record<string, unknown>,
  );
  const ownerUids = Array.isArray(profile.ownerUids)
    ? (profile.ownerUids as string[])
    : [];

  const ref = db.collection("orgNodes").doc();
  const parentPath = Array.isArray(parentData.path)
    ? parentData.path.map(String)
    : [parentId];
  const parentDepth = Number(parentData.depth);
  const depth =
    Number.isFinite(parentDepth) && parentDepth >= 1
      ? Math.min(7, Math.floor(parentDepth) + 1)
      : depthForType(type);

  const payload = {
    name,
    type,
    depth,
    parentId,
    path: buildOrgNodePath(parentPath, ref.id),
    managerUids: [] as string[],
    ...emptyAgencyProfile(),
    ...profile,
    ownerUids,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(payload);
  if (ownerUids.length > 0) {
    await syncAgencyOwners({
      orgNodeId: ref.id,
      agencyName: name,
      previous: [],
      next: ownerUids,
    });
  }
  const { syncAgencyParticipantSafe } = await import(
    "./payments-participants-sync"
  );
  await syncAgencyParticipantSafe(ref.id, payload as DocumentData);
  const { bumpOrgNodeCreated } = await import("./platform-stats");
  await bumpOrgNodeCreated();
  return {
    node: serializeOrgNode(ref.id, {
      ...payload,
      createdAt: null,
      updatedAt: null,
    } as DocumentData),
  };
});

export const updateOrgNode = onCall(callableOpts, async (request) => {
  await requireOrgAdmin(request, "updateOrgNode", true);
  const id = String(request.data?.id ?? "").trim();
  if (!id) throw new HttpsError("invalid-argument", "id required");
  const ref = db.doc(`orgNodes/${id}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Org node not found.");
  const prev = snap.data() ?? {};

  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (typeof request.data?.name === "string") {
    const name = request.data.name.trim();
    if (!name || name.length > 120) {
      throw new HttpsError("invalid-argument", "Invalid name.");
    }
    updates.name = name;
  }
  if (typeof request.data?.active === "boolean") {
    updates.active = request.data.active;
  }
  if (Array.isArray(request.data?.managerUids)) {
    updates.managerUids = [
      ...new Set(request.data.managerUids.map(String).filter(Boolean)),
    ].slice(0, 50);
  }

  Object.assign(
    updates,
    parseAgencyProfileFields(request.data as Record<string, unknown>),
  );

  await ref.update(updates);

  if (Array.isArray(updates.ownerUids)) {
    const previous = Array.isArray(prev.ownerUids)
      ? prev.ownerUids.map(String)
      : [];
    const agencyName =
      typeof updates.name === "string"
        ? String(updates.name)
        : String(prev.name ?? "");
    await syncAgencyOwners({
      orgNodeId: id,
      agencyName,
      previous,
      next: updates.ownerUids as string[],
    });
  }

  const after = await ref.get();
  const { syncAgencyParticipantSafe } = await import(
    "./payments-participants-sync"
  );
  await syncAgencyParticipantSafe(id, after.data() ?? {});
  return { node: serializeOrgNode(id, after.data() ?? {}) };
});

export const assignUserToOrgNode = onCall(callableOpts, async (request) => {
  await requireOrgAdmin(request, "assignUserToOrgNode", true);
  const uid = String(request.data?.uid ?? "").trim();
  const orgNodeIdRaw = request.data?.orgNodeId;
  const orgNodeId =
    orgNodeIdRaw === null || orgNodeIdRaw === undefined
      ? null
      : String(orgNodeIdRaw).trim() || null;
  if (!uid) throw new HttpsError("invalid-argument", "uid required");

  let agencyName: string | null = null;
  if (orgNodeId) {
    const node = await db.doc(`orgNodes/${orgNodeId}`).get();
    if (!node.exists) {
      throw new HttpsError("not-found", "Org node not found.");
    }
    if (node.data()?.active === false) {
      throw new HttpsError("failed-precondition", "Org node is inactive.");
    }
    if (typeof node.data()?.name === "string") {
      agencyName = String(node.data()?.name);
    }
  }

  const userRef = db.doc(`users/${uid}`);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new HttpsError("not-found", "User not found.");

  const updates: Record<string, unknown> = {
    orgNodeId,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (agencyName) updates.agency = agencyName;
  await userRef.update(updates);
  const after = await userRef.get();
  const { syncAgentParticipantSafe } = await import(
    "./payments-participants-sync"
  );
  await syncAgentParticipantSafe(uid, after.data() ?? {});
  return { ok: true, uid, orgNodeId };
});

/** Flat list by org type (e.g. regions / agencies for parent pickers). */
export const listOrgNodesByType = onCall(callableOpts, async (request) => {
  await requireOrgAdmin(request, "listOrgNodesByType");
  const type = parseOrgNodeType(request.data?.type);
  if (!type) {
    throw new HttpsError("invalid-argument", "Valid type required.");
  }
  const pageSize = Math.max(
    1,
    Math.min(200, Math.round(Number(request.data?.pageSize ?? 100))),
  );
  const includeInactive = request.data?.includeInactive === true;
  const snap = await db
    .collection("orgNodes")
    .where("type", "==", type)
    .limit(Math.max(pageSize, 500))
    .get();
  const nodes = snap.docs
    .map((doc) => serializeOrgNode(doc.id, doc.data()))
    .filter((node) => includeInactive || node.active)
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    )
    .slice(0, pageSize);
  return { nodes };
});

/**
 * Public-to-signed-in list of active assignable agencies for profile completion.
 */
export const listAgenciesForProfile = onCall(callableOpts, async (request) => {
  await requireCaller(request, "listAgenciesForProfile");

  const snaps = await Promise.all([
    db.collection("orgNodes").where("type", "==", "organization").limit(50).get(),
    db.collection("orgNodes").where("type", "==", "agency").limit(400).get(),
    db.collection("orgNodes").where("type", "==", "sub_agency").limit(400).get(),
  ]);

  const seen = new Set<string>();
  const agencies = snaps
    .flatMap((snap) => snap.docs)
    .map((doc) => {
      if (seen.has(doc.id)) return null;
      seen.add(doc.id);
      const data = doc.data();
      if (!isUserAssignableOrgType(data.type)) return null;
      if (data.active === false) return null;
      const name = String(data.name ?? "").trim();
      if (!name) return null;
      return {
        id: doc.id,
        name,
        type: String(data.type),
      };
    })
    .filter(
      (row): row is { id: string; name: string; type: string } => row !== null,
    )
    .sort((a, b) => {
      if (a.type !== b.type) {
        const rank = (t: string) =>
          t === "organization" ? 0 : t === "agency" ? 1 : 2;
        return rank(a.type) - rank(b.type);
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    })
    .map(({ id, name }) => ({ id, name }));

  return { agencies };
});

/** One-shot: rewrite legacy `sub_agency` nodes to `agency`. */
export const migrateSubAgenciesToAgencies = onCall(
  { ...callableOpts, timeoutSeconds: 300 },
  async (request) => {
    await requireOrgAdmin(request, "migrateSubAgenciesToAgencies", true);
    const snap = await db
      .collection("orgNodes")
      .where("type", "==", "sub_agency")
      .limit(500)
      .get();

    let updated = 0;
    let batch = db.batch();
    let ops = 0;
    const flush = async () => {
      if (ops === 0) return;
      await batch.commit();
      batch = db.batch();
      ops = 0;
    };

    for (const doc of snap.docs) {
      batch.set(
        doc.ref,
        {
          type: "agency",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      ops += 1;
      updated += 1;
      if (ops >= 400) await flush();
    }
    await flush();

    return {
      scanned: snap.size,
      updated,
      done: snap.size < 500,
    };
  },
);

const ORG_LOGO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/**
 * Upload agency/matrix logo via Admin SDK (bypasses Storage rules).
 * Client Storage writes that depend on firestore.get() often fail closed as 403.
 */
export const uploadOrgLogo = onCall(
  { ...callableOpts, memory: "512MiB", timeoutSeconds: 60 },
  async (request) => {
    await requireOrgAdmin(request, "uploadOrgLogo", true);
    const orgNodeId = String(request.data?.orgNodeId ?? "").trim();
    if (!orgNodeId || orgNodeId.length > 128) {
      throw new HttpsError("invalid-argument", "orgNodeId required.");
    }
    const nodeSnap = await db.doc(`orgNodes/${orgNodeId}`).get();
    if (!nodeSnap.exists) {
      throw new HttpsError("not-found", "Org node not found.");
    }

    const contentType = String(request.data?.contentType ?? "image/jpeg").trim();
    if (!ORG_LOGO_TYPES.has(contentType)) {
      throw new HttpsError(
        "invalid-argument",
        "Logo must be JPEG, PNG, or WebP.",
      );
    }

    const base64 = String(request.data?.bytesBase64 ?? "");
    if (!base64 || base64.length > 7_000_000) {
      throw new HttpsError("invalid-argument", "Logo payload missing or too large.");
    }
    const buffer = Buffer.from(base64, "base64");
    if (!buffer.length || buffer.length >= 5 * 1024 * 1024) {
      throw new HttpsError("invalid-argument", "Logo must be under 5MB.");
    }

    const path = `org-logos/${orgNodeId}.jpg`;
    const token = randomUUID();
    const file = storageBucket().file(path);
    await file.save(buffer, {
      resumable: false,
      contentType,
      metadata: {
        contentType,
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });

    const bucket = file.bucket.name;
    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
    return { downloadUrl, path };
  },
);
