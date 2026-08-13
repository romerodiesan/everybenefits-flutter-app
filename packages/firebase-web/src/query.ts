/**
 * Shared React Query defaults for Pulse Next apps.
 * Keep list/bootstrap queries warm; avoid refetch storms against callable quota.
 */
export const pulseQueryDefaults = {
  staleTime: 60_000,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
  retry: 1,
} as const;

export function createPulseQueryClientOptions() {
  return {
    defaultOptions: {
      queries: { ...pulseQueryDefaults },
    },
  };
}
