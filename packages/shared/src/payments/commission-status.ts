/**
 * Commission run status machine.
 * Blocking validation issues must keep the run out of READY_TO_CALCULATE+.
 */

export const COMMISSION_RUN_STATUSES = [
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
] as const;

export type CommissionRunStatus = (typeof COMMISSION_RUN_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<
  CommissionRunStatus,
  readonly CommissionRunStatus[]
> = {
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

export function canTransitionCommissionRun(
  from: CommissionRunStatus,
  to: CommissionRunStatus,
): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertCommissionRunTransition(
  from: CommissionRunStatus,
  to: CommissionRunStatus,
): void {
  if (!canTransitionCommissionRun(from, to)) {
    throw new Error(`Invalid commission run transition: ${from} → ${to}`);
  }
}

/** Statuses where approved calculation snapshot must not be silently mutated. */
export function isCommissionRunImmutable(status: CommissionRunStatus): boolean {
  return (
    status === "APPROVED" ||
    status === "STATEMENTS_GENERATED" ||
    status === "PUBLISHED" ||
    status === "NOTIFICATIONS_SENT" ||
    status === "COMPLETED"
  );
}
