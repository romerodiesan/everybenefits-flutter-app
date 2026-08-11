import { describe, expect, it } from "vitest";
import {
  composeDisplayName,
  splitDisplayName,
  validateDisplayName,
  validateFamilyName,
  validateGivenName,
} from "@/lib/roles";

describe("display name validation", () => {
  it("accepts middle initials like Diesan A Romero", () => {
    expect(validateDisplayName("Diesan A Romero")).toEqual({
      ok: true,
      value: "Diesan A Romero",
    });
  });

  it("accepts full middle names", () => {
    expect(validateDisplayName("Diesan Adel Romero")).toEqual({
      ok: true,
      value: "Diesan Adel Romero",
    });
  });

  it("rejects a single-token name", () => {
    expect(validateDisplayName("Diesan").ok).toBe(false);
  });

  it("splits and composes given/family fields", () => {
    expect(splitDisplayName("Diesan A Romero")).toEqual({
      givenName: "Diesan A",
      familyName: "Romero",
    });
    expect(composeDisplayName("Diesan A", "Romero")).toBe("Diesan A Romero");
    expect(validateGivenName("Diesan A").ok).toBe(true);
    expect(validateFamilyName("Romero").ok).toBe(true);
  });
});
