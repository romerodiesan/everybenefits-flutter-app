import type { BulkResult } from "@pulse/firebase-web";
import type { RowSelectionState } from "@tanstack/react-table";

export const BULK_MAX_SELECTED = 50;

export function selectedIdsFromState(
  selection: RowSelectionState,
): string[] {
  return Object.keys(selection).filter((id) => selection[id]);
}

export function clampSelection(
  selection: RowSelectionState,
  max = BULK_MAX_SELECTED,
): RowSelectionState {
  const ids = selectedIdsFromState(selection);
  if (ids.length <= max) return selection;
  const next: RowSelectionState = {};
  for (const id of ids.slice(0, max)) next[id] = true;
  return next;
}

export function formatBulkOutcome(
  result: BulkResult,
  strings: {
    success: (count: number) => string;
    partial: (failed: number, total: number) => string;
  },
): string {
  const total = result.succeeded.length + result.failed.length;
  if (result.failed.length === 0) {
    return strings.success(result.succeeded.length);
  }
  return strings.partial(result.failed.length, total);
}
