import {
  FieldValue,
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { isUserAssignableOrgType } from "@pulse/shared";
import { db } from "./init";

const SYNC_PAGE_SIZE = 400;
const SYNC_MAX_PAGES = 25;

const AGENT_SYNC_ROLES = new Set([
  "agent",
  "agency_owner",
  "instructor",
  "manager",
  "admin",
]);

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function headlineName(data: DocumentData | undefined): string {
  const display = stringOrNull(data?.displayName);
  if (display) return display;
  const email = stringOrNull(data?.email);
  if (email) return email;
  return "Agent";
}

type ParticipantIndex = {
  byOrg: Map<string, QueryDocumentSnapshot>;
  byUser: Map<string, QueryDocumentSnapshot>;
};

async function findParticipantByField(
  field: "linkedOrgNodeId" | "userId",
  value: string,
  index?: ParticipantIndex,
) {
  if (index) {
    const hit =
      field === "linkedOrgNodeId" ? index.byOrg.get(value) : index.byUser.get(value);
    if (hit) return hit;
  }
  const snap = await db
    .collection("paymentsParticipants")
    .where(field, "==", value)
    .limit(1)
    .get();
  const doc = snap.docs[0] ?? null;
  if (doc && index) {
    if (field === "linkedOrgNodeId") index.byOrg.set(value, doc);
    else index.byUser.set(value, doc);
  }
  return doc;
}

function rememberParticipant(
  index: ParticipantIndex | undefined,
  field: "linkedOrgNodeId" | "userId",
  value: string,
  doc: QueryDocumentSnapshot,
) {
  if (!index) return;
  if (field === "linkedOrgNodeId") index.byOrg.set(value, doc);
  else index.byUser.set(value, doc);
}

async function loadParticipantIndex(): Promise<ParticipantIndex> {
  const byOrg = new Map<string, QueryDocumentSnapshot>();
  const byUser = new Map<string, QueryDocumentSnapshot>();
  const snap = await db.collection("paymentsParticipants").limit(2000).get();
  for (const doc of snap.docs) {
    const data = doc.data();
    const orgId = stringOrNull(data.linkedOrgNodeId);
    const userId = stringOrNull(data.userId);
    if (orgId && String(data.type ?? "") === "agency") byOrg.set(orgId, doc);
    if (userId && String(data.type ?? "") === "agent") byUser.set(userId, doc);
  }
  return { byOrg, byUser };
}

async function collectPagedDocs(
  collectionPath: string,
  pageSize = SYNC_PAGE_SIZE,
  maxPages = SYNC_MAX_PAGES,
  whereField?: { field: string; value: string },
): Promise<QueryDocumentSnapshot[]> {
  const docs: QueryDocumentSnapshot[] = [];
  let last: QueryDocumentSnapshot | undefined;
  for (let page = 0; page < maxPages; page += 1) {
    let query: Query = db.collection(collectionPath);
    if (whereField) {
      query = query.where(whereField.field, "==", whereField.value);
    }
    query = query.orderBy("__name__").limit(pageSize);
    if (last) query = query.startAfter(last);
    const snap = await query.get();
    if (snap.empty) break;
    docs.push(...snap.docs);
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < pageSize) break;
  }
  return docs;
}

/**
 * Ensure a payments agency participant exists for an assignable org node.
 * Returns the participant id, or null if the node is not assignable.
 */
export async function ensureAgencyParticipant(
  orgNodeId: string,
  data: DocumentData,
  index?: ParticipantIndex,
): Promise<string | null> {
  if (!isUserAssignableOrgType(data.type)) return null;

  const name = stringOrNull(data.name) || "Agency";
  const npn = stringOrNull(data.npn);
  const active = data.active !== false;
  const existing = await findParticipantByField(
    "linkedOrgNodeId",
    orgNodeId,
    index,
  );

  const payload: Record<string, unknown> = {
    name,
    type: "agency",
    userId: null,
    npn,
    linkedOrgNodeId: orgNodeId,
    active,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (existing) {
    await existing.ref.set(payload, { merge: true });
    rememberParticipant(index, "linkedOrgNodeId", orgNodeId, existing);
    return existing.id;
  }

  const ref = db.collection("paymentsParticipants").doc();
  await ref.set({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
  });
  const created = await ref.get();
  if (created.exists) {
    rememberParticipant(
      index,
      "linkedOrgNodeId",
      orgNodeId,
      created as QueryDocumentSnapshot,
    );
  }
  return ref.id;
}

function isAgentSyncEligible(data: DocumentData | undefined): boolean {
  if (!data) return false;
  const role = String(data.role ?? "student");
  if (!AGENT_SYNC_ROLES.has(role)) return false;
  const approval = String(data.approvalStatus ?? "approved");
  if (approval !== "approved") return false;
  if (data.isAnonymous === true) return false;
  return true;
}

function isUserAccountActive(data: DocumentData | undefined): boolean {
  const status = String(data?.accountStatus ?? "active");
  return status !== "deactivated" && status !== "pendingDeletion";
}

/**
 * Ensure a payments agent participant for an approved eligible member.
 * If the user is no longer eligible, soft-deactivates an existing linked participant.
 */
export async function ensureAgentParticipant(
  uid: string,
  data: DocumentData,
  index?: ParticipantIndex,
): Promise<string | null> {
  const existing = await findParticipantByField("userId", uid, index);
  const eligible = isAgentSyncEligible(data);

  if (!eligible) {
    if (existing && existing.data()?.active !== false) {
      await existing.ref.set(
        {
          active: false,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    return existing?.id ?? null;
  }

  const name = headlineName(data);
  const npn = stringOrNull(data.npn);
  const orgNodeId = stringOrNull(data.orgNodeId);
  const active = isUserAccountActive(data);

  const payload: Record<string, unknown> = {
    name,
    type: "agent",
    userId: uid,
    npn,
    linkedOrgNodeId: orgNodeId,
    active,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (existing) {
    await existing.ref.set(payload, { merge: true });
    rememberParticipant(index, "userId", uid, existing);
    return existing.id;
  }

  const ref = db.collection("paymentsParticipants").doc();
  await ref.set({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
  });
  const created = await ref.get();
  if (created.exists) {
    rememberParticipant(index, "userId", uid, created as QueryDocumentSnapshot);
  }
  return ref.id;
}

/** Soft-deactivate agency participant linked to an org node. */
export async function deactivateAgencyParticipant(
  orgNodeId: string,
): Promise<void> {
  const existing = await findParticipantByField("linkedOrgNodeId", orgNodeId);
  if (!existing) return;
  await existing.ref.set(
    {
      active: false,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

/** Soft-deactivate agent participant linked to a user. */
export async function deactivateAgentParticipant(uid: string): Promise<void> {
  const existing = await findParticipantByField("userId", uid);
  if (!existing) return;
  await existing.ref.set(
    {
      active: false,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function findDerivedEdgesForDownline(
  downlineParticipantId: string,
  relationshipType: "agency_agency" | "agency_agent",
) {
  const snap = await db
    .collection("businessRelationships")
    .where("downlineParticipantId", "==", downlineParticipantId)
    .where("relationshipType", "==", relationshipType)
    .limit(20)
    .get();
  return snap.docs.filter((d) => d.data()?.source === "org_hierarchy");
}

async function upsertDerivedRelationship(args: {
  uplineParticipantId: string;
  downlineParticipantId: string;
  relationshipType: "agency_agency" | "agency_agent";
}): Promise<"created" | "updated" | "noop"> {
  const { uplineParticipantId, downlineParticipantId, relationshipType } =
    args;
  if (uplineParticipantId === downlineParticipantId) return "noop";

  const existingForDownline = await findDerivedEdgesForDownline(
    downlineParticipantId,
    relationshipType,
  );

  for (const doc of existingForDownline) {
    const data = doc.data();
    if (data.uplineParticipantId === uplineParticipantId) {
      if (data.active === false) {
        await doc.ref.set(
          {
            active: true,
            effectiveTo: null,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        return "updated";
      }
      return "noop";
    }
    // Parent changed — soft-deactivate old derived edge.
    if (data.active !== false) {
      await doc.ref.set(
        {
          active: false,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  }

  const pairSnap = await db
    .collection("businessRelationships")
    .where("uplineParticipantId", "==", uplineParticipantId)
    .where("downlineParticipantId", "==", downlineParticipantId)
    .limit(1)
    .get();

  const today = new Date().toISOString().slice(0, 10);
  const payload: Record<string, unknown> = {
    uplineParticipantId,
    downlineParticipantId,
    relationshipType,
    effectiveFrom: today,
    effectiveTo: null,
    carrierIds: [],
    states: [],
    productCodes: [],
    retentionFraction: 0,
    notes: null,
    source: "org_hierarchy",
    active: true,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (!pairSnap.empty) {
    const doc = pairSnap.docs[0]!;
    await doc.ref.set(payload, { merge: true });
    return "updated";
  }

  const ref = db.collection("businessRelationships").doc();
  await ref.set({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
  });
  return "created";
}

/**
 * Ensure agency→agency edge from org parentId (parent = upline).
 */
export async function ensureAgencyAgencyRelationship(
  childOrgNodeId: string,
  childData: DocumentData,
  index?: ParticipantIndex,
): Promise<"created" | "updated" | "noop" | "deactivated"> {
  if (!isUserAssignableOrgType(childData.type)) return "noop";

  const childParticipantId = await ensureAgencyParticipant(
    childOrgNodeId,
    childData,
    index,
  );
  if (!childParticipantId) return "noop";

  const parentId = stringOrNull(childData.parentId);
  if (!parentId) {
    // Root / no parent — deactivate derived agency_agency edges for this downline.
    const edges = await findDerivedEdgesForDownline(
      childParticipantId,
      "agency_agency",
    );
    let deactivated = false;
    for (const doc of edges) {
      if (doc.data()?.active !== false) {
        await doc.ref.set(
          {
            active: false,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        deactivated = true;
      }
    }
    return deactivated ? "deactivated" : "noop";
  }

  const parentSnap = await db.doc(`orgNodes/${parentId}`).get();
  if (!parentSnap.exists) return "noop";
  const parentData = parentSnap.data() ?? {};
  if (!isUserAssignableOrgType(parentData.type)) return "noop";

  const parentParticipantId = await ensureAgencyParticipant(
    parentId,
    parentData,
    index,
  );
  if (!parentParticipantId) return "noop";

  return upsertDerivedRelationship({
    uplineParticipantId: parentParticipantId,
    downlineParticipantId: childParticipantId,
    relationshipType: "agency_agency",
  });
}

/**
 * Ensure agency→member edge from users.orgNodeId.
 */
export async function ensureAgencyMemberRelationship(
  uid: string,
  userData: DocumentData,
  index?: ParticipantIndex,
): Promise<"created" | "updated" | "noop" | "deactivated"> {
  const memberParticipantId = await ensureAgentParticipant(uid, userData, index);
  if (!memberParticipantId) return "noop";

  if (!isAgentSyncEligible(userData) || !isUserAccountActive(userData)) {
    const edges = await findDerivedEdgesForDownline(
      memberParticipantId,
      "agency_agent",
    );
    let deactivated = false;
    for (const doc of edges) {
      if (doc.data()?.active !== false) {
        await doc.ref.set(
          {
            active: false,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        deactivated = true;
      }
    }
    return deactivated ? "deactivated" : "noop";
  }

  const orgNodeId = stringOrNull(userData.orgNodeId);
  if (!orgNodeId) {
    const edges = await findDerivedEdgesForDownline(
      memberParticipantId,
      "agency_agent",
    );
    let deactivated = false;
    for (const doc of edges) {
      if (doc.data()?.active !== false) {
        await doc.ref.set(
          {
            active: false,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        deactivated = true;
      }
    }
    return deactivated ? "deactivated" : "noop";
  }

  const orgSnap = await db.doc(`orgNodes/${orgNodeId}`).get();
  if (!orgSnap.exists) return "noop";
  const orgData = orgSnap.data() ?? {};
  const agencyParticipantId = await ensureAgencyParticipant(
    orgNodeId,
    orgData,
    index,
  );
  if (!agencyParticipantId) return "noop";

  return upsertDerivedRelationship({
    uplineParticipantId: agencyParticipantId,
    downlineParticipantId: memberParticipantId,
    relationshipType: "agency_agent",
  });
}

/** Best-effort wrappers — never throw into the caller. */
export async function syncAgencyParticipantSafe(
  orgNodeId: string,
  data: DocumentData,
): Promise<void> {
  try {
    if (data.active === false) {
      await deactivateAgencyParticipant(orgNodeId);
    }
    await ensureAgencyParticipant(orgNodeId, data);
    await ensureAgencyAgencyRelationship(orgNodeId, data);
  } catch (error) {
    console.error("syncAgencyParticipantSafe failed", orgNodeId, error);
  }
}

export async function syncAgentParticipantSafe(
  uid: string,
  data: DocumentData,
): Promise<void> {
  try {
    if (!isUserAccountActive(data)) {
      await deactivateAgentParticipant(uid);
    }
    await ensureAgentParticipant(uid, data);
    await ensureAgencyMemberRelationship(uid, data);
  } catch (error) {
    console.error("syncAgentParticipantSafe failed", uid, error);
  }
}

export type SyncPaymentsGraphResult = {
  agenciesUpserted: number;
  agentsUpserted: number;
  relationshipsUpserted: number;
  deactivated: number;
};

/**
 * Full backfill: assignable org nodes + eligible users + derived relationships.
 */
export async function syncPaymentsGraph(): Promise<SyncPaymentsGraphResult> {
  let agenciesUpserted = 0;
  let agentsUpserted = 0;
  let relationshipsUpserted = 0;
  let deactivated = 0;

  const index = await loadParticipantIndex();
  const orgDocs = (
    await Promise.all([
      collectPagedDocs("orgNodes", SYNC_PAGE_SIZE, SYNC_MAX_PAGES, {
        field: "type",
        value: "organization",
      }),
      collectPagedDocs("orgNodes", SYNC_PAGE_SIZE, SYNC_MAX_PAGES, {
        field: "type",
        value: "agency",
      }),
      collectPagedDocs("orgNodes", SYNC_PAGE_SIZE, SYNC_MAX_PAGES, {
        field: "type",
        value: "sub_agency",
      }),
    ])
  ).flat();

  for (const doc of orgDocs) {
    const data = doc.data();
    const before = await findParticipantByField(
      "linkedOrgNodeId",
      doc.id,
      index,
    );
    const id = await ensureAgencyParticipant(doc.id, data, index);
    if (id && (!before || before.id !== id || before.data()?.active === false)) {
      agenciesUpserted += 1;
    } else if (id) {
      agenciesUpserted += 1;
    }
    const rel = await ensureAgencyAgencyRelationship(doc.id, data, index);
    if (rel === "created" || rel === "updated") relationshipsUpserted += 1;
    if (rel === "deactivated") deactivated += 1;
    if (data.active === false) deactivated += 1;
  }

  const usersSnap = await collectPagedDocs("users");
  for (const doc of usersSnap) {
    const data = doc.data();
    const wasEligible = isAgentSyncEligible(data);
    const before = await findParticipantByField("userId", doc.id, index);
    await ensureAgentParticipant(doc.id, data, index);
    if (wasEligible) {
      agentsUpserted += 1;
    } else if (before && before.data()?.active !== false) {
      deactivated += 1;
    }
    const rel = await ensureAgencyMemberRelationship(doc.id, data, index);
    if (rel === "created" || rel === "updated") relationshipsUpserted += 1;
    if (rel === "deactivated") deactivated += 1;
  }

  return {
    agenciesUpserted,
    agentsUpserted,
    relationshipsUpserted,
    deactivated,
  };
}

export type PaymentsParticipantsDriftReport = {
  checkedAt: string;
  orgNodesScanned: number;
  usersScanned: number;
  participantsScanned: number;
  missingAgencies: Array<{ orgNodeId: string; name: string }>;
  missingAgents: Array<{ userId: string; name: string }>;
  staleAgencyLinks: Array<{ participantId: string; linkedOrgNodeId: string; reason: string }>;
  staleAgentLinks: Array<{ participantId: string; userId: string; reason: string }>;
  nameMismatches: Array<{
    participantId: string;
    participantName: string;
    sourceName: string;
    kind: "agency" | "agent";
  }>;
  totals: {
    missingAgencies: number;
    missingAgents: number;
    staleAgencyLinks: number;
    staleAgentLinks: number;
    nameMismatches: number;
  };
};

const DRIFT_SAMPLE_CAP = 50;

/**
 * Read-only health check: orgNodes/users vs paymentsParticipants drift.
 * Samples capped for callable payload size; totals always reflect full counts.
 */
export async function checkPaymentsParticipantsDrift(): Promise<PaymentsParticipantsDriftReport> {
  const missingAgencies: PaymentsParticipantsDriftReport["missingAgencies"] = [];
  const missingAgents: PaymentsParticipantsDriftReport["missingAgents"] = [];
  const staleAgencyLinks: PaymentsParticipantsDriftReport["staleAgencyLinks"] = [];
  const staleAgentLinks: PaymentsParticipantsDriftReport["staleAgentLinks"] = [];
  const nameMismatches: PaymentsParticipantsDriftReport["nameMismatches"] = [];

  let missingAgenciesCount = 0;
  let missingAgentsCount = 0;
  let staleAgencyLinksCount = 0;
  let staleAgentLinksCount = 0;
  let nameMismatchesCount = 0;

  const orgDocs = (
    await Promise.all([
      collectPagedDocs("orgNodes", SYNC_PAGE_SIZE, SYNC_MAX_PAGES, {
        field: "type",
        value: "organization",
      }),
      collectPagedDocs("orgNodes", SYNC_PAGE_SIZE, SYNC_MAX_PAGES, {
        field: "type",
        value: "agency",
      }),
      collectPagedDocs("orgNodes", SYNC_PAGE_SIZE, SYNC_MAX_PAGES, {
        field: "type",
        value: "sub_agency",
      }),
    ])
  ).flat();
  const orgById = new Map<string, DocumentData>();
  for (const doc of orgDocs) {
    orgById.set(doc.id, doc.data());
  }

  const usersSnap = await collectPagedDocs("users");
  const userById = new Map<string, DocumentData>();
  for (const doc of usersSnap) {
    userById.set(doc.id, doc.data());
  }

  const participantsSnap = await collectPagedDocs("paymentsParticipants");
  const agencyByOrg = new Map<string, { id: string; data: DocumentData }>();
  const agentByUser = new Map<string, { id: string; data: DocumentData }>();

  for (const doc of participantsSnap) {
    const data = doc.data();
    const linkedOrg = stringOrNull(data.linkedOrgNodeId);
    const userId = stringOrNull(data.userId);
    if (linkedOrg && String(data.type ?? "") === "agency") {
      agencyByOrg.set(linkedOrg, { id: doc.id, data });
    }
    if (userId && String(data.type ?? "") === "agent") {
      agentByUser.set(userId, { id: doc.id, data });
    }
  }

  for (const [orgNodeId, data] of orgById) {
    if (!isUserAssignableOrgType(data.type)) continue;
    const linked = agencyByOrg.get(orgNodeId);
    if (!linked) {
      missingAgenciesCount += 1;
      if (missingAgencies.length < DRIFT_SAMPLE_CAP) {
        missingAgencies.push({
          orgNodeId,
          name: stringOrNull(data.name) || "Agency",
        });
      }
      continue;
    }
    if (data.active === false && linked.data.active !== false) {
      staleAgencyLinksCount += 1;
      if (staleAgencyLinks.length < DRIFT_SAMPLE_CAP) {
        staleAgencyLinks.push({
          participantId: linked.id,
          linkedOrgNodeId: orgNodeId,
          reason: "org_inactive_participant_active",
        });
      }
    }
    const orgName = stringOrNull(data.name) || "Agency";
    const partName = stringOrNull(linked.data.name) || "";
    if (orgName && partName && orgName !== partName) {
      nameMismatchesCount += 1;
      if (nameMismatches.length < DRIFT_SAMPLE_CAP) {
        nameMismatches.push({
          participantId: linked.id,
          participantName: partName,
          sourceName: orgName,
          kind: "agency",
        });
      }
    }
  }

  for (const [linkedOrgNodeId, linked] of agencyByOrg) {
    if (!orgById.has(linkedOrgNodeId)) {
      staleAgencyLinksCount += 1;
      if (staleAgencyLinks.length < DRIFT_SAMPLE_CAP) {
        staleAgencyLinks.push({
          participantId: linked.id,
          linkedOrgNodeId,
          reason: "org_node_missing",
        });
      }
    }
  }

  for (const [uid, data] of userById) {
    if (!isAgentSyncEligible(data) || !isUserAccountActive(data)) continue;
    const linked = agentByUser.get(uid);
    if (!linked) {
      missingAgentsCount += 1;
      if (missingAgents.length < DRIFT_SAMPLE_CAP) {
        missingAgents.push({
          userId: uid,
          name: headlineName(data),
        });
      }
      continue;
    }
    const sourceName = headlineName(data);
    const partName = stringOrNull(linked.data.name) || "";
    if (sourceName && partName && sourceName !== partName) {
      nameMismatchesCount += 1;
      if (nameMismatches.length < DRIFT_SAMPLE_CAP) {
        nameMismatches.push({
          participantId: linked.id,
          participantName: partName,
          sourceName,
          kind: "agent",
        });
      }
    }
  }

  for (const [uid, linked] of agentByUser) {
    const user = userById.get(uid);
    if (!user) {
      staleAgentLinksCount += 1;
      if (staleAgentLinks.length < DRIFT_SAMPLE_CAP) {
        staleAgentLinks.push({
          participantId: linked.id,
          userId: uid,
          reason: "user_missing",
        });
      }
      continue;
    }
    if (
      linked.data.active !== false &&
      (!isAgentSyncEligible(user) || !isUserAccountActive(user))
    ) {
      staleAgentLinksCount += 1;
      if (staleAgentLinks.length < DRIFT_SAMPLE_CAP) {
        staleAgentLinks.push({
          participantId: linked.id,
          userId: uid,
          reason: "user_ineligible_participant_active",
        });
      }
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    orgNodesScanned: orgById.size,
    usersScanned: userById.size,
    participantsScanned: participantsSnap.length,
    missingAgencies,
    missingAgents,
    staleAgencyLinks,
    staleAgentLinks,
    nameMismatches,
    totals: {
      missingAgencies: missingAgenciesCount,
      missingAgents: missingAgentsCount,
      staleAgencyLinks: staleAgencyLinksCount,
      staleAgentLinks: staleAgentLinksCount,
      nameMismatches: nameMismatchesCount,
    },
  };
}

/**
 * Paginated backfill of the payments graph (org agencies first, then users).
 * Pass `phase: "org" | "users"` and optional cursors to resume.
 */
export async function syncPaymentsGraphIncremental(opts: {
  phase?: "org" | "users" | "all";
  orgCursor?: string | null;
  userCursor?: string | null;
  pageSize?: number;
}): Promise<
  SyncPaymentsGraphResult & {
    phase: "org" | "users" | "all";
    nextOrgCursor: string | null;
    nextUserCursor: string | null;
    done: boolean;
  }
> {
  const pageSize = Math.min(Math.max(opts.pageSize ?? 100, 1), 500);
  const phase = opts.phase ?? "all";
  let agenciesUpserted = 0;
  let agentsUpserted = 0;
  let relationshipsUpserted = 0;
  let deactivated = 0;
  let nextOrgCursor: string | null = null;
  let nextUserCursor: string | null = null;
  const index = await loadParticipantIndex();

  if (phase === "org" || phase === "all") {
    let query = db.collection("orgNodes").orderBy("__name__").limit(pageSize);
    if (opts.orgCursor) {
      const cursorSnap = await db.doc(`orgNodes/${opts.orgCursor}`).get();
      if (cursorSnap.exists) {
        query = query.startAfter(cursorSnap);
      }
    }
    const snap = await query.get();
    for (const doc of snap.docs) {
      const data = doc.data();
      if (!isUserAssignableOrgType(data.type)) continue;
      await ensureAgencyParticipant(doc.id, data, index);
      agenciesUpserted += 1;
      const rel = await ensureAgencyAgencyRelationship(doc.id, data, index);
      if (rel === "created" || rel === "updated") relationshipsUpserted += 1;
      if (rel === "deactivated") deactivated += 1;
      if (data.active === false) deactivated += 1;
    }
    nextOrgCursor =
      snap.docs.length === pageSize
        ? snap.docs[snap.docs.length - 1]?.id ?? null
        : null;
  }

  if (phase === "users" || (phase === "all" && !nextOrgCursor)) {
    let query = db.collection("users").orderBy("__name__").limit(pageSize);
    if (opts.userCursor) {
      const cursorSnap = await db.doc(`users/${opts.userCursor}`).get();
      if (cursorSnap.exists) {
        query = query.startAfter(cursorSnap);
      }
    }
    const snap = await query.get();
    for (const doc of snap.docs) {
      const data = doc.data();
      const wasEligible = isAgentSyncEligible(data);
      const before = await findParticipantByField("userId", doc.id, index);
      await ensureAgentParticipant(doc.id, data, index);
      if (wasEligible) {
        agentsUpserted += 1;
      } else if (before && before.data()?.active !== false) {
        deactivated += 1;
      }
      const rel = await ensureAgencyMemberRelationship(doc.id, data, index);
      if (rel === "created" || rel === "updated") relationshipsUpserted += 1;
      if (rel === "deactivated") deactivated += 1;
    }
    nextUserCursor =
      snap.docs.length === pageSize
        ? snap.docs[snap.docs.length - 1]?.id ?? null
        : null;
  }

  const done =
    phase === "org"
      ? nextOrgCursor == null
      : phase === "users"
        ? nextUserCursor == null
        : nextOrgCursor == null && nextUserCursor == null;

  return {
    agenciesUpserted,
    agentsUpserted,
    relationshipsUpserted,
    deactivated,
    phase,
    nextOrgCursor,
    nextUserCursor,
    done,
  };
}
