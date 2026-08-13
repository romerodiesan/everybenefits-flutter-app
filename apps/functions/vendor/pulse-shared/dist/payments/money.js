"use strict";
/**
 * Integer-cent money helpers for commission / override math.
 * Never use IEEE floats for persisted financial amounts.
 *
 * Rounding policy (default): half-away-from-zero to whole cents when
 * converting from decimal dollars or rate products that need a final cent.
 * Intermediate mul/div may keep a rational via integer arithmetic where possible.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.asCents = asCents;
exports.dollarsToCents = dollarsToCents;
exports.centsToDollars = centsToDollars;
exports.formatCents = formatCents;
exports.addCents = addCents;
exports.subCents = subCents;
exports.negCents = negCents;
exports.mulCentsByRate = mulCentsByRate;
exports.pmpmToCents = pmpmToCents;
exports.sumCents = sumCents;
exports.okResult = okResult;
exports.failResult = failResult;
function asCents(value) {
    if (!Number.isFinite(value)) {
        throw new Error("MoneyCents: non-finite value");
    }
    if (!Number.isInteger(value)) {
        throw new Error("MoneyCents: value must be an integer (cents)");
    }
    return value;
}
/** Parse a decimal dollar string/number into cents (half-away-from-zero). */
function dollarsToCents(dollars) {
    const n = typeof dollars === "string" ? Number(dollars) : dollars;
    if (!Number.isFinite(n)) {
        throw new Error("dollarsToCents: invalid amount");
    }
    const sign = n < 0 ? -1 : 1;
    const abs = Math.abs(n);
    const cents = Math.round(abs * 100 + Number.EPSILON) * sign;
    return asCents(cents);
}
function centsToDollars(cents) {
    return Number(cents) / 100;
}
function formatCents(cents, locale = "en-US", currency = "USD") {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
    }).format(centsToDollars(cents));
}
function addCents(a, b) {
    return asCents(Number(a) + Number(b));
}
function subCents(a, b) {
    return asCents(Number(a) - Number(b));
}
function negCents(a) {
    return asCents(-Number(a));
}
/** Multiply cents by a dimensionless rate (e.g. 0.8 for 80%). Rounds to cents. */
function mulCentsByRate(cents, rate) {
    if (!Number.isFinite(rate)) {
        throw new Error("mulCentsByRate: invalid rate");
    }
    const raw = Number(cents) * rate;
    const sign = raw < 0 ? -1 : 1;
    return asCents(Math.round(Math.abs(raw) + Number.EPSILON) * sign);
}
/** PMPM: rateDollars × memberMonths → cents. */
function pmpmToCents(rateDollars, memberMonths) {
    if (!Number.isFinite(rateDollars) || !Number.isFinite(memberMonths)) {
        throw new Error("pmpmToCents: invalid inputs");
    }
    const raw = rateDollars * 100 * memberMonths;
    const sign = raw < 0 ? -1 : 1;
    return asCents(Math.round(Math.abs(raw) + Number.EPSILON) * sign);
}
function sumCents(values) {
    let total = 0;
    for (const v of values)
        total += Number(v);
    return asCents(total);
}
function okResult(data, warnings) {
    return warnings?.length ? { success: true, data, warnings } : { success: true, data };
}
function failResult(issues) {
    return { success: false, issues };
}
