import { describe, expect, it } from "vitest";
import {
  collectDescendantAgencyIds,
  contractTermStableId,
  diffMaterializedTerms,
  expandPlanToContractTerms,
  type AgentRateGroup,
  type BusinessRelationship,
  type CompensationPlan,
  type CompensationTier,
  type PaymentsParticipant,
  type PlanAssignment,
} from "@pulse/shared";

const tiers: CompensationTier[] = [
  {
    id: "tier-gold",
    name: "Agency Override Gold",
    rate: 25,
    rateUnit: "pmpm",
    kind: "agency",
    active: true,
  },
  {
    id: "tier-silver",
    name: "Agency Override Silver",
    rate: 22,
    rateUnit: "pmpm",
    kind: "agency",
    active: true,
  },
  {
    id: "tier-writing",
    name: "Writing Override",
    rate: 18,
    rateUnit: "pmpm",
    kind: "agent",
    active: true,
  },
  {
    id: "tier-plus",
    name: "Writing Override Plus",
    rate: 20,
    rateUnit: "pmpm",
    kind: "agent",
    active: true,
  },
];

const participants: PaymentsParticipant[] = [
  {
    id: "alpha",
    name: "Alpha",
    type: "agency",
    userId: null,
    npn: null,
    linkedOrgNodeId: "org-a",
    active: true,
  },
  {
    id: "beta",
    name: "Beta",
    type: "agency",
    userId: null,
    npn: null,
    linkedOrgNodeId: "org-b",
    active: true,
  },
  {
    id: "maria",
    name: "Maria",
    type: "agent",
    userId: "u1",
    npn: "1",
    linkedOrgNodeId: "org-a",
    active: true,
  },
  {
    id: "carlos",
    name: "Carlos",
    type: "agent",
    userId: "u2",
    npn: "2",
    linkedOrgNodeId: "org-a",
    active: true,
  },
  {
    id: "lee",
    name: "Lee",
    type: "agent",
    userId: "u3",
    npn: "3",
    linkedOrgNodeId: "org-b",
    active: true,
  },
];

const relationships: BusinessRelationship[] = [
  {
    id: "r-ab",
    uplineParticipantId: "alpha",
    downlineParticipantId: "beta",
    relationshipType: "agency_agency",
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    carrierIds: [],
    states: [],
    productCodes: [],
    retentionFraction: 0,
    notes: null,
    source: "org_hierarchy",
    active: true,
  },
  {
    id: "r-am",
    uplineParticipantId: "alpha",
    downlineParticipantId: "maria",
    relationshipType: "agency_agent",
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    carrierIds: [],
    states: [],
    productCodes: [],
    retentionFraction: 0,
    notes: null,
    source: "org_hierarchy",
    active: true,
  },
  {
    id: "r-ac",
    uplineParticipantId: "alpha",
    downlineParticipantId: "carlos",
    relationshipType: "agency_agent",
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    carrierIds: [],
    states: [],
    productCodes: [],
    retentionFraction: 0,
    notes: null,
    source: "org_hierarchy",
    active: true,
  },
  {
    id: "r-bl",
    uplineParticipantId: "beta",
    downlineParticipantId: "lee",
    relationshipType: "agency_agent",
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    carrierIds: [],
    states: [],
    productCodes: [],
    retentionFraction: 0,
    notes: null,
    source: "org_hierarchy",
    active: true,
  },
];

const groups: AgentRateGroup[] = [
  {
    id: "grp-senior",
    name: "Seniors",
    memberParticipantIds: ["carlos"],
    active: true,
  },
];

const plan: CompensationPlan = {
  id: "plan-1",
  name: "ACA 2026",
  carrierIds: ["c1", "c2"],
  slots: [
    {
      role: "agency_root",
      tierId: "tier-gold",
      rate: null,
      rateUnit: "pmpm",
      agentRateGroupId: null,
      participantIds: [],
    },
    {
      role: "agency_child",
      tierId: "tier-silver",
      rate: null,
      rateUnit: "pmpm",
      agentRateGroupId: null,
      participantIds: [],
    },
    {
      role: "agent_default",
      tierId: "tier-writing",
      rate: null,
      rateUnit: "pmpm",
      agentRateGroupId: null,
      participantIds: [],
    },
    {
      role: "agent_group",
      tierId: "tier-plus",
      rate: null,
      rateUnit: "pmpm",
      agentRateGroupId: "grp-senior",
      participantIds: [],
    },
    {
      role: "agent_override",
      tierId: null,
      rate: 16,
      rateUnit: "pmpm",
      agentRateGroupId: null,
      participantIds: ["lee"],
    },
  ],
  payModeDefault: "through_agency",
  retentionFractionDefault: 0.1,
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  active: true,
};

const assignment: PlanAssignment = {
  id: "asg-1",
  planId: "plan-1",
  agencyParticipantIds: ["alpha"],
  includeDescendantAgencies: true,
  agentParticipantIds: [],
  payMode: null,
  retentionFraction: null,
  agentPayModeOverrides: [{ participantId: "maria", payMode: "direct" }],
  effectiveFrom: null,
  active: true,
};

describe("expandPlanToContractTerms", () => {
  it("materializes multi-carrier terms for agencies, groups, and overrides", () => {
    const result = expandPlanToContractTerms(plan, assignment, {
      participants,
      relationships,
      tiers,
      groups,
      carrierIds: ["c1", "c2"],
    });

    expect(result.agencyIds.sort()).toEqual(["alpha", "beta"]);
    expect(result.agentIds.sort()).toEqual(["carlos", "lee", "maria"]);

    const byKey = (pid: string, cid: string) =>
      result.terms.find((t) => t.participantId === pid && t.carrierId === cid);

    expect(byKey("alpha", "c1")?.rate).toBe(25);
    expect(byKey("beta", "c1")?.rate).toBe(22);
    expect(byKey("maria", "c1")?.rate).toBe(18);
    expect(byKey("carlos", "c1")?.rate).toBe(20);
    expect(byKey("lee", "c2")?.rate).toBe(16);
    expect(result.terms).toHaveLength(2 * 5); // 2 agencies + 3 agents × 2 carriers

    const mariaRoute = result.routing.find((r) => r.participantId === "maria");
    expect(mariaRoute?.payMode).toBe("direct");
    expect(mariaRoute?.payeeParticipantId).toBe("maria");
    expect(mariaRoute?.retentionFraction).toBe(0);

    const carlosRoute = result.routing.find((r) => r.participantId === "carlos");
    expect(carlosRoute?.payMode).toBe("through_agency");
    expect(carlosRoute?.payeeParticipantId).toBe("alpha");
    expect(carlosRoute?.retentionFraction).toBe(0.1);
  });

  it("collects descendant agencies", () => {
    expect(
      collectDescendantAgencyIds(["alpha"], relationships).sort(),
    ).toEqual(["alpha", "beta"]);
  });

  it("stable ids are deterministic", () => {
    expect(contractTermStableId("a", "c")).toBe(contractTermStableId("a", "c"));
  });

  it("diffs create vs update", () => {
    const proposed = expandPlanToContractTerms(plan, assignment, {
      participants,
      relationships,
      tiers,
      groups,
      carrierIds: ["c1"],
    }).terms;
    const existing = [
      {
        id: proposed[0]!.stableId,
        participantId: proposed[0]!.participantId,
        carrierId: proposed[0]!.carrierId,
        rate: proposed[0]!.rate,
        rateUnit: "pmpm" as const,
        active: true,
      },
      {
        id: proposed[1]!.stableId,
        participantId: proposed[1]!.participantId,
        carrierId: proposed[1]!.carrierId,
        rate: 1,
        rateUnit: "pmpm" as const,
        active: true,
      },
    ];
    const d = diffMaterializedTerms(proposed, existing);
    expect(d.unchanged).toBe(1);
    expect(d.update).toBe(1);
    expect(d.create).toBe(proposed.length - 2);
  });
});
