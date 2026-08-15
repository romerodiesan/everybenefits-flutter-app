"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const username_1 = require("./username");
(0, vitest_1.describe)("parseUsername", () => {
    (0, vitest_1.it)("accepts lowercase handles", () => {
        (0, vitest_1.expect)((0, username_1.parseUsername)("gaby_01")).toEqual({ ok: true, value: "gaby_01" });
        (0, vitest_1.expect)((0, username_1.parseUsername)("  ABC_99  ")).toEqual({ ok: true, value: "abc_99" });
    });
    (0, vitest_1.it)("rejects invalid handles", () => {
        (0, vitest_1.expect)((0, username_1.parseUsername)("ab")).toEqual({ ok: false, issue: "invalid" });
        (0, vitest_1.expect)((0, username_1.parseUsername)("has-dash")).toEqual({ ok: false, issue: "invalid" });
        (0, vitest_1.expect)((0, username_1.parseUsername)("too_long_username_okx")).toEqual({
            ok: false,
            issue: "invalid",
        });
        (0, vitest_1.expect)((0, username_1.parseUsername)("Bad Name")).toEqual({ ok: false, issue: "invalid" });
        (0, vitest_1.expect)((0, username_1.parseUsername)("")).toEqual({ ok: false, issue: "invalid" });
    });
});
(0, vitest_1.describe)("displayHandle", () => {
    (0, vitest_1.it)("prefers claimed username", () => {
        (0, vitest_1.expect)((0, username_1.displayHandle)({
            username: "pulse_one",
            email: "ada@example.com",
            uid: "abcd1234",
        })).toBe("pulse_one");
    });
    (0, vitest_1.it)("falls back to email then uid prefix", () => {
        (0, vitest_1.expect)((0, username_1.displayHandle)({ email: "ada@example.com", uid: "abcd1234" })).toBe("ada");
        (0, vitest_1.expect)((0, username_1.displayHandle)({ uid: "zx9q" })).toBe("userzx9q");
    });
    (0, vitest_1.it)("detects claimed usernames", () => {
        (0, vitest_1.expect)((0, username_1.hasClaimedUsername)("ok_1")).toBe(true);
        (0, vitest_1.expect)((0, username_1.hasClaimedUsername)("no")).toBe(false);
        (0, vitest_1.expect)((0, username_1.hasClaimedUsername)(null)).toBe(false);
    });
    (0, vitest_1.it)("builds public profile paths from claimed handles", () => {
        (0, vitest_1.expect)((0, username_1.memberPath)({ uid: "abc123", username: "gaby_01" })).toBe("/members/gaby_01");
        (0, vitest_1.expect)((0, username_1.memberPath)({ uid: "abc123" })).toBe("/members/abc123");
    });
});
(0, vitest_1.describe)("mentions", () => {
    (0, vitest_1.it)("extracts claimed handles from a body", () => {
        (0, vitest_1.expect)((0, username_1.parseMentions)("hey @Gaby_01 and @ab and @ok_user")).toEqual([
            "gaby_01",
            "ok_user",
        ]);
    });
    (0, vitest_1.it)("does not treat emails as mentions", () => {
        (0, vitest_1.expect)((0, username_1.parseMentions)("mail ada@example.com please")).toEqual([]);
    });
    (0, vitest_1.it)("reads the in-progress @query at the cursor", () => {
        (0, vitest_1.expect)((0, username_1.mentionQueryAt)("hi @ga", 6)).toEqual({ start: 3, prefix: "ga" });
        (0, vitest_1.expect)((0, username_1.mentionQueryAt)("hi @ga more", 6)).toEqual({ start: 3, prefix: "ga" });
        (0, vitest_1.expect)((0, username_1.mentionQueryAt)("hi there", 8)).toBeNull();
    });
    (0, vitest_1.it)("inserts a handle over the active query", () => {
        (0, vitest_1.expect)((0, username_1.insertMention)("hi @ga", 6, "gaby_01")).toEqual({
            text: "hi @gaby_01 ",
            cursor: 12,
        });
    });
    (0, vitest_1.it)("filters chat members by prefix", () => {
        const members = [
            { uid: "1", username: "gaby_01", name: "Gabriela" },
            { uid: "2", username: "marcus", name: "Marcus" },
            { uid: "me", username: "self", name: "Me" },
        ];
        (0, vitest_1.expect)((0, username_1.filterMentionCandidates)(members, "ga", "me").map((m) => m.uid)).toEqual(["1"]);
    });
    (0, vitest_1.it)("splits urls and mentions for rendering", () => {
        const spans = (0, username_1.splitChatBody)("see @gaby_01 https://x.test ok");
        (0, vitest_1.expect)(spans).toEqual([
            { kind: "text", value: "see " },
            { kind: "mention", handle: "gaby_01", raw: "@gaby_01" },
            { kind: "text", value: " " },
            { kind: "url", value: "https://x.test" },
            { kind: "text", value: " ok" },
        ]);
    });
    (0, vitest_1.it)("does not highlight short @tokens as mentions", () => {
        (0, vitest_1.expect)((0, username_1.splitChatBody)("hi @ab there")).toEqual([
            { kind: "text", value: "hi @ab there" },
        ]);
    });
});
