import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { isUserAssignableOrgType } from "@pulse/shared";
import { db } from "./init";

const AGENT_SYNC_ROLES = new Set(["agent", "agency_owner"]);

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
 * Ensure a payments agent participant for an approved agent / agency_owner.
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

/** Best-effort wrappers — never throw into the caller. */
export async function syncAgencyParticipantSafe(
  orgNodeId: string,
  data: DocumentData,
): Promise<void> {
  try {
    if (data.active === false) {
      await deactivateAgencyParticipant(orgNodeId);
      // Still refresh name/fields when inactive so re-activate is consistent.
    }
    await ensureAgencyParticipant(orgNodeId, data);
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
  } catch (error) {
    console.error("syncAgentParticipantSafe failed", uid, error);
  }
}
