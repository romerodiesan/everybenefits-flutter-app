/**
 * Compensation plans — expand reusable plan + assignment into contract terms.
 * Tiers / slots are **override levels** only (spread ladder). Carrier commission
 * intake stays on `carrierStateRates` and is not part of plan materialization.
 * Calc still reads materialized `contractTerms` only.
 */
import type { AgentRateGroup, BusinessRelationship, CompensationPlan, CompensationTier, ContractTerm, PayMode, PaymentsParticipant, PlanAssignment, RateUnit } from "./types";
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
export declare function contractTermStableId(participantId: string, carrierId: string, states?: readonly string[], productCodes?: readonly string[]): string;
/** Collect descendant agencies (BFS) under the given roots. */
export declare function collectDescendantAgencyIds(rootAgencyIds: readonly string[], relationships: readonly BusinessRelationship[]): string[];
/**
 * Expand a plan + assignment into contract-term rows and payment routing.
 */
export declare function expandPlanToContractTerms(plan: CompensationPlan, assignment: PlanAssignment, ctx: ExpandPlanContext): ExpandPlanResult;
/** Diff helper for preview — compare by stableId. */
export declare function diffMaterializedTerms(proposed: readonly MaterializedContractTerm[], existing: readonly Pick<ContractTerm, "id" | "participantId" | "carrierId" | "rate" | "rateUnit" | "active">[]): {
    create: number;
    update: number;
    unchanged: number;
};
/** Default ACA-style override tier seeds (no ids — caller assigns). */
export declare const DEFAULT_COMPENSATION_TIERS: Omit<CompensationTier, "id" | "createdAt" | "updatedAt">[];
//# sourceMappingURL=plans.d.ts.map