import { describe, expect, it } from "vitest";
import {
  addCents,
  asCents,
  canTransitionCommissionRun,
  dollarsToCents,
  failResult,
  isCommissionRunImmutable,
  mulCentsByRate,
  okResult,
  pmpmToCents,
  subCents,
  sumCents,
} from "@pulse/shared";

describe("MoneyCents", () => {
  it("converts dollars to cents with half-away rounding", () => {
    expect(dollarsToCents(18)).toBe(1800);
    expect(dollarsToCents("18.005")).toBe(1801);
    expect(dollarsToCents(-1.5)).toBe(-150);
  });

  it("adds and subtracts without float drift", () => {
    expect(addCents(asCents(100), asCents(250))).toBe(350);
    expect(subCents(asCents(1000), asCents(1))).toBe(999);
  });

  it("computes PMPM", () => {
    expect(pmpmToCents(18, 25)).toBe(45_000);
  });

  it("applies percentage rates", () => {
    expect(mulCentsByRate(asCents(100_000), 0.8)).toBe(80_000);
  });

  it("sums allocations", () => {
    expect(sumCents([1800, 400, 300])).toBe(2500);
  });

  it("rejects non-integer cents", () => {
    expect(() => asCents(1.5)).toThrow(/integer/);
  });
});

describe("FinancialResult", () => {
  it("builds ok and fail results", () => {
    expect(okResult({ total: 1 })).toEqual({
      success: true,
      data: { total: 1 },
    });
    expect(failResult([{ code: "MISSING_RULE", message: "no rule" }])).toEqual({
      success: false,
      issues: [{ code: "MISSING_RULE", message: "no rule" }],
    });
  });
});

describe("commission run status machine", () => {
  it("allows happy-path transitions", () => {
    expect(canTransitionCommissionRun("DRAFT", "FILES_UPLOADED")).toBe(true);
    expect(canTransitionCommissionRun("CALCULATED", "APPROVED")).toBe(true);
    expect(canTransitionCommissionRun("PUBLISHED", "NOTIFICATIONS_SENT")).toBe(
      true,
    );
  });

  it("blocks illegal skips", () => {
    expect(canTransitionCommissionRun("DRAFT", "APPROVED")).toBe(false);
    expect(canTransitionCommissionRun("COMPLETED", "DRAFT")).toBe(false);
  });

  it("marks approved+ as immutable", () => {
    expect(isCommissionRunImmutable("CALCULATED")).toBe(false);
    expect(isCommissionRunImmutable("APPROVED")).toBe(true);
    expect(isCommissionRunImmutable("COMPLETED")).toBe(true);
  });
});
