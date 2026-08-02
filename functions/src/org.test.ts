import { describe, expect, it } from "vitest";
import { isValidChildType, depthForType } from "@pulse/shared";
import { buildOrgNodePath } from "./org-helpers";

describe("org helpers", () => {
  it("validates child types by depth", () => {
    expect(isValidChildType("organization", "division")).toBe(true);
    expect(isValidChildType("organization", "agency")).toBe(false);
    expect(depthForType("team")).toBe(6);
  });

  it("builds child path from parent path", () => {
    expect(buildOrgNodePath(["root"], "child1")).toEqual(["root", "child1"]);
    expect(buildOrgNodePath(["root", "div"], "reg")).toEqual([
      "root",
      "div",
      "reg",
    ]);
  });
});
