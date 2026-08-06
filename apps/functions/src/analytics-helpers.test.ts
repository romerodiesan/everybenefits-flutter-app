import { describe, expect, it } from "vitest";
import {
  emptyAnalyticsWindow,
  emptyHourHistogram,
  emptyRetentionBuckets,
  ANALYTICS_MIN_COHORT,
} from "@pulse/shared";

describe("analytics helpers", () => {
  it("builds fixed-size histograms", () => {
    expect(emptyRetentionBuckets()).toHaveLength(101);
    expect(emptyHourHistogram()).toHaveLength(24);
    expect(emptyAnalyticsWindow().views).toBe(0);
  });

  it("keeps privacy cohort threshold", () => {
    expect(ANALYTICS_MIN_COHORT).toBe(5);
  });
});
