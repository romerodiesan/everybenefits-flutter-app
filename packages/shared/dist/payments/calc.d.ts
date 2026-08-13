/**
 * Pure override distribution engine.
 *
 * Rule: each upline earns (their contract level − downline level) × member months,
 * subject to optional retention on the relationship edge.
 */
import type { BusinessRelationship, CarrierStateRate, ContractTerm, OverrideAllocation, ReconciliationItem, StatementLine } from "./types";
export type CalcScope = {
    carrierId: string | null;
    state: string | null;
    productCode: string | null;
    asOf: string;
};
export declare function isRelationshipActive(rel: BusinessRelationship, scope: CalcScope): boolean;
export declare function resolveContractRate(terms: readonly ContractTerm[], participantId: string, scope: CalcScope): number | null;
/**
 * Resolve carrier override intake for a state from carrierStateRates.
 * Uses overrideRate when unit is pmpm or flat (dollar amount for the override
 * stack; both multiply by member months in allocateLineOverrides).
 * Percent is catalog-only for the calc engine in v1.
 */
export declare function resolveCarrierStateRate(rates: readonly CarrierStateRate[], carrierId: string | null, state: string | null, _asOf: string): number | null;
/**
 * Walk upline from writing producer using relationships where
 * downlineParticipantId === current.
 */
export declare function buildUplineChain(writingProducerId: string, relationships: readonly BusinessRelationship[], scope: CalcScope, maxDepth?: number): BusinessRelationship[];
export type LineAllocationDraft = Omit<OverrideAllocation, "id" | "runId">;
export declare function allocateLineOverrides(args: {
    line: StatementLine;
    relationships: readonly BusinessRelationship[];
    terms: readonly ContractTerm[];
    /** Fallback carrier rate when line.carrierRate is null. */
    defaultCarrierRate?: number | null;
    /** Carrier state rate catalog (used when line.carrierRate is null). */
    carrierStateRates?: readonly CarrierStateRate[];
}): LineAllocationDraft[];
export declare function roundMoney(n: number): number;
export declare function reconcileLine(args: {
    statementLineId: string;
    receivedOverrideAmount: number;
    allocations: readonly Pick<LineAllocationDraft, "participantId" | "amount">[];
}): Omit<ReconciliationItem, "id" | "runId">[];
export declare function runOverrideCalculation(args: {
    lines: readonly StatementLine[];
    relationships: readonly BusinessRelationship[];
    terms: readonly ContractTerm[];
    defaultCarrierRate?: number | null;
    carrierStateRates?: readonly CarrierStateRate[];
}): {
    allocations: LineAllocationDraft[];
    reconciliation: Omit<ReconciliationItem, "id" | "runId">[];
    expectedTotal: number;
    receivedTotal: number;
    differenceTotal: number;
};
//# sourceMappingURL=calc.d.ts.map