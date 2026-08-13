/**
 * Commission run status machine.
 * Blocking validation issues must keep the run out of READY_TO_CALCULATE+.
 */
export declare const COMMISSION_RUN_STATUSES: readonly ["DRAFT", "FILES_UPLOADED", "PARSING", "NORMALIZED", "VALIDATING", "NEEDS_REVIEW", "READY_TO_CALCULATE", "CALCULATING", "CALCULATED", "APPROVED", "STATEMENTS_GENERATED", "PUBLISHED", "NOTIFICATIONS_SENT", "COMPLETED", "FAILED", "CANCELLED"];
export type CommissionRunStatus = (typeof COMMISSION_RUN_STATUSES)[number];
export declare function canTransitionCommissionRun(from: CommissionRunStatus, to: CommissionRunStatus): boolean;
export declare function assertCommissionRunTransition(from: CommissionRunStatus, to: CommissionRunStatus): void;
/** Statuses where approved calculation snapshot must not be silently mutated. */
export declare function isCommissionRunImmutable(status: CommissionRunStatus): boolean;
//# sourceMappingURL=commission-status.d.ts.map