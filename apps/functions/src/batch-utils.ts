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

/** Run async work over items with a max in-flight count. */
export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const limit = Math.max(1, Math.floor(concurrency));
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await mapper(items[i]!, i);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}
