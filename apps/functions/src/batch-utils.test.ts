import { describe, expect, it } from "vitest";
import { chunkArray, FIRESTORE_BATCH_LIMIT, mapPool } from "./batch-utils";

describe("chunkArray", () => {
  it("returns empty for empty input", () => {
    expect(chunkArray([])).toEqual([]);
  });

  it("keeps a single chunk under the limit", () => {
    const items = Array.from({ length: 10 }, (_, i) => i);
    expect(chunkArray(items)).toEqual([items]);
  });

  it("splits at FIRESTORE_BATCH_LIMIT", () => {
    const items = Array.from({ length: FIRESTORE_BATCH_LIMIT + 3 }, (_, i) => i);
    const chunks = chunkArray(items);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(FIRESTORE_BATCH_LIMIT);
    expect(chunks[1]).toHaveLength(3);
  });
});

describe("mapPool", () => {
  it("preserves order with bounded concurrency", async () => {
    const seen: number[] = [];
    const out = await mapPool([3, 1, 2], 2, async (n) => {
      seen.push(n);
      await Promise.resolve();
      return n * 10;
    });
    expect(out).toEqual([30, 10, 20]);
    expect(seen.sort()).toEqual([1, 2, 3]);
  });
});
