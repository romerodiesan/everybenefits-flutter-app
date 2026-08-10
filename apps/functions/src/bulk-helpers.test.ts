import { describe, expect, it } from "vitest";
import { HttpsError } from "firebase-functions/v2/https";
import {
  BULK_MAX_IDS,
  emptyBulkResult,
  finalizeBulkResult,
  parseBulkIds,
} from "./bulk-helpers";

describe("parseBulkIds", () => {
  it("dedupes and trims ids", () => {
    expect(parseBulkIds([" a ", "b", "a", "", "b"])).toEqual(["a", "b"]);
  });

  it("rejects non-arrays", () => {
    expect(() => parseBulkIds("x")).toThrow(HttpsError);
  });

  it("rejects empty lists", () => {
    expect(() => parseBulkIds([])).toThrow(HttpsError);
    expect(() => parseBulkIds(["", "  "])).toThrow(HttpsError);
  });

  it("rejects lists over the cap", () => {
    const ids = Array.from({ length: BULK_MAX_IDS + 1 }, (_, i) => `u${i}`);
    expect(() => parseBulkIds(ids)).toThrow(/capped at/);
  });

  it("accepts exactly the max count", () => {
    const ids = Array.from({ length: BULK_MAX_IDS }, (_, i) => `u${i}`);
    expect(parseBulkIds(ids)).toHaveLength(BULK_MAX_IDS);
  });
});

describe("finalizeBulkResult", () => {
  it("marks ok false when any failure", () => {
    const result = emptyBulkResult();
    result.succeeded.push("a");
    result.failed.push({ id: "b", code: "not-found", message: "missing" });
    expect(finalizeBulkResult(result).ok).toBe(false);
  });

  it("marks ok true when all succeed", () => {
    const result = emptyBulkResult();
    result.succeeded.push("a");
    expect(finalizeBulkResult(result).ok).toBe(true);
  });
});
