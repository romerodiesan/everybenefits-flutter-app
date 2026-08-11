/** US states and DC for payments carrier state rates. */
export type UsState = {
    code: string;
    name: string;
};
export declare const US_STATES: readonly UsState[];
/** Active state codes already used by rates for a carrier. */
export declare function usedCarrierStates(rates: readonly {
    state: string;
    active?: boolean;
}[]): Set<string>;
//# sourceMappingURL=us-states.d.ts.map