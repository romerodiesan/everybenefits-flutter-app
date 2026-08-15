import { describe, expect, it } from "vitest";
import {
  displayHandle,
  filterMentionCandidates,
  hasClaimedUsername,
  insertMention,
  memberPath,
  mentionQueryAt,
  parseMentions,
  parseUsername,
  splitChatBody,
} from "./username";

describe("parseUsername", () => {
  it("accepts lowercase handles", () => {
    expect(parseUsername("gaby_01")).toEqual({ ok: true, value: "gaby_01" });
    expect(parseUsername("  ABC_99  ")).toEqual({ ok: true, value: "abc_99" });
  });

  it("rejects invalid handles", () => {
    expect(parseUsername("ab")).toEqual({ ok: false, issue: "invalid" });
    expect(parseUsername("has-dash")).toEqual({ ok: false, issue: "invalid" });
    expect(parseUsername("too_long_username_okx")).toEqual({
      ok: false,
      issue: "invalid",
    });
    expect(parseUsername("Bad Name")).toEqual({ ok: false, issue: "invalid" });
    expect(parseUsername("")).toEqual({ ok: false, issue: "invalid" });
  });
});

describe("displayHandle", () => {
  it("prefers claimed username", () => {
    expect(
      displayHandle({
        username: "pulse_one",
        email: "ada@example.com",
        uid: "abcd1234",
      }),
    ).toBe("pulse_one");
  });

  it("falls back to email then uid prefix", () => {
    expect(
      displayHandle({ email: "ada@example.com", uid: "abcd1234" }),
    ).toBe("ada");
    expect(displayHandle({ uid: "zx9q" })).toBe("userzx9q");
  });

  it("detects claimed usernames", () => {
    expect(hasClaimedUsername("ok_1")).toBe(true);
    expect(hasClaimedUsername("no")).toBe(false);
    expect(hasClaimedUsername(null)).toBe(false);
  });

  it("builds public profile paths from claimed handles", () => {
    expect(memberPath({ uid: "abc123", username: "gaby_01" })).toBe(
      "/members/gaby_01",
    );
    expect(memberPath({ uid: "abc123" })).toBe("/members/abc123");
  });
});

describe("mentions", () => {
  it("extracts claimed handles from a body", () => {
    expect(parseMentions("hey @Gaby_01 and @ab and @ok_user")).toEqual([
      "gaby_01",
      "ok_user",
    ]);
  });

  it("does not treat emails as mentions", () => {
    expect(parseMentions("mail ada@example.com please")).toEqual([]);
  });

  it("reads the in-progress @query at the cursor", () => {
    expect(mentionQueryAt("hi @ga", 6)).toEqual({ start: 3, prefix: "ga" });
    expect(mentionQueryAt("hi @ga more", 6)).toEqual({ start: 3, prefix: "ga" });
    expect(mentionQueryAt("hi there", 8)).toBeNull();
  });

  it("inserts a handle over the active query", () => {
    expect(insertMention("hi @ga", 6, "gaby_01")).toEqual({
      text: "hi @gaby_01 ",
      cursor: 12,
    });
  });

  it("filters chat members by prefix", () => {
    const members = [
      { uid: "1", username: "gaby_01", name: "Gabriela" },
      { uid: "2", username: "marcus", name: "Marcus" },
      { uid: "me", username: "self", name: "Me" },
    ];
    expect(filterMentionCandidates(members, "ga", "me").map((m) => m.uid)).toEqual(
      ["1"],
    );
  });

  it("splits urls and mentions for rendering", () => {
    const spans = splitChatBody("see @gaby_01 https://x.test ok");
    expect(spans).toEqual([
      { kind: "text", value: "see " },
      { kind: "mention", handle: "gaby_01", raw: "@gaby_01" },
      { kind: "text", value: " " },
      { kind: "url", value: "https://x.test" },
      { kind: "text", value: " ok" },
    ]);
  });

  it("does not highlight short @tokens as mentions", () => {
    expect(splitChatBody("hi @ab there")).toEqual([
      { kind: "text", value: "hi @ab there" },
    ]);
  });
});
