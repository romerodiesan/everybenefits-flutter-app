/**
 * Compensation plans — tiers, agent rate groups, plans, assignments, apply.
 */
import {
  FieldValue,
  type DocumentData,
  type DocumentReference,
  type Query,
} from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  agentRateGroupInputSchema,
  applyCompensationPlanInputSchema,
  canAccessPayments,
  compensationPlanInputSchema,
  compensationTierInputSchema,
  DEFAULT_COMPENSATION_TIERS,
  diffMaterializedTerms,
  expandPlanToContractTerms,
  normalizeParticipantType,
  type AgentRateGroup,
  type BusinessRelationship,
  type CompensationPlan,
  type CompensationPlanSlot,
  type CompensationTier,
  type ContractTerm,
  type PayMode,
  type PaymentsParticipant,
  type PlanAssignment,
} from "@pulse/shared";
import { db, callableOpts } from "./init";
import { requireCaller } from "./auth";
import { loadPermissionsForUid } from "./permissions";

async function requirePaymentsAdmin(
  request: { auth?: { uid: string } },
  operation: string,
) {
  const uid = await requireCaller(request, operation);
  const { permissions } = await loadPermissionsForUid(uid);
  if (!canAccessPayments(permissions)) {
    throw new HttpsError("permission-denied", "Payments access required.");
  }
  return uid;
}

function serializeTier(id: string, data: DocumentData): CompensationTier {
  const kindRaw = String(data.kind ?? "generic");
  const kind = (
    kindRaw === "agency" || kindRaw === "agent" ? kindRaw : "generic"
  ) as CompensationTier["kind"];
  return {
    id,
    name: String(data.name ?? ""),
    rate: Number(data.rate ?? 0),
    rateUnit: (data.rateUnit ?? "pmpm") as CompensationTier["rateUnit"],
    kind,
    active: data.active !== false,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt,
  };
}

function serializeGroup(id: string, data: DocumentData): AgentRateGroup {
  return {
    id,
    name: String(data.name ?? ""),
    memberParticipantIds: Array.isArray(data.memberParticipantIds)
      ? data.memberParticipantIds.map(String)
      : [],
    active: data.active !== false,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt,
  };
}

function serializeSlot(raw: unknown): CompensationPlanSlot {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const roleRaw = String(s.role ?? "agent_default");
  const role = (
    [
      "agency_root",
      "agency_child",
      "agent_default",
      "agent_group",
      "agent_override",
    ].includes(roleRaw)
      ? roleRaw
      : "agent_default"
  ) as CompensationPlanSlot["role"];
  return {
    role,
    tierId: s.tierId == null ? null : String(s.tierId),
    rate: s.rate == null ? null : Number(s.rate),
    rateUnit: (s.rateUnit ?? "pmpm") as CompensationPlanSlot["rateUnit"],
    agentRateGroupId:
      s.agentRateGroupId == null ? null : String(s.agentRateGroupId),
    participantIds: Array.isArray(s.participantIds)
      ? s.participantIds.map(String)
      : [],
  };
}

function serializePlan(id: string, data: DocumentData): CompensationPlan {
  const payModeRaw = String(data.payModeDefault ?? "through_agency");
  const payModeDefault = (
    payModeRaw === "direct" ? "direct" : "through_agency"
  ) as PayMode;
  return {
    id,
    name: String(data.name ?? ""),
    carrierIds: Array.isArray(data.carrierIds)
      ? data.carrierIds.map(String)
      : [],
    slots: Array.isArray(data.slots) ? data.slots.map(serializeSlot) : [],
    payModeDefault,
    retentionFractionDefault: Number(data.retentionFractionDefault ?? 0),
    effectiveFrom: String(data.effectiveFrom ?? ""),
    effectiveTo: data.effectiveTo ?? null,
    active: data.active !== false,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt,
  };
}

function serializeAssignment(id: string, data: DocumentData): PlanAssignment {
  const payModeRaw = data.payMode;
  const payMode =
    payModeRaw === "direct" || payModeRaw === "through_agency"
      ? (payModeRaw as PayMode)
      : null;
  return {
    id,
    planId: String(data.planId ?? ""),
    agencyParticipantIds: Array.isArray(data.agencyParticipantIds)
      ? data.agencyParticipantIds.map(String)
      : [],
    includeDescendantAgencies: data.includeDescendantAgencies !== false,
    agentParticipantIds: Array.isArray(data.agentParticipantIds)
      ? data.agentParticipantIds.map(String)
      : [],
    payMode,
    retentionFraction:
      data.retentionFraction == null ? null : Number(data.retentionFraction),
    agentPayModeOverrides: Array.isArray(data.agentPayModeOverrides)
      ? data.agentPayModeOverrides
          .map((o: DocumentData) => ({
            participantId: String(o.participantId ?? ""),
            payMode: (o.payMode === "direct"
              ? "direct"
              : "through_agency") as PayMode,
          }))
          .filter((o: { participantId: string }) => o.participantId)
      : [],
    effectiveFrom: data.effectiveFrom ?? null,
    active: data.active !== false,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt,
  };
}

function serializeParticipant(
  id: string,
  data: DocumentData,
): PaymentsParticipant {
  return {
    id,
    name: String(data.name ?? ""),
    type: normalizeParticipantType(data.type) ?? "agent",
    userId: data.userId ?? null,
    npn: data.npn ?? null,
    linkedOrgNodeId: data.linkedOrgNodeId ?? null,
    active: data.active !== false,
  };
}

function serializeRelationship(
  id: string,
  data: DocumentData,
): BusinessRelationship {
  const rawType = String(data.relationshipType ?? "");
  const relationshipType = (
    rawType === "agency_agency" ||
    rawType === "agency_agent" ||
    rawType === "agent_agent"
      ? rawType
      : "agency_agent"
  ) as BusinessRelationship["relationshipType"];
  return {
    id,
    uplineParticipantId: String(data.uplineParticipantId ?? ""),
    downlineParticipantId: String(data.downlineParticipantId ?? ""),
    relationshipType,
    effectiveFrom: String(data.effectiveFrom ?? ""),
    effectiveTo: data.effectiveTo ?? null,
    carrierIds: Array.isArray(data.carrierIds) ? data.carrierIds.map(String) : [],
    states: Array.isArray(data.states) ? data.states.map(String) : [],
    productCodes: Array.isArray(data.productCodes)
      ? data.productCodes.map(String)
      : [],
    retentionFraction: Number(data.retentionFraction ?? 0),
    notes: data.notes ?? null,
    source: data.source === "org_hierarchy" ? "org_hierarchy" : "manual",
    active: data.active !== false,
  };
}

function serializeTerm(id: string, data: DocumentData): ContractTerm {
  return {
    id,
    participantId: String(data.participantId ?? ""),
    carrierId: data.carrierId ?? null,
    states: Array.isArray(data.states) ? data.states.map(String) : [],
    productCodes: Array.isArray(data.productCodes)
      ? data.productCodes.map(String)
      : [],
    rate: Number(data.rate ?? 0),
    rateUnit: (data.rateUnit ?? "pmpm") as ContractTerm["rateUnit"],
    effectiveFrom: String(data.effectiveFrom ?? ""),
    effectiveTo: data.effectiveTo ?? null,
    active: data.active !== false,
    sourcePlanId: data.sourcePlanId ?? null,
    sourceAssignmentId: data.sourceAssignmentId ?? null,
  };
}

/** Cap for one-shot workspace/catalog loads (use paginated list callables beyond this). */
const CATALOG_LIMIT = 500;

async function loadExpandContext() {
  const [partsSnap, relSnap, tiersSnap, groupsSnap] = await Promise.all([
    db.collection("paymentsParticipants").limit(CATALOG_LIMIT).get(),
    db.collection("businessRelationships").limit(CATALOG_LIMIT).get(),
    db.collection("compensationTiers").limit(CATALOG_LIMIT).get(),
    db.collection("agentRateGroups").limit(CATALOG_LIMIT).get(),
  ]);
  return {
    participants: partsSnap.docs
      .map((d) => serializeParticipant(d.id, d.data()))
      .filter((p) => p.active !== false),
    relationships: relSnap.docs.map((d) =>
      serializeRelationship(d.id, d.data()),
    ),
    tiers: tiersSnap.docs.map((d) => serializeTier(d.id, d.data())),
    groups: groupsSnap.docs.map((d) => serializeGroup(d.id, d.data())),
  };
}

type BatchWrite = (batch: ReturnType<typeof db.batch>) => void;

async function commitBatches(writes: BatchWrite[]) {
  const CHUNK = 400;
  for (let i = 0; i < writes.length; i += CHUNK) {
    const batch = db.batch();
    for (const w of writes.slice(i, i + CHUNK)) w(batch);
    await batch.commit();
  }
}

// --- Tiers ---

export const listCompensationTiers = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "listCompensationTiers");
  const snap = await db.collection("compensationTiers").limit(CATALOG_LIMIT).get();
  return { tiers: snap.docs.map((d) => serializeTier(d.id, d.data())) };
});

export const upsertCompensationTier = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "upsertCompensationTier");
  const id =
    typeof request.data?.id === "string" && request.data.id.trim()
      ? request.data.id.trim()
      : null;
  const parsed = compensationTierInputSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const ref = id
    ? db.doc(`compensationTiers/${id}`)
    : db.collection("compensationTiers").doc();
  await ref.set(
    {
      ...parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
      ...(id ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  const snap = await ref.get();
  return { tier: serializeTier(ref.id, snap.data() ?? {}) };
});

export const deleteCompensationTier = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "deleteCompensationTier");
  const id = String(request.data?.id ?? "").trim();
  if (!id) throw new HttpsError("invalid-argument", "id required.");
  await db.doc(`compensationTiers/${id}`).delete();
  return { ok: true as const };
});

export const seedDefaultCompensationTiers = onCall(
  callableOpts,
  async (request) => {
    await requirePaymentsAdmin(request, "seedDefaultCompensationTiers");
    const existing = await db.collection("compensationTiers").limit(1).get();
    if (!existing.empty) {
      const all = await db.collection("compensationTiers").get();
      return {
        seeded: 0,
        tiers: all.docs.map((d) => serializeTier(d.id, d.data())),
      };
    }
    const batch = db.batch();
    const refs: DocumentReference[] = [];
    for (const tier of DEFAULT_COMPENSATION_TIERS) {
      const ref = db.collection("compensationTiers").doc();
      refs.push(ref);
      batch.set(ref, {
        ...tier,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    const snaps = await Promise.all(refs.map((r) => r.get()));
    return {
      seeded: snaps.length,
      tiers: snaps.map((s) => serializeTier(s.id, s.data() ?? {})),
    };
  },
);

// --- Agent rate groups ---

export const listAgentRateGroups = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "listAgentRateGroups");
  const snap = await db.collection("agentRateGroups").limit(CATALOG_LIMIT).get();
  return { groups: snap.docs.map((d) => serializeGroup(d.id, d.data())) };
});

export const upsertAgentRateGroup = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "upsertAgentRateGroup");
  const id =
    typeof request.data?.id === "string" && request.data.id.trim()
      ? request.data.id.trim()
      : null;
  const parsed = agentRateGroupInputSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const ref = id
    ? db.doc(`agentRateGroups/${id}`)
    : db.collection("agentRateGroups").doc();
  await ref.set(
    {
      ...parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
      ...(id ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  const snap = await ref.get();
  return { group: serializeGroup(ref.id, snap.data() ?? {}) };
});

export const deleteAgentRateGroup = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "deleteAgentRateGroup");
  const id = String(request.data?.id ?? "").trim();
  if (!id) throw new HttpsError("invalid-argument", "id required.");
  await db.doc(`agentRateGroups/${id}`).delete();
  return { ok: true as const };
});

// --- Plans ---

export const listCompensationPlans = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "listCompensationPlans");
  const snap = await db.collection("compensationPlans").limit(CATALOG_LIMIT).get();
  return { plans: snap.docs.map((d) => serializePlan(d.id, d.data())) };
});

export const upsertCompensationPlan = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "upsertCompensationPlan");
  const id =
    typeof request.data?.id === "string" && request.data.id.trim()
      ? request.data.id.trim()
      : null;
  const parsed = compensationPlanInputSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const ref = id
    ? db.doc(`compensationPlans/${id}`)
    : db.collection("compensationPlans").doc();
  await ref.set(
    {
      ...parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
      ...(id ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  const snap = await ref.get();
  return { plan: serializePlan(ref.id, snap.data() ?? {}) };
});

export const deleteCompensationPlan = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "deleteCompensationPlan");
  const id = String(request.data?.id ?? "").trim();
  if (!id) throw new HttpsError("invalid-argument", "id required.");
  await db.doc(`compensationPlans/${id}`).delete();
  return { ok: true as const };
});

export const listPlanAssignments = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "listPlanAssignments");
  const planId =
    typeof request.data?.planId === "string" ? request.data.planId : null;
  let query: Query = db.collection("planAssignments");
  if (planId) query = query.where("planId", "==", planId);
  const snap = await query.get();
  return {
    assignments: snap.docs.map((d) => serializeAssignment(d.id, d.data())),
  };
});

async function resolveApplyPayload(data: unknown) {
  const parsed = applyCompensationPlanInputSchema.safeParse(data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const input = parsed.data;
  const planSnap = await db.doc(`compensationPlans/${input.planId}`).get();
  if (!planSnap.exists) {
    throw new HttpsError("not-found", "Compensation plan not found.");
  }
  const plan = serializePlan(planSnap.id, planSnap.data() ?? {});
  if (plan.active === false) {
    throw new HttpsError("failed-precondition", "Plan is inactive.");
  }

  let assignment: PlanAssignment;
  let assignmentRef: DocumentReference = db.collection("planAssignments").doc();

  if (input.assignmentId) {
    assignmentRef = db.doc(`planAssignments/${input.assignmentId}`);
    const asgSnap = await assignmentRef.get();
    if (!asgSnap.exists) {
      throw new HttpsError("not-found", "Plan assignment not found.");
    }
    assignment = serializeAssignment(asgSnap.id, asgSnap.data() ?? {});
    assignment = {
      ...assignment,
      agencyParticipantIds:
        input.agencyParticipantIds.length > 0
          ? input.agencyParticipantIds
          : assignment.agencyParticipantIds,
      includeDescendantAgencies: input.includeDescendantAgencies,
      agentParticipantIds:
        input.agentParticipantIds.length > 0
          ? input.agentParticipantIds
          : assignment.agentParticipantIds,
      payMode: input.payMode ?? assignment.payMode,
      retentionFraction:
        input.retentionFraction ?? assignment.retentionFraction,
      agentPayModeOverrides:
        input.agentPayModeOverrides.length > 0
          ? input.agentPayModeOverrides
          : assignment.agentPayModeOverrides,
      effectiveFrom: input.effectiveFrom ?? assignment.effectiveFrom,
    };
  } else {
    assignment = {
      id: assignmentRef.id,
      planId: plan.id,
      agencyParticipantIds: input.agencyParticipantIds,
      includeDescendantAgencies: input.includeDescendantAgencies,
      agentParticipantIds: input.agentParticipantIds,
      payMode: input.payMode,
      retentionFraction: input.retentionFraction,
      agentPayModeOverrides: input.agentPayModeOverrides,
      effectiveFrom: input.effectiveFrom,
      active: true,
    };
  }

  const carrierIds =
    input.carrierIds.length > 0
      ? input.carrierIds
      : plan.carrierIds.length > 0
        ? plan.carrierIds
        : [];
  if (carrierIds.length === 0) {
    throw new HttpsError(
      "invalid-argument",
      "Select at least one carrier (on the plan or at apply time).",
    );
  }
  if (
    assignment.agencyParticipantIds.length === 0 &&
    assignment.agentParticipantIds.length === 0
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Select at least one agency or agent.",
    );
  }

  const ctx = await loadExpandContext();
  const expanded = expandPlanToContractTerms(plan, assignment, {
    ...ctx,
    carrierIds,
  });

  return {
    plan,
    assignment,
    assignmentRef,
    expanded,
    carrierIds,
    input,
    relationships: ctx.relationships,
  };
}

export const previewCompensationPlan = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "previewCompensationPlan");
  const { plan, assignment, expanded, carrierIds } = await resolveApplyPayload(
    request.data,
  );
  const termIds = expanded.terms.map((t) => t.stableId);
  const existing: ContractTerm[] = [];
  // Firestore getAll in chunks
  for (let i = 0; i < termIds.length; i += 100) {
    const refs = termIds
      .slice(i, i + 100)
      .map((id) => db.doc(`contractTerms/${id}`));
    if (refs.length === 0) continue;
    const snaps = await db.getAll(...refs);
    for (const s of snaps) {
      if (s.exists) existing.push(serializeTerm(s.id, s.data() ?? {}));
    }
  }
  const diff = diffMaterializedTerms(expanded.terms, existing);
  return {
    planId: plan.id,
    assignmentId: assignment.id,
    carrierCount: carrierIds.length,
    agencyCount: expanded.agencyIds.length,
    agentCount: expanded.agentIds.length,
    termCount: expanded.terms.length,
    routingCount: expanded.routing.length,
    diff,
    sampleTerms: expanded.terms.slice(0, 12),
    sampleRouting: expanded.routing.slice(0, 12),
    payMode: assignment.payMode ?? plan.payModeDefault,
    retentionFraction:
      assignment.retentionFraction ?? plan.retentionFractionDefault,
  };
});

export const applyCompensationPlan = onCall(callableOpts, async (request) => {
  await requirePaymentsAdmin(request, "applyCompensationPlan");
  const { plan, assignment, assignmentRef, expanded, carrierIds, relationships } =
    await resolveApplyPayload(request.data);

  await assignmentRef.set(
    {
      planId: assignment.planId,
      agencyParticipantIds: assignment.agencyParticipantIds,
      includeDescendantAgencies: assignment.includeDescendantAgencies,
      agentParticipantIds: assignment.agentParticipantIds,
      payMode: assignment.payMode,
      retentionFraction: assignment.retentionFraction,
      agentPayModeOverrides: assignment.agentPayModeOverrides,
      effectiveFrom: assignment.effectiveFrom,
      active: true,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      lastAppliedAt: FieldValue.serverTimestamp(),
      lastApplyCarrierIds: carrierIds,
    },
    { merge: true },
  );

  const edgeByAgent = new Map<string, string>();
  for (const r of relationships) {
    if (
      r.active === false ||
      r.relationshipType !== "agency_agent" ||
      r.effectiveTo
    ) {
      continue;
    }
    edgeByAgent.set(r.downlineParticipantId, r.id);
  }

  const writes: BatchWrite[] = [];

  for (const term of expanded.terms) {
    const ref = db.doc(`contractTerms/${term.stableId}`);
    writes.push((batch) => {
      batch.set(
        ref,
        {
          participantId: term.participantId,
          carrierId: term.carrierId,
          states: term.states,
          productCodes: term.productCodes,
          rate: term.rate,
          rateUnit: term.rateUnit,
          effectiveFrom: term.effectiveFrom,
          effectiveTo: term.effectiveTo,
          active: true,
          sourcePlanId: term.sourcePlanId,
          sourceAssignmentId: term.sourceAssignmentId,
          slotRole: term.slotRole,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });
  }

  for (const route of expanded.routing) {
    const routeRef = db.doc(`paymentRouting/${route.participantId}`);
    writes.push((batch) => {
      batch.set(
        routeRef,
        {
          participantId: route.participantId,
          payMode: route.payMode,
          payeeParticipantId: route.payeeParticipantId,
          planId: plan.id,
          assignmentId: assignmentRef.id,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    const edgeId = edgeByAgent.get(route.participantId);
    if (edgeId) {
      const retention =
        route.payMode === "through_agency" ? route.retentionFraction : 0;
      const edgeRef = db.doc(`businessRelationships/${edgeId}`);
      writes.push((batch) => {
        batch.set(
          edgeRef,
          {
            retentionFraction: retention,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });
    }
  }

  await commitBatches(writes);

  return {
    planId: plan.id,
    assignmentId: assignmentRef.id,
    termCount: expanded.terms.length,
    routingCount: expanded.routing.length,
    agencyCount: expanded.agencyIds.length,
    agentCount: expanded.agentIds.length,
    carrierCount: carrierIds.length,
  };
});

function serializeCarrierSlim(id: string, data: DocumentData) {
  const marketRaw = String(data.market ?? "aca");
  const market =
    marketRaw === "medicare" || marketRaw === "life" ? marketRaw : "aca";
  return {
    id,
    name: String(data.name ?? ""),
    code: String(data.code ?? ""),
    market,
    active: data.active !== false,
  };
}

/** One-quota bootstrap for the Plans workspace (plans + catalogs). */
export const getPaymentsPlanWorkspace = onCall(
  callableOpts,
  async (request) => {
    await requirePaymentsAdmin(request, "getPaymentsPlanWorkspace");
    const [plansSnap, tiersSnap, groupsSnap, carriersSnap, partsSnap] =
      await Promise.all([
        db.collection("compensationPlans").limit(CATALOG_LIMIT).get(),
        db.collection("compensationTiers").limit(CATALOG_LIMIT).get(),
        db.collection("agentRateGroups").limit(CATALOG_LIMIT).get(),
        db.collection("carriers").limit(CATALOG_LIMIT).get(),
        db.collection("paymentsParticipants").limit(CATALOG_LIMIT).get(),
      ]);
    return {
      plans: plansSnap.docs.map((d) => serializePlan(d.id, d.data())),
      tiers: tiersSnap.docs.map((d) => serializeTier(d.id, d.data())),
      groups: groupsSnap.docs.map((d) => serializeGroup(d.id, d.data())),
      carriers: carriersSnap.docs
        .map((d) => serializeCarrierSlim(d.id, d.data()))
        .filter((c) => c.active !== false),
      participants: partsSnap.docs
        .map((d) => serializeParticipant(d.id, d.data()))
        .filter((p) => p.active !== false),
      truncated:
        plansSnap.size >= CATALOG_LIMIT ||
        tiersSnap.size >= CATALOG_LIMIT ||
        groupsSnap.size >= CATALOG_LIMIT ||
        carriersSnap.size >= CATALOG_LIMIT ||
        partsSnap.size >= CATALOG_LIMIT,
    };
  },
);
