/**
 * Override Management domain — distribution participants and economics.
 * Independent of Pulse Admin `orgNodes` (ops tree).
 *
 * Participants are only agencies and agents. A "sub-agency" is an agency
 * that is downline of another agency via a business relationship.
 */

export const PARTICIPANT_TYPES = ["agency", "agent"] as const;
export type ParticipantType = (typeof PARTICIPANT_TYPES)[number];

/** Derived from upline.type + downline.type — not chosen freely in UI. */
export const RELATIONSHIP_TYPES = [
  "agency_agency",
  "agency_agent",
  "agent_agent",
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const RATE_UNITS = ["pmpm", "flat", "percent"] as const;
export type RateUnit = (typeof RATE_UNITS)[number];

/** Units allowed on carrier state intake (commission / override). */
export const CARRIER_RATE_UNITS = ["flat", "percent"] as const;
export type CarrierRateUnit = (typeof CARRIER_RATE_UNITS)[number];

export const CARRIER_MARKETS = ["aca", "medicare", "life"] as const;
export type CarrierMarket = (typeof CARRIER_MARKETS)[number];

export const STATEMENT_SOURCES = ["carrier", "fmo", "manual"] as const;
export type StatementSource = (typeof STATEMENT_SOURCES)[number];

export const OVERRIDE_RUN_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
] as const;
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
export function normalizeParticipantType(value: unknown): ParticipantType | null {
  if (value === "agency" || value === "agent") return value;
  if (value === "sub_agency") return "agency";
  return null;
}

/**
 * Derive relationship type from participant types.
 * Returns null if the pair is invalid (e.g. agent → agency).
 */
export function deriveRelationshipType(
  uplineType: ParticipantType,
  downlineType: ParticipantType,
): RelationshipType | null {
  if (uplineType === "agency" && downlineType === "agency") {
    return "agency_agency";
  }
  if (uplineType === "agency" && downlineType === "agent") {
    return "agency_agent";
  }
  if (uplineType === "agent" && downlineType === "agent") {
    return "agent_agent";
  }
  return null;
}

/**
 * True if adding upline→downline would create a cycle
 * (downline is already an ancestor of upline).
 */
export function wouldCreateRelationshipCycle(
  uplineId: string,
  downlineId: string,
  relationships: readonly Pick<
    BusinessRelationship,
    "uplineParticipantId" | "downlineParticipantId" | "active"
  >[],
): boolean {
  if (uplineId === downlineId) return true;
  // Walk upline from the proposed upline; if we hit downline, cycle.
  let current = uplineId;
  const visited = new Set<string>();
  for (let i = 0; i < 64; i++) {
    if (visited.has(current)) return true;
    visited.add(current);
    const edge = relationships.find(
      (r) => r.active !== false && r.downlineParticipantId === current,
    );
    if (!edge) return false;
    if (edge.uplineParticipantId === downlineId) return true;
    current = edge.uplineParticipantId;
  }
  return true;
}
