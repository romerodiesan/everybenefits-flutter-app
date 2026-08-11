import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  DEFAULT_ORG_ROOT_NAME,
  canAccessAdmin,
  canManagePlatform,
  depthForType,
  isValidChildType,
  parseOrgNodeType,
} from "@pulse/shared";
import { db, callableOpts } from "./init";
import { requireCaller } from "./auth";
import { buildOrgNodePath, serializeOrgNode } from "./org-helpers";
import { loadPermissionsForUid } from "./permissions";

export { buildOrgNodePath, serializeOrgNode } from "./org-helpers";

const ORG_ROOT_ID = "root";

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

export const ensureOrgRoot = onCall(callableOpts, async (request) => {
  await requireOrgAdmin(request, "ensureOrgRoot", true);
  const preferredRef = db.doc(`orgNodes/${ORG_ROOT_ID}`);
  const preferredSnap = await preferredRef.get();
  if (preferredSnap.exists) {
    return { node: serializeOrgNode(ORG_ROOT_ID, preferredSnap.data() ?? {}) };
  }

  // Prefer an existing organization root (parentId == null) over creating a
  // second empty "Every Benefits" matrix next to a migrated tree.
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

  // Escape hatch for rare tooling — hard-capped; prefer lazy parentId loads.
  if (fullTree) {
    const snap = await db.collection("orgNodes").limit(500).get();
    const nodes = snap.docs
      .filter((doc) => includeInactive || doc.data().active !== false)
      .map((doc) => serializeOrgNode(doc.id, doc.data()));
    return { nodes };
  }

  // Lazy: null parentId → roots only (parentId == null).
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
 * Paginated agencies for Admin (type == agency). Soft-deleted = active:false.
 * Sorts in memory (same pattern as listAgenciesForProfile) so the list works
 * even when the type+name composite index is still building.
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

  const snap = await db
    .collection("orgNodes")
    .where("type", "==", "agency")
    .limit(3000)
    .get();

  let agencies = snap.docs
    .map((doc) => serializeOrgNode(doc.id, doc.data()))
    .filter((node) => includeInactive || node.active)
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );

  if (query) {
    agencies = agencies.filter((node) =>
      node.name.toLowerCase().includes(query),
    );
  }

  let start = 0;
  if (pageToken) {
    const idx = agencies.findIndex((node) => node.name === pageToken);
    start = idx >= 0 ? idx + 1 : 0;
  }
  const page = agencies.slice(start, start + pageSize);
  const last = page[page.length - 1];
  const nextPageToken =
    start + page.length < agencies.length && last && !query ? last.name : null;

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

  const ref = db.collection("orgNodes").doc();
  const parentPath = Array.isArray(parentData.path)
    ? parentData.path.map(String)
    : [parentId];
  const payload = {
    name,
    type,
    depth: depthForType(type),
    parentId,
    path: buildOrgNodePath(parentPath, ref.id),
    managerUids: [] as string[],
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(payload);
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

  await ref.update(updates);
  const after = await ref.get();
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
  return { ok: true, uid, orgNodeId };
});

/** Flat list by org type (e.g. regions for agency parent picker). */
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
  // Avoid requiring the type+name composite index (sort in memory).
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
 * Public-to-signed-in list of active agencies for profile completion.
 * Returns id + name only (no managers / path).
 */
export const listAgenciesForProfile = onCall(callableOpts, async (request) => {
  await requireCaller(request, "listAgenciesForProfile");

  const snap = await db
    .collection("orgNodes")
    .where("type", "==", "agency")
    .limit(2000)
    .get();

  const agencies = snap.docs
    .map((doc) => {
      const data = doc.data();
      if (data.active === false) return null;
      const name = String(data.name ?? "").trim();
      if (!name) return null;
      return { id: doc.id, name };
    })
    .filter((row): row is { id: string; name: string } => row !== null)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  return { agencies };
});
