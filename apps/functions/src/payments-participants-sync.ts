import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { isUserAssignableOrgType } from "@pulse/shared";
import { db } from "./init";

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

async function findParticipantByField(
  field: "linkedOrgNodeId" | "userId",
  value: string,
) {
  const snap = await db
    .collection("paymentsParticipants")
    .where(field, "==", value)
    .limit(1)
    .get();
  return snap.docs[0] ?? null;
}

/**
 * Ensure a payments agency participant exists for an assignable org node.
 * Returns the participant id, or null if the node is not assignable.
 */
export async function ensureAgencyParticipant(
  orgNodeId: string,
  data: DocumentData,
): Promise<string | null> {
  if (!isUserAssignableOrgType(data.type)) return null;

  const name = stringOrNull(data.name) || "Agency";
  const npn = stringOrNull(data.npn);
  const active = data.active !== false;
  const existing = await findParticipantByField("linkedOrgNodeId", orgNodeId);

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
    return existing.id;
  }

  const ref = db.collection("paymentsParticipants").doc();
  await ref.set({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

function isAgentSyncEligible(data: DocumentData | undefined): boolean {
  if (!data) return false;
  const role = String(data.role ?? "guest");
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
): Promise<string | null> {
  const existing = await findParticipantByField("userId", uid);
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
    return existing.id;
  }

  const ref = db.collection("paymentsParticipants").doc();
  await ref.set({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
  });
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
): Promise<"created" | "updated" | "noop" | "deactivated"> {
  if (!isUserAssignableOrgType(childData.type)) return "noop";

  const childParticipantId = await ensureAgencyParticipant(
    childOrgNodeId,
    childData,
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
): Promise<"created" | "updated" | "noop" | "deactivated"> {
  const memberParticipantId = await ensureAgentParticipant(uid, userData);
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
  const agencyParticipantId = await ensureAgencyParticipant(orgNodeId, orgData);
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

  const orgSnaps = await Promise.all([
    db.collection("orgNodes").where("type", "==", "organization").get(),
    db.collection("orgNodes").where("type", "==", "agency").get(),
    db.collection("orgNodes").where("type", "==", "sub_agency").get(),
  ]);

  for (const snap of orgSnaps) {
    for (const doc of snap.docs) {
      const data = doc.data();
      const before = await findParticipantByField("linkedOrgNodeId", doc.id);
      const id = await ensureAgencyParticipant(doc.id, data);
      if (id && (!before || before.id !== id || before.data()?.active === false)) {
        agenciesUpserted += 1;
      } else if (id) {
        agenciesUpserted += 1;
      }
      const rel = await ensureAgencyAgencyRelationship(doc.id, data);
      if (rel === "created" || rel === "updated") relationshipsUpserted += 1;
      if (rel === "deactivated") deactivated += 1;
      if (data.active === false) deactivated += 1;
    }
  }

  const usersSnap = await db.collection("users").get();
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const wasEligible = isAgentSyncEligible(data);
    const before = await findParticipantByField("userId", doc.id);
    await ensureAgentParticipant(doc.id, data);
    if (wasEligible) {
      agentsUpserted += 1;
    } else if (before && before.data()?.active !== false) {
      deactivated += 1;
    }
    const rel = await ensureAgencyMemberRelationship(doc.id, data);
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

  const orgSnaps = await Promise.all([
    db.collection("orgNodes").where("type", "==", "organization").get(),
    db.collection("orgNodes").where("type", "==", "agency").get(),
    db.collection("orgNodes").where("type", "==", "sub_agency").get(),
  ]);
  const orgById = new Map<string, DocumentData>();
  for (const snap of orgSnaps) {
    for (const doc of snap.docs) {
      orgById.set(doc.id, doc.data());
    }
  }

  const usersSnap = await db.collection("users").get();
  const userById = new Map<string, DocumentData>();
  for (const doc of usersSnap.docs) {
    userById.set(doc.id, doc.data());
  }

  const participantsSnap = await db.collection("paymentsParticipants").get();
  const agencyByOrg = new Map<string, { id: string; data: DocumentData }>();
  const agentByUser = new Map<string, { id: string; data: DocumentData }>();

  for (const doc of participantsSnap.docs) {
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
    participantsScanned: participantsSnap.size,
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
      await ensureAgencyParticipant(doc.id, data);
      agenciesUpserted += 1;
      const rel = await ensureAgencyAgencyRelationship(doc.id, data);
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
      const before = await findParticipantByField("userId", doc.id);
      await ensureAgentParticipant(doc.id, data);
      if (wasEligible) {
        agentsUpserted += 1;
      } else if (before && before.data()?.active !== false) {
        deactivated += 1;
      }
      const rel = await ensureAgencyMemberRelationship(doc.id, data);
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
