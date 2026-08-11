import { describe, expect, it } from "vitest";
import {
  allocateLineOverrides,
  buildUplineChain,
  runOverrideCalculation,
  type BusinessRelationship,
  type ContractTerm,
  type StatementLine,
} from "@pulse/shared";

/**
 * Example from product brief:
 * Carrier $25 → Agency Alpha $25 → Carlos $21 → Maria $18
 * Maria production → Carlos $3 + Alpha $4
 */
const terms: ContractTerm[] = [
  {
    id: "t-maria",
    participantId: "maria",
    carrierId: "carrier-1",
    states: [],
    productCodes: [],
    rate: 18,
    rateUnit: "pmpm",
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    active: true,
  },
  {
    id: "t-carlos",
    participantId: "carlos",
    carrierId: "carrier-1",
    states: [],
    productCodes: [],
    rate: 21,
    rateUnit: "pmpm",
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    active: true,
  },
  {
    id: "t-alpha",
    participantId: "alpha",
    carrierId: "carrier-1",
    states: [],
    productCodes: [],
    rate: 25,
    rateUnit: "pmpm",
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    active: true,
  },
];

const relationships: BusinessRelationship[] = [
  {
    id: "r-carlos-maria",
    uplineParticipantId: "carlos",
    downlineParticipantId: "maria",
    relationshipType: "agent_agent",
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    carrierIds: ["carrier-1"],
    states: [],
    productCodes: [],
    retentionFraction: 0,
    notes: null,
    active: true,
  },
  {
    id: "r-alpha-carlos",
    uplineParticipantId: "alpha",
    downlineParticipantId: "carlos",
    relationshipType: "agency_agent",
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    carrierIds: ["carrier-1"],
    states: [],
    productCodes: [],
    retentionFraction: 0,
    notes: null,
    active: true,
  },
];

const line: StatementLine = {
  id: "line-1",
  statementId: "stmt-1",
  writingProducerParticipantId: "maria",
  writingProducerNpn: "111",
  writingProducerName: "Maria",
  carrierId: "carrier-1",
  state: "FL",
  productCode: "ACA",
  memberMonths: 1,
  receivedOverrideAmount: 7,
  carrierRate: 25,
  productionDate: "2024-06-15",
  externalRef: null,
};

describe("override calc — Maria / Carlos / Alpha", () => {
  it("builds upline chain Maria → Carlos → Alpha", () => {
    const chain = buildUplineChain("maria", relationships, {
      carrierId: "carrier-1",
      state: "FL",
      productCode: "ACA",
      asOf: "2024-06-15",
    });
    expect(chain.map((r) => r.uplineParticipantId)).toEqual([
      "carlos",
      "alpha",
    ]);
  });

  it("allocates $3 to Carlos and $4 to Alpha per member month", () => {
    const allocs = allocateLineOverrides({
      line,
      relationships,
      terms,
    });
    expect(allocs).toHaveLength(2);
    expect(allocs[0]).toMatchObject({
      participantId: "carlos",
      rateDelta: 3,
      amount: 3,
    });
    expect(allocs[1]).toMatchObject({
      participantId: "alpha",
      rateDelta: 4,
      amount: 4,
    });
  });

  it("scales by member months", () => {
    const allocs = allocateLineOverrides({
      line: { ...line, memberMonths: 10 },
      relationships,
      terms,
    });
    expect(allocs[0]!.amount).toBe(30);
    expect(allocs[1]!.amount).toBe(40);
  });

  it("reconciles expected vs received totals", () => {
    const result = runOverrideCalculation({
      lines: [line],
      relationships,
      terms,
    });
    expect(result.expectedTotal).toBe(7);
    expect(result.receivedTotal).toBe(7);
    expect(result.differenceTotal).toBe(0);
  });

  it("does not assume agency-only recipients (Carlos is agent)", () => {
    const allocs = allocateLineOverrides({
      line,
      relationships,
      terms,
    });
    expect(allocs.some((a) => a.participantId === "carlos")).toBe(true);
  });

  it("resolves carrier rate from carrierStateRates when line omits carrierRate", () => {
    const allocs = allocateLineOverrides({
      line: { ...line, carrierRate: null },
      relationships,
      terms,
      carrierStateRates: [
        {
          id: "csr-fl",
          carrierId: "carrier-1",
          state: "FL",
          commissionRate: 0,
          commissionRateUnit: "flat",
          overrideRate: 25,
          overrideRateUnit: "flat",
          active: true,
        },
      ],
    });
    expect(allocs).toHaveLength(2);
    expect(allocs[0]).toMatchObject({ participantId: "carlos", amount: 3 });
    expect(allocs[1]).toMatchObject({ participantId: "alpha", amount: 4 });
  });
});
