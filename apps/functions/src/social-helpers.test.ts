import { describe, expect, it } from "vitest";
import {
  computeRelationship,
  dmKeyFor,
  dmMessagingEnabledValue,
  sanitizeBio,
} from "./social-helpers";

describe("social helpers", () => {
  it("sorts dm keys stably", () => {
    expect(dmKeyFor("b", "a")).toBe("a_b");
    expect(dmKeyFor("a", "b")).toBe("a_b");
  });

  it("trims and caps bios", () => {
    expect(sanitizeBio("  hello   there  ")).toBe("hello there");
    expect(sanitizeBio("   ")).toBeNull();
    expect(sanitizeBio(1)).toBeNull();
    expect(sanitizeBio("x".repeat(300))?.length).toBe(280);
  });

  it("enables DM messaging only for unblocked mutual contacts", () => {
    expect(
      dmMessagingEnabledValue({
        isGroup: true,
        mutualContacts: false,
        blocked: true,
      }),
    ).toBe(true);
    expect(
      dmMessagingEnabledValue({
        isGroup: false,
        mutualContacts: true,
        blocked: false,
      }),
    ).toBe(true);
    expect(
      dmMessagingEnabledValue({
        isGroup: false,
        mutualContacts: true,
        blocked: true,
      }),
    ).toBe(false);
    expect(
      dmMessagingEnabledValue({
        isGroup: false,
        mutualContacts: false,
        blocked: false,
      }),
    ).toBe(false);
  });

  it("hides block-from-them as none", () => {
    expect(
      computeRelationship({
        viewerUid: "a",
        otherUid: "b",
        theyBlockedViewer: true,
        viewerBlockedOther: false,
        muted: true,
        isContact: true,
        hasOutgoing: true,
        hasIncoming: false,
      }),
    ).toEqual({
      status: "none",
      muted: false,
      blockedByMe: false,
      isSelf: false,
      following: false,
    });
  });

  it("keeps blockedByMe when the viewer blocked", () => {
    expect(
      computeRelationship({
        viewerUid: "a",
        otherUid: "b",
        theyBlockedViewer: false,
        viewerBlockedOther: true,
        muted: true,
        isContact: false,
        hasOutgoing: false,
        hasIncoming: false,
        following: true,
      }),
    ).toEqual({
      status: "none",
      muted: true,
      blockedByMe: true,
      isSelf: false,
      following: false,
    });
  });

  it("exposes following when the viewer follows", () => {
    expect(
      computeRelationship({
        viewerUid: "a",
        otherUid: "b",
        theyBlockedViewer: false,
        viewerBlockedOther: false,
        muted: false,
        isContact: false,
        hasOutgoing: false,
        hasIncoming: false,
        following: true,
      }),
    ).toEqual({
      status: "none",
      muted: false,
      blockedByMe: false,
      isSelf: false,
      following: true,
    });
  });
});
