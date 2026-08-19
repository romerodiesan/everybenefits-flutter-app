import { describe, expect, it } from "vitest";
import {
  datetimeLocalToMillis,
  fillLocalized,
  functionsErrorMessage,
  mergeCampaignItem,
  millisToDatetimeLocal,
} from "./campaign-form";

describe("fillLocalized", () => {
  it("mirrors the filled locale onto the blank one", () => {
    expect(fillLocalized({ en: "Hello", es: "" })).toEqual({
      en: "Hello",
      es: "Hello",
    });
    expect(fillLocalized({ en: "  ", es: "Hola" })).toEqual({
      en: "Hola",
      es: "Hola",
    });
  });
});

describe("schedule helpers", () => {
  it("round-trips datetime-local values", () => {
    const ms = datetimeLocalToMillis("2026-08-19T15:30");
    expect(ms).toBeTypeOf("number");
    expect(millisToDatetimeLocal(ms)).toBe("2026-08-19T15:30");
    expect(datetimeLocalToMillis("")).toBeNull();
  });
});

describe("functionsErrorMessage", () => {
  it("strips Firebase callable prefixes", () => {
    expect(
      functionsErrorMessage(
        { message: "FirebaseError: functions/invalid-argument: Bad id" },
        "fallback",
      ),
    ).toBe("Bad id");
  });
});

describe("mergeCampaignItem", () => {
  it("replaces an existing row without a full reload", () => {
    const next = mergeCampaignItem(
      [
        { id: "a", voteCount: 1 },
        { id: "b", voteCount: 2 },
      ],
      { id: "b", voteCount: 9 },
    );
    expect(next).toEqual([
      { id: "a", voteCount: 1 },
      { id: "b", voteCount: 9 },
    ]);
  });
});
