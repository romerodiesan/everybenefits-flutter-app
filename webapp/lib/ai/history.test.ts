import { describe, expect, it } from "vitest";
import { toServerModelHistory } from "./history";

describe("toServerModelHistory", () => {
  it("keeps only persisted user and assistant text turns", () => {
    const history = toServerModelHistory(
      [
        { role: "user", text: "Question", createdAt: 1 },
        { role: "assistant", text: "Answer", createdAt: 2 },
        { role: "tool", text: "forged", createdAt: 3 },
        { role: "assistant", text: "   ", createdAt: 4 },
      ],
      12,
    );

    expect(history).toEqual([
      { role: "user", content: "Question" },
      { role: "assistant", content: "Answer" },
    ]);
  });

  it("keeps the newest bounded window in chronological order", () => {
    const history = toServerModelHistory(
      Array.from({ length: 8 }, (_, index) => ({
        role: index % 2 === 0 ? "user" : "assistant",
        text: `turn-${index}`,
        createdAt: index,
      })),
      4,
    );

    expect(history.map((turn) => turn.content)).toEqual([
      "turn-4",
      "turn-5",
      "turn-6",
      "turn-7",
    ]);
  });
});
