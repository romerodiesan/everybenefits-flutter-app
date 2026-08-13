/**
 * Integer-cent money helpers for commission / override math.
 * Never use IEEE floats for persisted financial amounts.
 *
 * Rounding policy (default): half-away-from-zero to whole cents when
 * converting from decimal dollars or rate products that need a final cent.
 * Intermediate mul/div may keep a rational via integer arithmetic where possible.
 */
export type MoneyCents = number & {
    readonly __brand: "MoneyCents";
};
export declare function asCents(value: number): MoneyCents;
/** Parse a decimal dollar string/number into cents (half-away-from-zero). */
export declare function dollarsToCents(dollars: number | string): MoneyCents;
export declare function centsToDollars(cents: MoneyCents | number): number;
export declare function formatCents(cents: MoneyCents | number, locale?: string, currency?: string): string;
export declare function addCents(a: MoneyCents | number, b: MoneyCents | number): MoneyCents;
export declare function subCents(a: MoneyCents | number, b: MoneyCents | number): MoneyCents;
export declare function negCents(a: MoneyCents | number): MoneyCents;
/** Multiply cents by a dimensionless rate (e.g. 0.8 for 80%). Rounds to cents. */
export declare function mulCentsByRate(cents: MoneyCents | number, rate: number): MoneyCents;
/** PMPM: rateDollars × memberMonths → cents. */
export declare function pmpmToCents(rateDollars: number, memberMonths: number): MoneyCents;
export declare function sumCents(values: readonly (MoneyCents | number)[]): MoneyCents;
export type FinancialResult<T> = {
    success: true;
    data: T;
    warnings?: string[];
} | {
    success: false;
    issues: Array<{
        code: string;
        message: string;
    }>;
};
export declare function okResult<T>(data: T, warnings?: string[]): FinancialResult<T>;
export declare function failResult<T = never>(issues: Array<{
    code: string;
    message: string;
}>): FinancialResult<T>;
//# sourceMappingURL=money.d.ts.map