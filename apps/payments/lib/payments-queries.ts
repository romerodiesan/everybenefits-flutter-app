"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  AgentRateGroup,
  Carrier,
  CompensationPlan,
  CompensationTier,
  ContractTerm,
  PaymentsOverview,
  PaymentsParticipant,
} from "@pulse/shared";
import {
  applyCompensationPlan,
  deleteAgentRateGroup,
  deleteCompensationPlan,
  deleteCompensationTier,
  getPaymentsOverview,
  getPaymentsPlanWorkspace,
  listAgentRateGroups,
  listCarriers,
  listCarrierStateRates,
  listCompensationPlans,
  listCompensationTiers,
  listContractTerms,
  listPaymentsParticipants,
  seedDefaultCompensationTiers,
  upsertAgentRateGroup,
  upsertCarrier,
  upsertCompensationPlan,
  upsertCompensationTier,
  type CompensationPlanPreview,
  previewCompensationPlan,
} from "@/lib/firebase/functions";

export const paymentsKeys = {
  all: ["payments"] as const,
  overview: ["payments", "overview"] as const,
  carriers: ["payments", "carriers"] as const,
  carrierRates: (carrierId: string) =>
    ["payments", "carrierRates", carrierId] as const,
  participants: ["payments", "participants"] as const,
  tiers: ["payments", "tiers"] as const,
  groups: ["payments", "groups"] as const,
  plans: ["payments", "plans"] as const,
  contractTerms: ["payments", "contractTerms"] as const,
  planWorkspace: ["payments", "planWorkspace"] as const,
};

export type PaymentsPlanWorkspace = {
  plans: CompensationPlan[];
  tiers: CompensationTier[];
  groups: AgentRateGroup[];
  carriers: Carrier[];
  participants: PaymentsParticipant[];
};

export function usePaymentsOverview() {
  return useQuery({
    queryKey: paymentsKeys.overview,
    queryFn: getPaymentsOverview,
  });
}

export function useCarriers() {
  return useQuery({
    queryKey: paymentsKeys.carriers,
    queryFn: listCarriers,
  });
}

export function useCarrierStateRates(carrierId: string) {
  return useQuery({
    queryKey: paymentsKeys.carrierRates(carrierId),
    queryFn: () => listCarrierStateRates(carrierId),
    enabled: Boolean(carrierId),
  });
}

export function usePaymentsParticipants(includeInactive = true) {
  return useQuery({
    queryKey: [...paymentsKeys.participants, includeInactive] as const,
    queryFn: () => listPaymentsParticipants(includeInactive),
  });
}

export function useCompensationTiers() {
  return useQuery({
    queryKey: paymentsKeys.tiers,
    queryFn: listCompensationTiers,
  });
}

export function useAgentRateGroups() {
  return useQuery({
    queryKey: paymentsKeys.groups,
    queryFn: listAgentRateGroups,
  });
}

export function useCompensationPlans() {
  return useQuery({
    queryKey: paymentsKeys.plans,
    queryFn: listCompensationPlans,
  });
}

export function useContractTerms() {
  return useQuery({
    queryKey: paymentsKeys.contractTerms,
    queryFn: () => listContractTerms(),
  });
}

export function usePaymentsPlanWorkspace() {
  const qc = useQueryClient();
  return useQuery({
    queryKey: paymentsKeys.planWorkspace,
    queryFn: async () => {
      const data = await getPaymentsPlanWorkspace();
      qc.setQueryData(paymentsKeys.carriers, data.carriers);
      qc.setQueryData([...paymentsKeys.participants, true], data.participants);
      qc.setQueryData(paymentsKeys.tiers, data.tiers);
      qc.setQueryData(paymentsKeys.groups, data.groups);
      qc.setQueryData(paymentsKeys.plans, data.plans);
      return data;
    },
  });
}

export function useInvalidatePayments() {
  const qc = useQueryClient();
  return {
    invalidateCarriers: () =>
      qc.invalidateQueries({ queryKey: paymentsKeys.carriers }),
    invalidateParticipants: () =>
      qc.invalidateQueries({ queryKey: paymentsKeys.participants }),
    invalidateTiers: () =>
      qc.invalidateQueries({ queryKey: paymentsKeys.tiers }),
    invalidateGroups: () =>
      qc.invalidateQueries({ queryKey: paymentsKeys.groups }),
    invalidatePlans: () =>
      qc.invalidateQueries({ queryKey: paymentsKeys.plans }),
    invalidateContractTerms: () =>
      qc.invalidateQueries({ queryKey: paymentsKeys.contractTerms }),
    invalidatePlanWorkspace: () =>
      qc.invalidateQueries({ queryKey: paymentsKeys.planWorkspace }),
    invalidateOverview: () =>
      qc.invalidateQueries({ queryKey: paymentsKeys.overview }),
    invalidateCarrierRates: (carrierId: string) =>
      qc.invalidateQueries({ queryKey: paymentsKeys.carrierRates(carrierId) }),
    invalidateAllCatalogs: () =>
      qc.invalidateQueries({ queryKey: paymentsKeys.all }),
  };
}

export function useSeedTiersMutation() {
  const inv = useInvalidatePayments();
  return useMutation({
    mutationFn: seedDefaultCompensationTiers,
    onSuccess: () => {
      void inv.invalidateTiers();
      void inv.invalidatePlanWorkspace();
    },
  });
}

export function useUpsertTierMutation() {
  const inv = useInvalidatePayments();
  return useMutation({
    mutationFn: upsertCompensationTier,
    onSuccess: () => {
      void inv.invalidateTiers();
      void inv.invalidatePlanWorkspace();
    },
  });
}

export function useDeleteTierMutation() {
  const inv = useInvalidatePayments();
  return useMutation({
    mutationFn: deleteCompensationTier,
    onSuccess: () => {
      void inv.invalidateTiers();
      void inv.invalidatePlanWorkspace();
    },
  });
}

export function useUpsertGroupMutation() {
  const inv = useInvalidatePayments();
  return useMutation({
    mutationFn: upsertAgentRateGroup,
    onSuccess: () => {
      void inv.invalidateGroups();
      void inv.invalidatePlanWorkspace();
    },
  });
}

export function useDeleteGroupMutation() {
  const inv = useInvalidatePayments();
  return useMutation({
    mutationFn: deleteAgentRateGroup,
    onSuccess: () => {
      void inv.invalidateGroups();
      void inv.invalidatePlanWorkspace();
    },
  });
}

export function useUpsertPlanMutation() {
  const inv = useInvalidatePayments();
  return useMutation({
    mutationFn: upsertCompensationPlan,
    onSuccess: () => {
      void inv.invalidatePlans();
      void inv.invalidatePlanWorkspace();
    },
  });
}

export function useDeletePlanMutation() {
  const inv = useInvalidatePayments();
  return useMutation({
    mutationFn: deleteCompensationPlan,
    onSuccess: () => {
      void inv.invalidatePlans();
      void inv.invalidatePlanWorkspace();
    },
  });
}

export function useApplyPlanMutation() {
  const inv = useInvalidatePayments();
  return useMutation({
    mutationFn: applyCompensationPlan,
    onSuccess: () => {
      void inv.invalidateContractTerms();
      void inv.invalidatePlanWorkspace();
    },
  });
}

export function usePreviewPlanMutation() {
  return useMutation({
    mutationFn: previewCompensationPlan,
  });
}

export function useUpsertCarrierMutation() {
  const inv = useInvalidatePayments();
  return useMutation({
    mutationFn: upsertCarrier,
    onSuccess: () => {
      void inv.invalidateCarriers();
      void inv.invalidatePlanWorkspace();
      void inv.invalidateOverview();
    },
  });
}

export type { CompensationPlanPreview, PaymentsOverview };
