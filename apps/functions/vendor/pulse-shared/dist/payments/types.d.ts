/**
 * Override Management domain — distribution participants and economics.
 * Independent of Pulse Admin `orgNodes` (ops tree).
 *
 * Participants are only agencies and agents. A "sub-agency" is an agency
 * that is downline of another agency via a business relationship.
 */
export declare const PARTICIPANT_TYPES: readonly ["agency", "agent"];
export type ParticipantType = (typeof PARTICIPANT_TYPES)[number];
/** Derived from upline.type + downline.type — not chosen freely in UI. */
export declare const RELATIONSHIP_TYPES: readonly ["agency_agency", "agency_agent", "agent_agent"];
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];
export declare const RATE_UNITS: readonly ["pmpm", "flat", "percent"];
export type RateUnit = (typeof RATE_UNITS)[number];
/** Units allowed on carrier state intake (commission / override). */
export declare const CARRIER_RATE_UNITS: readonly ["flat", "percent"];
export type CarrierRateUnit = (typeof CARRIER_RATE_UNITS)[number];
export declare const CARRIER_MARKETS: readonly ["aca", "medicare", "life"];
export type CarrierMarket = (typeof CARRIER_MARKETS)[number];
export declare const STATEMENT_SOURCES: readonly ["carrier", "fmo", "manual"];
export type StatementSource = (typeof STATEMENT_SOURCES)[number];
export declare const OVERRIDE_RUN_STATUSES: readonly ["pending", "running", "completed", "failed"];
export type OverrideRunStatus = (typeof OVERRIDE_RUN_STATUSES)[number];
export type PaymentsParticipant = {
    id: string;
    name: string;
    type: ParticipantType;
    userId: string | null;
    npn: string | null;
    linkedOrgNodeId: string | null;
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
};
export type BusinessRelationship = {
    id: string;
    /** Party that owns / defines the relationship (authority downward). */
    uplineParticipantId: string;
    downlineParticipantId: string;
    relationshipType: RelationshipType;
    effectiveFrom: string;
    effectiveTo: string | null;
    carrierIds: string[];
    states: string[];
    productCodes: string[];
    /** Optional retention fraction of the spread at this edge (0–1). Default 0. */
    retentionFraction: number;
    notes: string | null;
    active: boolean;
};
export type ContractTerm = {
    id: string;
    participantId: string;
    carrierId: string | null;
    states: string[];
    productCodes: string[];
    rate: number;
    rateUnit: RateUnit;
    effectiveFrom: string;
    effectiveTo: string | null;
    active: boolean;
};
export type Carrier = {
    id: string;
    name: string;
    code: string;
    market: CarrierMarket;
    active: boolean;
};
/**
 * What the platform-owner / matriz agency receives from the carrier in a state.
 * Downline distribution is defined separately (contract terms).
 * One active row per (carrierId, state).
 */
export type CarrierStateRate = {
    id: string;
    carrierId: string;
    state: string;
    commissionRate: number;
    commissionRateUnit: CarrierRateUnit;
    overrideRate: number;
    overrideRateUnit: CarrierRateUnit;
    active: boolean;
};
export type Statement = {
    id: string;
    source: StatementSource;
    carrierId: string | null;
    fmoParticipantId: string | null;
    periodStart: string;
    periodEnd: string;
    label: string;
    importedAt: string;
    importedBy: string;
    lineCount: number;
    status: "draft" | "imported" | "reconciled";
};
export type StatementLine = {
    id: string;
    statementId: string;
    writingProducerParticipantId: string | null;
    writingProducerNpn: string | null;
    writingProducerName: string | null;
    carrierId: string | null;
    state: string | null;
    productCode: string | null;
    memberMonths: number;
    /** Override amount actually received on this line (from carrier/FMO). */
    receivedOverrideAmount: number;
    /** Optional carrier rate on the line for spread calc; else resolved from carrier state rates. */
    carrierRate: number | null;
    productionDate: string | null;
    externalRef: string | null;
};
export type OverrideAllocation = {
    id: string;
    runId: string;
    statementLineId: string;
    participantId: string;
    amount: number;
    memberMonths: number;
    rateDelta: number;
    uplineLevel: number;
    downlineLevel: number;
    carrierRate: number;
    writingProducerLevel: number;
};
export type ReconciliationItem = {
    id: string;
    runId: string;
    statementLineId: string;
    participantId: string | null;
    expectedAmount: number;
    receivedAmount: number;
    difference: number;
};
export type OverrideRun = {
    id: string;
    statementId: string;
    status: OverrideRunStatus;
    startedAt: string;
    completedAt: string | null;
    error: string | null;
    allocationCount: number;
    expectedTotal: number;
    receivedTotal: number;
    differenceTotal: number;
    createdBy: string;
};
/** Map legacy participant type strings onto the current enum. */
export declare function normalizeParticipantType(value: unknown): ParticipantType | null;
/**
 * Derive relationship type from participant types.
 * Returns null if the pair is invalid (e.g. agent → agency).
 */
export declare function deriveRelationshipType(uplineType: ParticipantType, downlineType: ParticipantType): RelationshipType | null;
/**
 * True if adding upline→downline would create a cycle
 * (downline is already an ancestor of upline).
 */
export declare function wouldCreateRelationshipCycle(uplineId: string, downlineId: string, relationships: readonly Pick<BusinessRelationship, "uplineParticipantId" | "downlineParticipantId" | "active">[]): boolean;
//# sourceMappingURL=types.d.ts.map