import { describe, expect, it } from "vitest";
import {
  canOpenDirectMessage,
  canResumeDirectMessage,
} from "./chat-access";

describe("canOpenDirectMessage", () => {
  it("lets only the dedicated override bypass recipient opt-out", () => {
    expect(
      canOpenDirectMessage({
        canOverrideRecipientOptOut: true,
        recipientAllowsDirectMessages: false,
      }),
    ).toBe(true);
  });

  it("keeps the recipient preference for ordinary members", () => {
    expect(
      canOpenDirectMessage({
        canOverrideRecipientOptOut: false,
        recipientAllowsDirectMessages: false,
      }),
    ).toBe(false);
  });

  it("allows ordinary members when the recipient accepts DMs", () => {
    expect(
      canOpenDirectMessage({
        canOverrideRecipientOptOut: false,
        recipientAllowsDirectMessages: true,
      }),
    ).toBe(true);
  });
});

describe("canResumeDirectMessage", () => {
  it("repairs legacy DMs for mutual contacts", () => {
    expect(
      canResumeDirectMessage({
        canAccessAllContacts: false,
        mutualContacts: true,
      }),
    ).toBe(true);
  });

  it("allows directory-wide staff and rejects unrelated ordinary users", () => {
    expect(
      canResumeDirectMessage({
        canAccessAllContacts: true,
        mutualContacts: false,
      }),
    ).toBe(true);
    expect(
      canResumeDirectMessage({
        canAccessAllContacts: false,
        mutualContacts: false,
      }),
    ).toBe(false);
  });
});
