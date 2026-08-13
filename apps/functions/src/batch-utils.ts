/**
 * Pure helpers used by forum thread deletion (batching / chunking).
 * Kept separate so unit tests do not need Firestore Admin.
 */

export const FIRESTORE_BATCH_LIMIT = 450;

/** Chunk an array into slices of at most `size` (default Firestore batch budget). */
export function chunkArray<T>(
  items: readonly T[],
  size = FIRESTORE_BATCH_LIMIT,
): T[][] {
  if (size <= 0) throw new Error("chunk size must be positive");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size) as T[]);
  }
  return out;
}
