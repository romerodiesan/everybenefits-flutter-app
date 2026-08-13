import { describe, expect, it } from "vitest";
import {
  BULK_MAX_SELECTED,
  clampSelection,
  selectedIdsFromState,
} from "./bulk-selection";

describe("bulk-selection", () => {
  it("lists selected ids", () => {
    expect(selectedIdsFromState({ a: true, b: false, c: true })).toEqual([
      "a",
      "c",
    ]);
  });

  it("clamps to BULK_MAX_SELECTED", () => {
    const selection: Record<string, boolean> = {};
    for (let i = 0; i < BULK_MAX_SELECTED + 10; i++) {
      selection[`id-${i}`] = true;
    }
    const clamped = clampSelection(selection);
    expect(Object.keys(clamped).filter((k) => clamped[k])).toHaveLength(
      BULK_MAX_SELECTED,
    );
  });
});
