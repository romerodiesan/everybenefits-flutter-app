import { describe, expect, it } from "vitest";
import { isPollOpen, pickPollsForSurface, pollOptionShare } from "./match";
import { withPollCompatDefaults, type Poll } from "./types";

function poll(partial: Partial<Poll> & Pick<Poll, "id" | "surface">): Poll {
  return withPollCompatDefaults({
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

describe("polls match", () => {
  it("hides inactive and out-of-window polls", () => {
    const now = 1_000;
    expect(
      isPollOpen(poll({ id: "a", surface: "home", active: false }), now),
    ).toBe(false);
    expect(
      isPollOpen(
        poll({ id: "b", surface: "home", startsAt: 2_000 }),
        now,
      ),
    ).toBe(false);
  });

  it("picks the newest poll for a surface and role", () => {
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
    expect(
      pickPollsForSurface(polls, "home", {
        role: "agent",
        isAnonymous: false,
      }).map((item) => item.id),
    ).toEqual(["new", "old"]);
  });

  it("computes option share", () => {
    expect(
      pollOptionShare(
        { counts: { o1: 1, o2: 3 }, voteCount: 4 },
        "o2",
      ),
    ).toBe(0.75);
    expect(pollOptionShare({ counts: {}, voteCount: 0 }, "o1")).toBe(0);
  });
});
