"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toDate = toDate;
/** Coerce Firestore / RTDB timestamp-like values to Date. */
function toDate(value) {
    if (!value)
        return null;
    if (value instanceof Date)
        return value;
    if (typeof value === "object" && value !== null && "toDate" in value) {
        try {
            return value.toDate();
        }
        catch {
            return null;
        }
    }
    if (typeof value === "string" || typeof value === "number") {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
}
