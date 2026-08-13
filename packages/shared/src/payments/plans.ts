/**
 * Compensation plans — expand reusable plan + assignment into contract terms.
 * Tiers / slots are **override levels** only (spread ladder). Carrier commission
 * intake stays on `carrierStateRates` and is not part of plan materialization.
 * Calc still reads materialized `contractTerms` only.
 */

import type {
  AgentRateGroup,
  BusinessRelationship,
  CompensationPlan,
  CompensationPlanSlot,
  CompensationTier,
  ContractTerm,
  PayMode,
  PaymentsParticipant,
  PlanAssignment,
  RateUnit,
} from "./types";

export type MaterializedContractTerm = {
  /** Stable Firestore doc id for idempotent upsert. */
  stableId: string;
  participantId: string;
  carrierId: string;
  states: string[];
  productCodes: string[];
  rate: number;
  rateUnit: RateUnit;
  effectiveFrom: string;
  effectiveTo: string | null;
  active: boolean;
  sourcePlanId: string;
  sourceAssignmentId: string;
  slotRole: string;
};

export type ResolvedPaymentRouting = {
  participantId: string;
  payMode: PayMode;
  payeeParticipantId: string;
  retentionFraction: number;
  agencyParticipantId: string | null;
};

export type ExpandPlanContext = {
  participants: readonly PaymentsParticipant[];
  relationships: readonly BusinessRelationship[];
  tiers: readonly CompensationTier[];
  groups: readonly AgentRateGroup[];
  /** Final carrier set for this apply (already intersected with plan). */
  carrierIds: readonly string[];
};

export type ExpandPlanResult = {
  terms: MaterializedContractTerm[];
  routing: ResolvedPaymentRouting[];
  agencyIds: string[];
  agentIds: string[];
};

/** Deterministic contract-term id for plan materialization. */
export function contractTermStableId(
  participantId: string,
  carrierId: string,
  states: readonly string[] = [],
  productCodes: readonly string[] = [],
): string {
  const s = [...states].map((x) => x.toUpperCase()).sort().join("-");
  const p = [...productCodes].map(String).sort().join("-");
  const raw = `plan_${participantId}_${carrierId}_${s}_${p}`;
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 700);
}

function tierById(
  tiers: readonly CompensationTier[],
  tierId: string | null,
): CompensationTier | null {
  if (!tierId) return null;
  return tiers.find((t) => t.id === tierId && t.active !== false) ?? null;
}

function resolveSlotRate(
  slot: CompensationPlanSlot,
  tiers: readonly CompensationTier[],
): { rate: number; rateUnit: RateUnit } | null {
  const tier = tierById(tiers, slot.tierId);
  if (tier) {
    return { rate: tier.rate, rateUnit: tier.rateUnit };
  }
  if (slot.rate != null && Number.isFinite(slot.rate)) {
    return { rate: slot.rate, rateUnit: slot.rateUnit ?? "pmpm" };
  }
  return null;
}

function activeAgencyAgencyEdges(
  relationships: readonly BusinessRelationship[],
): BusinessRelationship[] {
  return relationships.filter(
    (r) =>
      r.active !== false &&
      r.relationshipType === "agency_agency" &&
      !r.effectiveTo,
  );
}

function activeAgencyAgentEdges(
  relationships: readonly BusinessRelationship[],
): BusinessRelationship[] {
  return relationships.filter(
    (r) =>
      r.active !== false &&
      r.relationshipType === "agency_agent" &&
      !r.effectiveTo,
  );
}

/** Collect descendant agencies (BFS) under the given roots. */
export function collectDescendantAgencyIds(
  rootAgencyIds: readonly string[],
  relationships: readonly BusinessRelationship[],
): string[] {
  const edges = activeAgencyAgencyEdges(relationships);
  const out = new Set<string>(rootAgencyIds);
  const queue = [...rootAgencyIds];
  while (queue.length > 0) {
    const parent = queue.shift()!;
    for (const e of edges) {
      if (e.uplineParticipantId !== parent) continue;
      if (out.has(e.downlineParticipantId)) continue;
      out.add(e.downlineParticipantId);
      queue.push(e.downlineParticipantId);
    }
  }
  return [...out];
}

function hasAgencyParent(
  agencyId: string,
  relationships: readonly BusinessRelationship[],
): boolean {
  return activeAgencyAgencyEdges(relationships).some(
    (e) => e.downlineParticipantId === agencyId,
  );
}

function agentsUnderAgencies(
  agencyIds: readonly string[],
  relationships: readonly BusinessRelationship[],
): string[] {
  const set = new Set(agencyIds);
  const out = new Set<string>();
  for (const e of activeAgencyAgentEdges(relationships)) {
    if (set.has(e.uplineParticipantId)) {
      out.add(e.downlineParticipantId);
    }
  }
  return [...out];
}

function homeAgencyForAgent(
  agentId: string,
  relationships: readonly BusinessRelationship[],
): string | null {
  const edge = activeAgencyAgentEdges(relationships).find(
    (e) => e.downlineParticipantId === agentId,
  );
  return edge?.uplineParticipantId ?? null;
}

function findAgentSlot(
  agentId: string,
  slots: readonly CompensationPlanSlot[],
  groups: readonly AgentRateGroup[],
): CompensationPlanSlot | null {
  const overrides = slots.filter((s) => s.role === "agent_override");
  for (const slot of overrides) {
    if (slot.participantIds.includes(agentId)) return slot;
  }
  const groupSlots = slots.filter((s) => s.role === "agent_group");
  for (const slot of groupSlots) {
    const group = groups.find(
      (g) => g.id === slot.agentRateGroupId && g.active !== false,
    );
    if (group?.memberParticipantIds.includes(agentId)) return slot;
  }
  return slots.find((s) => s.role === "agent_default") ?? null;
}

function findAgencySlot(
  agencyId: string,
  slots: readonly CompensationPlanSlot[],
  relationships: readonly BusinessRelationship[],
): CompensationPlanSlot | null {
  const isChild = hasAgencyParent(agencyId, relationships);
  if (isChild) {
    return (
      slots.find((s) => s.role === "agency_child") ??
      slots.find((s) => s.role === "agency_root") ??
      null
    );
  }
  return slots.find((s) => s.role === "agency_root") ?? null;
}

/**
 * Expand a plan + assignment into contract-term rows and payment routing.
 */
export function expandPlanToContractTerms(
  plan: CompensationPlan,
  assignment: PlanAssignment,
  ctx: ExpandPlanContext,
): ExpandPlanResult {
  const effectiveFrom =
    assignment.effectiveFrom?.trim() || plan.effectiveFrom;
  const effectiveTo = plan.effectiveTo;
  const payMode: PayMode =
    assignment.payMode ?? plan.payModeDefault ?? "through_agency";
  const retentionFraction =
    payMode === "through_agency"
      ? (assignment.retentionFraction ??
        plan.retentionFractionDefault ??
        0)
      : 0;

  const rootAgencies = assignment.agencyParticipantIds.filter((id) => {
    const p = ctx.participants.find((x) => x.id === id);
    return p?.type === "agency" && p.active !== false;
  });

  const agencyIds = assignment.includeDescendantAgencies
    ? collectDescendantAgencyIds(rootAgencies, ctx.relationships)
    : [...rootAgencies];

  const agentIdSet = new Set<string>([
    ...agentsUnderAgencies(agencyIds, ctx.relationships),
    ...assignment.agentParticipantIds,
  ]);
  // Only active agents
  const agentIds = [...agentIdSet].filter((id) => {
    const p = ctx.participants.find((x) => x.id === id);
    return p?.type === "agent" && p.active !== false;
  });

  const carrierIds = [...ctx.carrierIds].filter(Boolean);
  const terms: MaterializedContractTerm[] = [];

  const pushTerms = (
    participantId: string,
    slot: CompensationPlanSlot,
  ) => {
    const resolved = resolveSlotRate(slot, ctx.tiers);
    if (!resolved) return;
    for (const carrierId of carrierIds) {
      terms.push({
        stableId: contractTermStableId(participantId, carrierId),
        participantId,
        carrierId,
        states: [],
        productCodes: [],
        rate: resolved.rate,
        rateUnit: resolved.rateUnit,
        effectiveFrom,
        effectiveTo,
        active: true,
        sourcePlanId: plan.id,
        sourceAssignmentId: assignment.id,
        slotRole: slot.role,
      });
    }
  };

  for (const agencyId of agencyIds) {
    const slot = findAgencySlot(agencyId, plan.slots, ctx.relationships);
    if (slot) pushTerms(agencyId, slot);
  }

  for (const agentId of agentIds) {
    const slot = findAgentSlot(agentId, plan.slots, ctx.groups);
    if (slot) pushTerms(agentId, slot);
  }

  const overrideMap = new Map(
    assignment.agentPayModeOverrides.map((o) => [o.participantId, o.payMode]),
  );

  const routing: ResolvedPaymentRouting[] = agentIds.map((agentId) => {
    const mode = overrideMap.get(agentId) ?? payMode;
    const agencyId = homeAgencyForAgent(agentId, ctx.relationships);
    if (mode === "direct" || !agencyId) {
      return {
        participantId: agentId,
        payMode: "direct" as const,
        payeeParticipantId: agentId,
        retentionFraction: 0,
        agencyParticipantId: agencyId,
      };
    }
    return {
      participantId: agentId,
      payMode: "through_agency" as const,
      payeeParticipantId: agencyId,
      retentionFraction,
      agencyParticipantId: agencyId,
    };
  });

  return { terms, routing, agencyIds, agentIds };
}

/** Diff helper for preview — compare by stableId. */
export function diffMaterializedTerms(
  proposed: readonly MaterializedContractTerm[],
  existing: readonly Pick<
    ContractTerm,
    "id" | "participantId" | "carrierId" | "rate" | "rateUnit" | "active"
  >[],
): { create: number; update: number; unchanged: number } {
  const byId = new Map(existing.map((t) => [t.id, t]));
  let create = 0;
  let update = 0;
  let unchanged = 0;
  for (const row of proposed) {
    const prev = byId.get(row.stableId);
    if (!prev) {
      create += 1;
      continue;
    }
    if (
      prev.rate === row.rate &&
      prev.rateUnit === row.rateUnit &&
      prev.active !== false
    ) {
      unchanged += 1;
    } else {
      update += 1;
    }
  }
  return { create, update, unchanged };
}

/** Default ACA-style override tier seeds (no ids — caller assigns). */
export const DEFAULT_COMPENSATION_TIERS: Omit<
  CompensationTier,
  "id" | "createdAt" | "updatedAt"
>[] = [
  {
    name: "Agency Override Gold",
    rate: 25,
    rateUnit: "pmpm",
    kind: "agency",
    active: true,
  },
  {
    name: "Agency Override Silver",
    rate: 22,
    rateUnit: "pmpm",
    kind: "agency",
    active: true,
  },
  {
    name: "Writing Override Plus",
    rate: 20,
    rateUnit: "pmpm",
    kind: "agent",
    active: true,
  },
  {
    name: "Writing Override",
    rate: 18,
    rateUnit: "pmpm",
    kind: "agent",
    active: true,
  },
];
