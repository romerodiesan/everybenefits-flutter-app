import { callCloudFunction } from "@pulse/firebase-web";
import { getFirebaseFunctions } from "./client";
import type {
  BusinessRelationship,
  Carrier,
  CarrierStateRate,
  ContractTerm,
  PaymentsParticipant,
  Statement,
  StatementLine,
  OverrideRun,
} from "@pulse/shared";

export async function listCarriers(): Promise<Carrier[]> {
  const data = await callCloudFunction<{ carriers?: Carrier[] }>(
    getFirebaseFunctions(),
    "listCarriers",
    {},
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
  }>(getFirebaseFunctions(), "listPaymentsParticipants", {
    includeInactive,
  });
  return data?.participants ?? [];
}

export async function upsertPaymentsParticipant(
  input: Partial<PaymentsParticipant> & { name: string; type: string },
) {
  const data = await callCloudFunction<{ participant: PaymentsParticipant }>(
    getFirebaseFunctions(),
    "upsertPaymentsParticipant",
    input,
  );
  return data.participant;
}

export async function listBusinessRelationships(): Promise<
  BusinessRelationship[]
> {
  const data = await callCloudFunction<{
    relationships?: BusinessRelationship[];
  }>(getFirebaseFunctions(), "listBusinessRelationships", {});
  return data?.relationships ?? [];
}

export async function upsertBusinessRelationship(
  input: Partial<BusinessRelationship> & {
    uplineParticipantId: string;
    downlineParticipantId: string;
    effectiveFrom: string;
  },
) {
  const data = await callCloudFunction<{
    relationship: BusinessRelationship;
  }>(getFirebaseFunctions(), "upsertBusinessRelationship", input);
  return data.relationship;
}

export async function listContractTerms(
  participantId?: string,
): Promise<ContractTerm[]> {
  const data = await callCloudFunction<{ terms?: ContractTerm[] }>(
    getFirebaseFunctions(),
    "listContractTerms",
    participantId ? { participantId } : {},
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

export async function listStatements(): Promise<Statement[]> {
  const data = await callCloudFunction<{ statements?: Statement[] }>(
    getFirebaseFunctions(),
    "listStatements",
    {},
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

export async function listOverrideRuns(
  statementId?: string,
): Promise<OverrideRun[]> {
  const data = await callCloudFunction<{ runs?: OverrideRun[] }>(
    getFirebaseFunctions(),
    "listOverrideRuns",
    statementId ? { statementId } : {},
  );
  return data?.runs ?? [];
}

export async function getOverrideRun(runId: string) {
  return callCloudFunction<{
    run: OverrideRun;
    allocations: Array<Record<string, unknown>>;
    reconciliation: Array<Record<string, unknown>>;
  }>(getFirebaseFunctions(), "getOverrideRun", { runId });
}

export async function runOverrideCalculation(statementId: string) {
  return callCloudFunction<{
    runId: string;
    expectedTotal: number;
    receivedTotal: number;
    differenceTotal: number;
    allocationCount: number;
  }>(getFirebaseFunctions(), "runOverrideCalculationFn", { statementId });
}
