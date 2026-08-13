"use strict";
/**
 * Commission run status machine.
 * Blocking validation issues must keep the run out of READY_TO_CALCULATE+.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMISSION_RUN_STATUSES = void 0;
exports.canTransitionCommissionRun = canTransitionCommissionRun;
exports.assertCommissionRunTransition = assertCommissionRunTransition;
exports.isCommissionRunImmutable = isCommissionRunImmutable;
exports.COMMISSION_RUN_STATUSES = [
    "DRAFT",
    "FILES_UPLOADED",
    "PARSING",
    "NORMALIZED",
    "VALIDATING",
    "NEEDS_REVIEW",
    "READY_TO_CALCULATE",
    "CALCULATING",
    "CALCULATED",
    "APPROVED",
    "STATEMENTS_GENERATED",
    "PUBLISHED",
    "NOTIFICATIONS_SENT",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
];
const ALLOWED_TRANSITIONS = {
    DRAFT: ["FILES_UPLOADED", "CANCELLED"],
    FILES_UPLOADED: ["PARSING", "CANCELLED"],
    PARSING: ["NORMALIZED", "FAILED", "CANCELLED"],
    NORMALIZED: ["VALIDATING", "CANCELLED"],
    VALIDATING: ["NEEDS_REVIEW", "READY_TO_CALCULATE", "FAILED", "CANCELLED"],
    NEEDS_REVIEW: ["VALIDATING", "READY_TO_CALCULATE", "CANCELLED"],
    READY_TO_CALCULATE: ["CALCULATING", "CANCELLED"],
    CALCULATING: ["CALCULATED", "FAILED", "CANCELLED"],
    CALCULATED: ["APPROVED", "CALCULATING", "CANCELLED"], // recalculate allowed
    APPROVED: ["STATEMENTS_GENERATED", "CANCELLED"],
    STATEMENTS_GENERATED: ["PUBLISHED", "CANCELLED"],
    PUBLISHED: ["NOTIFICATIONS_SENT", "CANCELLED"],
    NOTIFICATIONS_SENT: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    FAILED: ["DRAFT", "FILES_UPLOADED", "PARSING", "VALIDATING", "CALCULATING", "CANCELLED"],
    CANCELLED: [],
};
function canTransitionCommissionRun(from, to) {
    if (from === to)
        return false;
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
function assertCommissionRunTransition(from, to) {
    if (!canTransitionCommissionRun(from, to)) {
        throw new Error(`Invalid commission run transition: ${from} → ${to}`);
    }
}
/** Statuses where approved calculation snapshot must not be silently mutated. */
function isCommissionRunImmutable(status) {
    return (status === "APPROVED" ||
        status === "STATEMENTS_GENERATED" ||
        status === "PUBLISHED" ||
        status === "NOTIFICATIONS_SENT" ||
        status === "COMPLETED");
}
