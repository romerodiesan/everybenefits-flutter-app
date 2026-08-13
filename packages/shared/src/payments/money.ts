/**
 * Integer-cent money helpers for commission / override math.
 * Never use IEEE floats for persisted financial amounts.
 *
 * Rounding policy (default): half-away-from-zero to whole cents when
 * converting from decimal dollars or rate products that need a final cent.
 * Intermediate mul/div may keep a rational via integer arithmetic where possible.
 */

export type MoneyCents = number & { readonly __brand: "MoneyCents" };

export function asCents(value: number): MoneyCents {
  if (!Number.isFinite(value)) {
    throw new Error("MoneyCents: non-finite value");
  }
  if (!Number.isInteger(value)) {
    throw new Error("MoneyCents: value must be an integer (cents)");
  }
  return value as MoneyCents;
}

/** Parse a decimal dollar string/number into cents (half-away-from-zero). */
export function dollarsToCents(dollars: number | string): MoneyCents {
  const n = typeof dollars === "string" ? Number(dollars) : dollars;
  if (!Number.isFinite(n)) {
    throw new Error("dollarsToCents: invalid amount");
  }
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const cents = Math.round(abs * 100 + Number.EPSILON) * sign;
  return asCents(cents);
}

export function centsToDollars(cents: MoneyCents | number): number {
  return Number(cents) / 100;
}

export function formatCents(
  cents: MoneyCents | number,
  locale = "en-US",
  currency = "USD",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(centsToDollars(cents));
}

export function addCents(a: MoneyCents | number, b: MoneyCents | number): MoneyCents {
  return asCents(Number(a) + Number(b));
}

export function subCents(a: MoneyCents | number, b: MoneyCents | number): MoneyCents {
  return asCents(Number(a) - Number(b));
}

export function negCents(a: MoneyCents | number): MoneyCents {
  return asCents(-Number(a));
}

/** Multiply cents by a dimensionless rate (e.g. 0.8 for 80%). Rounds to cents. */
export function mulCentsByRate(
  cents: MoneyCents | number,
  rate: number,
): MoneyCents {
  if (!Number.isFinite(rate)) {
    throw new Error("mulCentsByRate: invalid rate");
  }
  const raw = Number(cents) * rate;
  const sign = raw < 0 ? -1 : 1;
  return asCents(Math.round(Math.abs(raw) + Number.EPSILON) * sign);
}

/** PMPM: rateDollars × memberMonths → cents. */
export function pmpmToCents(
  rateDollars: number,
  memberMonths: number,
): MoneyCents {
  if (!Number.isFinite(rateDollars) || !Number.isFinite(memberMonths)) {
    throw new Error("pmpmToCents: invalid inputs");
  }
  const raw = rateDollars * 100 * memberMonths;
  const sign = raw < 0 ? -1 : 1;
  return asCents(Math.round(Math.abs(raw) + Number.EPSILON) * sign);
}

export function sumCents(values: readonly (MoneyCents | number)[]): MoneyCents {
  let total = 0;
  for (const v of values) total += Number(v);
  return asCents(total);
}

export type FinancialResult<T> =
  | { success: true; data: T; warnings?: string[] }
  | { success: false; issues: Array<{ code: string; message: string }> };

export function okResult<T>(
  data: T,
  warnings?: string[],
): FinancialResult<T> {
  return warnings?.length ? { success: true, data, warnings } : { success: true, data };
}

export function failResult<T = never>(
  issues: Array<{ code: string; message: string }>,
): FinancialResult<T> {
  return { success: false, issues };
}
