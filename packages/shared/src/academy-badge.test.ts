import { describe, expect, it } from "vitest";
import {
  parseClockDuration,
  resolveLessonDurationSeconds,
} from "./academy";
import {
  parsePublicProfileBadge,
  sanitizeProfileBadgeInput,
  toPublicProfileBadge,
} from "./profile-badge";

describe("resolveLessonDurationSeconds", () => {
  it("keeps a real second count", () => {
    expect(resolveLessonDurationSeconds({ durationSeconds: 185 })).toBe(185);
  });

  it("promotes durationMinutes when seconds are missing or duplicated", () => {
    expect(resolveLessonDurationSeconds({ durationMinutes: 7 })).toBe(420);
    expect(
      resolveLessonDurationSeconds({ durationMinutes: 10, durationSeconds: 10 }),
    ).toBe(600);
  });

  it("parses clock labels", () => {
    expect(parseClockDuration("1:30")).toBe(90);
    expect(parseClockDuration("1:02:03")).toBe(3723);
  });
});

describe("profile badge", () => {
  it("resolves custom text against the member accent", () => {
    const config = sanitizeProfileBadgeInput({
      enabled: true,
      text: "Mentor",
      icon: "star",
      color: "accent",
    });
    const badge = toPublicProfileBadge(config, "violet");
    expect(badge?.text).toBe("Mentor");
    expect(badge?.icon).toBe("star");
    expect(badge?.backgroundColor).toBe("#7C3AED");
    expect(badge?.assigned).toBe(true);
  });

  it("does not invent a badge without an admin assignment", () => {
    expect(toPublicProfileBadge(null, "green")).toBeNull();
  });

  it("ignores public badges that were never assigned", () => {
    expect(
      parsePublicProfileBadge({
        text: "Agent",
        icon: "badge",
        backgroundColor: "#1F6B4A",
      }),
    ).toBeNull();
  });
});
