"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pulseQueryDefaults = void 0;
exports.createPulseQueryClientOptions = createPulseQueryClientOptions;
/**
 * Shared React Query defaults for Pulse Next apps.
 * Keep list/bootstrap queries warm; avoid refetch storms against callable quota.
 */
exports.pulseQueryDefaults = {
    staleTime: 60000,
    gcTime: 5 * 60000,
    refetchOnWindowFocus: false,
    retry: 1,
};
function createPulseQueryClientOptions() {
    return {
        defaultOptions: {
            queries: { ...exports.pulseQueryDefaults },
        },
    };
}
