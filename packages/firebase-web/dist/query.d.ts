/**
 * Shared React Query defaults for Pulse Next apps.
 * Keep list/bootstrap queries warm; avoid refetch storms against callable quota.
 */
export declare const pulseQueryDefaults: {
    readonly staleTime: 60000;
    readonly gcTime: number;
    readonly refetchOnWindowFocus: false;
    readonly retry: 1;
};
export declare function createPulseQueryClientOptions(): {
    defaultOptions: {
        queries: {
            staleTime: 60000;
            gcTime: number;
            refetchOnWindowFocus: false;
            retry: 1;
        };
    };
};
//# sourceMappingURL=query.d.ts.map