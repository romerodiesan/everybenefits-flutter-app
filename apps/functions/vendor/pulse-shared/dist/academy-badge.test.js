"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const academy_1 = require("./academy");
const profile_badge_1 = require("./profile-badge");
(0, vitest_1.describe)("resolveLessonDurationSeconds", () => {
    (0, vitest_1.it)("keeps a real second count", () => {
        (0, vitest_1.expect)((0, academy_1.resolveLessonDurationSeconds)({ durationSeconds: 185 })).toBe(185);
    });
    (0, vitest_1.it)("promotes durationMinutes when seconds are missing or duplicated", () => {
        (0, vitest_1.expect)((0, academy_1.resolveLessonDurationSeconds)({ durationMinutes: 7 })).toBe(420);
        (0, vitest_1.expect)((0, academy_1.resolveLessonDurationSeconds)({ durationMinutes: 10, durationSeconds: 10 })).toBe(600);
    });
    (0, vitest_1.it)("parses clock labels", () => {
        (0, vitest_1.expect)((0, academy_1.parseClockDuration)("1:30")).toBe(90);
        (0, vitest_1.expect)((0, academy_1.parseClockDuration)("1:02:03")).toBe(3723);
    });
});
(0, vitest_1.describe)("profile badge", () => {
    (0, vitest_1.it)("resolves custom text against the member accent", () => {
        const config = (0, profile_badge_1.sanitizeProfileBadgeInput)({
            enabled: true,
            text: "Mentor",
            icon: "star",
            color: "accent",
        });
        const badge = (0, profile_badge_1.toPublicProfileBadge)(config, "violet");
        (0, vitest_1.expect)(badge?.text).toBe("Mentor");
        (0, vitest_1.expect)(badge?.icon).toBe("star");
        (0, vitest_1.expect)(badge?.backgroundColor).toBe("#7C3AED");
        (0, vitest_1.expect)(badge?.assigned).toBe(true);
    });
    (0, vitest_1.it)("does not invent a badge without an admin assignment", () => {
        (0, vitest_1.expect)((0, profile_badge_1.toPublicProfileBadge)(null, "green")).toBeNull();
    });
    (0, vitest_1.it)("ignores public badges that were never assigned", () => {
        (0, vitest_1.expect)((0, profile_badge_1.parsePublicProfileBadge)({
            text: "Agent",
            icon: "badge",
            backgroundColor: "#1F6B4A",
        })).toBeNull();
    });
});
