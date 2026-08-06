/**
 * Unit tests for academy analytics event parsing / retention helpers.
 */
import { describe, expect, it } from "vitest";
import {
  ACADEMY_ANALYTICS_EVENT_NAMES,
  ACADEMY_ANALYTICS_SCHEMA_VERSION,
  ANALYTICS_MIN_COHORT,
  emptyRetentionBuckets,
} from "@pulse/shared";
import { ensureRetentionShape } from "./analytics";

describe("academy analytics contract", () => {
  it("exports a stable schema version and event catalog", () => {
    expect(ACADEMY_ANALYTICS_SCHEMA_VERSION).toBe(1);
    expect(ACADEMY_ANALYTICS_EVENT_NAMES).toContain("lesson_heartbeat");
    expect(ANALYTICS_MIN_COHORT).toBeGreaterThanOrEqual(5);
  });

  it("normalizes retention histograms to 101 buckets", () => {
    expect(emptyRetentionBuckets()).toHaveLength(101);
    expect(ensureRetentionShape(undefined)).toHaveLength(101);
    expect(ensureRetentionShape({ retentionBuckets: [1, 2, 3] })).toHaveLength(
      101,
    );
    const full = emptyRetentionBuckets();
    full[50] = 9;
    expect(ensureRetentionShape({ retentionBuckets: full })[50]).toBe(9);
  });
});
