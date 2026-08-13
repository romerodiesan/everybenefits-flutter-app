import { FieldValue, type Query } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  businessRelationshipInputSchema,
  contractTermInputSchema,
  deriveRelationshipType,
  normalizeParticipantType,
  wouldCreateRelationshipCycle,
} from "@pulse/shared";
import { db, callableOpts } from "./init";
import {
  requirePaymentsAdmin,
  serializeParticipant,
  serializeRelationship,
  serializeTerm,
  parseListPage,
  paginateCollection,
  loadUplineChainEdges,
} from "./payments-shared";

/** Read-only catalog for compensation plans (legacy IDs). Prefer listCommissionParties for new work. */
export const listPaymentsParticipants = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "listPaymentsParticipants");
  const page = parseListPage(request.data, { limit: 100, maxLimit: 500 });
  const typeFilter =
    typeof (request.data as { type?: unknown } | undefined)?.type === "string"
      ? normalizeParticipantType((request.data as { type: string }).type)
      : null;
  const query = db.collection("paymentsParticipants").orderBy("name");
  const { items, nextCursor } = await paginateCollection(query, {
    limit: page.limit,
    cursor: page.cursor,
    cursorCollection: "paymentsParticipants",
    mapDoc: (id, data) => {
      if (normalizeParticipantType(data?.type) == null) return null;
      const participant = serializeParticipant(id, data);
      if (!page.includeInactive && !participant.active) return null;
      if (typeFilter && participant.type !== typeFilter) return null;
      return participant;
    },
  });
  return { participants: items, nextCursor };
});

// --- Relationships ---

export const listBusinessRelationships = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "listBusinessRelationships");
  const page = parseListPage(request.data, { limit: 200, maxLimit: 500 });
  const query = db.collection("businessRelationships").orderBy("__name__");
  const { items, nextCursor } = await paginateCollection(query, {
    limit: page.limit,
    cursor: page.cursor,
    cursorCollection: "businessRelationships",
    mapDoc: (id, data) => {
      const rel = serializeRelationship(id, data);
      if (!page.includeInactive && !rel.active) return null;
      return rel;
    },
  });
  return { relationships: items, nextCursor };
});

export const upsertBusinessRelationship = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "upsertBusinessRelationship");
  const id =
    typeof request.data?.id === "string" && request.data.id.trim()
      ? request.data.id.trim()
      : null;
  const parsed = businessRelationshipInputSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  if (parsed.data.uplineParticipantId === parsed.data.downlineParticipantId) {
    throw new HttpsError(
      "invalid-argument",
      "Upline and downline must differ.",
    );
  }

  const [uplineSnap, downlineSnap, existingRels] = await Promise.all([
    db.doc(`paymentsParticipants/${parsed.data.uplineParticipantId}`).get(),
    db.doc(`paymentsParticipants/${parsed.data.downlineParticipantId}`).get(),
    loadUplineChainEdges(parsed.data.uplineParticipantId, { excludeId: id }),
  ]);
  if (!uplineSnap.exists || !downlineSnap.exists) {
    throw new HttpsError("invalid-argument", "Participants not found.");
  }
  const uplineType = normalizeParticipantType(uplineSnap.data()?.type);
  const downlineType = normalizeParticipantType(downlineSnap.data()?.type);
  if (!uplineType || !downlineType) {
    throw new HttpsError(
      "invalid-argument",
      "Participants must be agency or agent.",
    );
  }
  const relationshipType = deriveRelationshipType(uplineType, downlineType);
  if (!relationshipType) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid upline/downline pair (agent cannot be upline of an agency).",
    );
  }

  if (
    wouldCreateRelationshipCycle(
      parsed.data.uplineParticipantId,
      parsed.data.downlineParticipantId,
      existingRels,
    )
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Relationship would create a cycle in the upline chain.",
    );
  }

  const ref = id
    ? db.doc(`businessRelationships/${id}`)
    : db.collection("businessRelationships").doc();
  await ref.set(
    {
      ...parsed.data,
      relationshipType,
      source: parsed.data.source ?? "manual",
      updatedAt: FieldValue.serverTimestamp(),
      ...(id ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  const snap = await ref.get();
  return { relationship: serializeRelationship(ref.id, snap.data() ?? {}) };
});

// --- Contract terms ---

export const listContractTerms = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "listContractTerms");
  const page = parseListPage(request.data, { limit: 200, maxLimit: 500 });
  const participantId =
    typeof request.data?.participantId === "string"
      ? request.data.participantId.trim()
      : null;
  let query: Query = db.collection("contractTerms").orderBy("__name__");
  if (participantId) {
    query = db
      .collection("contractTerms")
      .where("participantId", "==", participantId)
      .orderBy("__name__");
  }
  const { items, nextCursor } = await paginateCollection(query, {
    limit: page.limit,
    cursor: page.cursor,
    cursorCollection: "contractTerms",
    mapDoc: (id, data) => {
      const term = serializeTerm(id, data);
      if (!page.includeInactive && !term.active) return null;
      return term;
    },
  });
  return { terms: items, nextCursor };
});

export const upsertContractTerm = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "upsertContractTerm");
  const id =
    typeof request.data?.id === "string" && request.data.id.trim()
      ? request.data.id.trim()
      : null;
  const parsed = contractTermInputSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const ref = id
    ? db.doc(`contractTerms/${id}`)
    : db.collection("contractTerms").doc();
  await ref.set(
    {
      ...parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
      ...(id ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  const snap = await ref.get();
  return { term: serializeTerm(ref.id, snap.data() ?? {}) };
});
