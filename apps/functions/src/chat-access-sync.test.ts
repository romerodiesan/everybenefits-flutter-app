import { describe, expect, it } from "vitest";
import { accountCanUseChats } from "./chat-access-sync";

describe("accountCanUseChats", () => {
  const permission = ["chats.participate"];

  it("allows approved active members with the live permission", () => {
    expect(
      accountCanUseChats(
        { approvalStatus: "approved", accountStatus: "active" },
        permission,
      ),
    ).toBe(true);
  });

  it.each(["pending", "rejected"])(
    "blocks %s accounts",
    (approvalStatus) => {
      expect(accountCanUseChats({ approvalStatus }, permission)).toBe(false);
    },
  );

  it.each(["deactivated", "pendingDeletion"])(
    "blocks %s account status",
    (accountStatus) => {
      expect(accountCanUseChats({ accountStatus }, permission)).toBe(false);
    },
  );

  it("blocks missing permission and anonymous profiles", () => {
    expect(accountCanUseChats({ approvalStatus: "approved" }, [])).toBe(false);
    expect(
      accountCanUseChats(
        { approvalStatus: "approved", isAnonymous: true },
        permission,
      ),
    ).toBe(false);
  });
});
