import { HttpsError } from "firebase-functions/v2/https";

export const BULK_MAX_IDS = 50;

export type BulkFailure = {
  id: string;
  code: string;
  message: string;
};

export type BulkResult = {
  ok: boolean;
  succeeded: string[];
  failed: BulkFailure[];
};

/** Normalize and cap an id list for bulk callables. Throws on invalid input. */
export function parseBulkIds(
  raw: unknown,
  fieldName = "uids",
  max = BULK_MAX_IDS,
): string[] {
  if (!Array.isArray(raw)) {
    throw new HttpsError("invalid-argument", `${fieldName} must be an array`);
  }
  const ids = [
    ...new Set(
      raw
        .map((v) => String(v ?? "").trim())
        .filter(Boolean),
    ),
  ];
  if (ids.length === 0) {
    throw new HttpsError("invalid-argument", `${fieldName} required`);
  }
  if (ids.length > max) {
    throw new HttpsError(
      "invalid-argument",
      `${fieldName} capped at ${max} (got ${ids.length})`,
    );
  }
  return ids;
}

export function emptyBulkResult(): BulkResult {
  return { ok: true, succeeded: [], failed: [] };
}

export function finalizeBulkResult(result: BulkResult): BulkResult {
  return {
    ...result,
    ok: result.failed.length === 0,
  };
}
