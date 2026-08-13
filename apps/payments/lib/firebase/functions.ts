import { callCloudFunction } from "@pulse/firebase-web";
import { getFirebaseFunctions } from "./client";
import type {
  AgentRateGroup,
  Carrier,
  CarrierStateRate,
  CompensationPlan,
  CompensationTier,
  ContractTerm,
  PayMode,
  PaymentsOverview,
  PaymentsParticipant,
  PlanAssignment,
  Statement,
  StatementLine,
} from "@pulse/shared";

export async function listCarriers(): Promise<Carrier[]> {
  const data = await callCloudFunction<{ carriers?: Carrier[]; nextCursor?: string | null }>(
    getFirebaseFunctions(),
    "listCarriers",
    { limit: 500 },
  );
  return data?.carriers ?? [];
}

export async function upsertCarrier(
  input: Partial<Carrier> & {
    name: string;
    code: string;
    market: Carrier["market"];
  },
) {
  const data = await callCloudFunction<{ carrier: Carrier }>(
    getFirebaseFunctions(),
    "upsertCarrier",
    input,
  );
  return data.carrier;
}

export async function deleteCarrier(id: string) {
  await callCloudFunction<{ ok: true }>(
    getFirebaseFunctions(),
    "deleteCarrier",
    { id },
  );
}

export async function listCarrierStateRates(
  carrierId: string,
): Promise<CarrierStateRate[]> {
  const data = await callCloudFunction<{ rates?: CarrierStateRate[] }>(
    getFirebaseFunctions(),
    "listCarrierStateRates",
    { carrierId },
  );
  return data?.rates ?? [];
}

export async function upsertCarrierStateRate(
  input: Partial<CarrierStateRate> & {
    carrierId: string;
    state: string;
    commissionRate: number;
    overrideRate: number;
  },
) {
  const data = await callCloudFunction<{ rate: CarrierStateRate }>(
    getFirebaseFunctions(),
    "upsertCarrierStateRate",
    input,
  );
  return data.rate;
}

export async function deleteCarrierStateRate(id: string) {
  await callCloudFunction<{ ok: true }>(
    getFirebaseFunctions(),
    "deleteCarrierStateRate",
    { id },
  );
}

export async function listPaymentsParticipants(
  includeInactive = true,
): Promise<PaymentsParticipant[]> {
  const data = await callCloudFunction<{
    participants?: PaymentsParticipant[];
    nextCursor?: string | null;
  }>(getFirebaseFunctions(), "listPaymentsParticipants", {
    includeInactive,
    limit: 500,
  });
  return data?.participants ?? [];
}

export async function importCarrierStateRates(
  rows: Array<Record<string, unknown>>,
): Promise<{
  imported: number;
  updated: number;
  carriersCreated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}> {
  return callCloudFunction(getFirebaseFunctions(), "importCarrierStateRates", {
    rows,
  });
}

export async function listContractTerms(
  participantId?: string,
): Promise<ContractTerm[]> {
  const data = await callCloudFunction<{ terms?: ContractTerm[] }>(
    getFirebaseFunctions(),
    "listContractTerms",
    {
      limit: 500,
      ...(participantId ? { participantId } : {}),
    },
  );
  return data?.terms ?? [];
}

export async function upsertContractTerm(
  input: Partial<ContractTerm> & {
    participantId: string;
    rate: number;
    effectiveFrom: string;
  },
) {
  const data = await callCloudFunction<{ term: ContractTerm }>(
    getFirebaseFunctions(),
    "upsertContractTerm",
    input,
  );
  return data.term;
}

export async function listCompensationTiers(): Promise<CompensationTier[]> {
  const data = await callCloudFunction<{ tiers?: CompensationTier[] }>(
    getFirebaseFunctions(),
    "listCompensationTiers",
    {},
  );
  return data?.tiers ?? [];
}

export async function upsertCompensationTier(
  input: Partial<CompensationTier> & { name: string; rate: number },
) {
  const data = await callCloudFunction<{ tier: CompensationTier }>(
    getFirebaseFunctions(),
    "upsertCompensationTier",
    input,
  );
  return data.tier;
}

export async function deleteCompensationTier(id: string) {
  await callCloudFunction<{ ok: true }>(
    getFirebaseFunctions(),
    "deleteCompensationTier",
    { id },
  );
}

export async function seedDefaultCompensationTiers(): Promise<{
  seeded: number;
  tiers: CompensationTier[];
}> {
  return callCloudFunction(
    getFirebaseFunctions(),
    "seedDefaultCompensationTiers",
    {},
  );
}

export async function listAgentRateGroups(): Promise<AgentRateGroup[]> {
  const data = await callCloudFunction<{ groups?: AgentRateGroup[] }>(
    getFirebaseFunctions(),
    "listAgentRateGroups",
    {},
  );
  return data?.groups ?? [];
}

export async function upsertAgentRateGroup(
  input: Partial<AgentRateGroup> & { name: string },
) {
  const data = await callCloudFunction<{ group: AgentRateGroup }>(
    getFirebaseFunctions(),
    "upsertAgentRateGroup",
    input,
  );
  return data.group;
}

export async function deleteAgentRateGroup(id: string) {
  await callCloudFunction<{ ok: true }>(
    getFirebaseFunctions(),
    "deleteAgentRateGroup",
    { id },
  );
}

export async function listCompensationPlans(): Promise<CompensationPlan[]> {
  const data = await callCloudFunction<{ plans?: CompensationPlan[] }>(
    getFirebaseFunctions(),
    "listCompensationPlans",
    {},
  );
  return data?.plans ?? [];
}

export async function getPaymentsPlanWorkspace(): Promise<{
  plans: CompensationPlan[];
  tiers: CompensationTier[];
  groups: AgentRateGroup[];
  carriers: Carrier[];
  participants: PaymentsParticipant[];
}> {
  return callCloudFunction(getFirebaseFunctions(), "getPaymentsPlanWorkspace", {});
}

export async function upsertCompensationPlan(
  input: Partial<CompensationPlan> & {
    name: string;
    slots: CompensationPlan["slots"];
    effectiveFrom: string;
  },
) {
  const data = await callCloudFunction<{ plan: CompensationPlan }>(
    getFirebaseFunctions(),
    "upsertCompensationPlan",
    input,
  );
  return data.plan;
}

export async function deleteCompensationPlan(id: string) {
  await callCloudFunction<{ ok: true }>(
    getFirebaseFunctions(),
    "deleteCompensationPlan",
    { id },
  );
}

export async function listPlanAssignments(
  planId?: string,
): Promise<PlanAssignment[]> {
  const data = await callCloudFunction<{ assignments?: PlanAssignment[] }>(
    getFirebaseFunctions(),
    "listPlanAssignments",
    planId ? { planId } : {},
  );
  return data?.assignments ?? [];
}

export type CompensationPlanPreview = {
  planId: string;
  assignmentId: string;
  carrierCount: number;
  agencyCount: number;
  agentCount: number;
  termCount: number;
  routingCount: number;
  diff: { create: number; update: number; unchanged: number };
  sampleTerms: Array<Record<string, unknown>>;
  sampleRouting: Array<Record<string, unknown>>;
  payMode: PayMode;
  retentionFraction: number;
};

export async function previewCompensationPlan(input: {
  planId: string;
  assignmentId?: string | null;
  agencyParticipantIds?: string[];
  includeDescendantAgencies?: boolean;
  agentParticipantIds?: string[];
  carrierIds?: string[];
  payMode?: PayMode | null;
  retentionFraction?: number | null;
  effectiveFrom?: string | null;
}): Promise<CompensationPlanPreview> {
  return callCloudFunction(
    getFirebaseFunctions(),
    "previewCompensationPlan",
    input,
  );
}

export async function applyCompensationPlan(input: {
  planId: string;
  assignmentId?: string | null;
  agencyParticipantIds?: string[];
  includeDescendantAgencies?: boolean;
  agentParticipantIds?: string[];
  carrierIds?: string[];
  payMode?: PayMode | null;
  retentionFraction?: number | null;
  effectiveFrom?: string | null;
}): Promise<{
  planId: string;
  assignmentId: string;
  termCount: number;
  routingCount: number;
  agencyCount: number;
  agentCount: number;
  carrierCount: number;
}> {
  return callCloudFunction(
    getFirebaseFunctions(),
    "applyCompensationPlan",
    input,
  );
}

export async function listStatements(): Promise<Statement[]> {
  const data = await callCloudFunction<{ statements?: Statement[] }>(
    getFirebaseFunctions(),
    "listStatements",
    { limit: 100 },
  );
  return data?.statements ?? [];
}

export async function getStatement(statementId: string): Promise<{
  statement: Statement;
  lines: StatementLine[];
}> {
  return callCloudFunction(getFirebaseFunctions(), "getStatement", {
    statementId,
  });
}

export async function importStatement(input: {
  label: string;
  periodStart: string;
  periodEnd: string;
  source?: string;
  carrierId?: string | null;
  lines: Array<Record<string, unknown>>;
}) {
  return callCloudFunction<{ statementId: string; lineCount: number }>(
    getFirebaseFunctions(),
    "importStatement",
    input,
  );
}

export async function getPaymentsOverview(): Promise<PaymentsOverview> {
  return callCloudFunction<PaymentsOverview>(
    getFirebaseFunctions(),
    "getPaymentsOverview",
    {},
  );
}

export async function createCommissionRun(input: {
  name: string;
  periodStart: string;
  periodEnd: string;
}) {
  return callCloudFunction<{ run: import("@pulse/shared").CommissionRun }>(
    getFirebaseFunctions(),
    "createCommissionRun",
    input,
  );
}

export async function listCommissionRuns(input?: {
  limit?: number;
  cursor?: string | null;
  status?: string;
}) {
  return callCloudFunction<{
    runs: import("@pulse/shared").CommissionRun[];
    nextCursor: string | null;
  }>(getFirebaseFunctions(), "listCommissionRuns", input ?? {});
}

export async function getCommissionRun(runId: string) {
  return callCloudFunction<{ run: import("@pulse/shared").CommissionRun }>(
    getFirebaseFunctions(),
    "getCommissionRun",
    { runId },
  );
}

export async function listCommissionParties(input?: {
  kind?: "agency" | "agent" | "all";
  query?: string;
  limit?: number;
}) {
  return callCloudFunction<{
    parties: import("@pulse/shared").CommissionPartySummary[];
    nextCursor: string | null;
  }>(getFirebaseFunctions(), "listCommissionParties", input ?? {});
}

export async function getAgencyPayMode(orgNodeId: string) {
  return callCloudFunction<{
    orgNodeId: string;
    payMode: import("@pulse/shared").PayMode;
    isDefault: boolean;
  }>(getFirebaseFunctions(), "getAgencyPayMode", { orgNodeId });
}

export async function setAgencyPayMode(
  orgNodeId: string,
  payMode: import("@pulse/shared").PayMode,
) {
  return callCloudFunction<{
    orgNodeId: string;
    payMode: import("@pulse/shared").PayMode;
    isDefault: boolean;
  }>(getFirebaseFunctions(), "setAgencyPayMode", { orgNodeId, payMode });
}
