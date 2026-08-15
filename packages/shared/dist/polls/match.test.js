"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const match_1 = require("./match");
const types_1 = require("./types");
function poll(partial) {
    return (0, types_1.withPollCompatDefaults)({
        question: { en: "Best track?", es: "¿Mejor pista?" },
        options: [
            { id: "o1", label: { en: "A", es: "A" } },
            { id: "o2", label: { en: "B", es: "B" } },
        ],
        active: true,
        audiences: ["all"],
        ...partial,
    });
}
(0, vitest_1.describe)("polls match", () => {
    (0, vitest_1.it)("hides inactive and out-of-window polls", () => {
        const now = 1000;
        (0, vitest_1.expect)((0, match_1.isPollOpen)(poll({ id: "a", surface: "home", active: false }), now)).toBe(false);
        (0, vitest_1.expect)((0, match_1.isPollOpen)(poll({ id: "b", surface: "home", startsAt: 2000 }), now)).toBe(false);
    });
    (0, vitest_1.it)("picks the newest poll for a surface and role", () => {
        const polls = [
            poll({
                id: "old",
                surface: "home",
                updatedAt: 1,
                audiences: ["agent"],
            }),
            poll({
                id: "new",
                surface: "home",
                updatedAt: 9,
                audiences: ["agent"],
            }),
            poll({ id: "rail", surface: "rail", updatedAt: 20 }),
        ];
        (0, vitest_1.expect)((0, match_1.pickPollsForSurface)(polls, "home", {
            role: "agent",
            isAnonymous: false,
        }).map((item) => item.id)).toEqual(["new", "old"]);
    });
    (0, vitest_1.it)("computes option share", () => {
        (0, vitest_1.expect)((0, match_1.pollOptionShare)({ counts: { o1: 1, o2: 3 }, voteCount: 4 }, "o2")).toBe(0.75);
        (0, vitest_1.expect)((0, match_1.pollOptionShare)({ counts: {}, voteCount: 0 }, "o1")).toBe(0);
    });
});
