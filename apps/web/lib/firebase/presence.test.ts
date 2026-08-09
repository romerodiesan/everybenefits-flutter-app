import { describe, expect, it } from "vitest";
import { countActivePresence, PRESENCE_STALE_MS } from "@/lib/firebase/presence";

describe("countActivePresence", () => {
  const now = 1_700_000_000_000;

  it("counts uids with a fresh tab heartbeat", () => {
    expect(
      countActivePresence(
        {
          u1: { tabA: { at: now - 1_000 } },
          u2: { tabA: { at: now - 2_000 }, tabB: { at: now - 500 } },
        },
        now,
      ),
    ).toBe(2);
  });

  it("ignores hidden/stale tabs", () => {
    expect(
      countActivePresence(
        {
          u1: { tabA: { at: now - PRESENCE_STALE_MS - 1 } },
          u2: { tabA: { at: now - 1_000 } },
        },
        now,
      ),
    ).toBe(1);
  });

  it("counts legacy single-node presence when fresh", () => {
    expect(
      countActivePresence(
        {
          u1: { online: true, at: now - 1_000 },
          u2: { online: true, at: now - PRESENCE_STALE_MS - 5_000 },
        },
        now,
      ),
    ).toBe(1);
  });
});
