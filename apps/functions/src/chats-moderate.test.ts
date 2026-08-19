import { describe, expect, it } from "vitest";
import { actorHasPermission } from "./guards";
import { canClearChatThread } from "./chat-moderation";
import { DEFAULT_ROLE_PERMISSIONS } from "@pulse/shared";

describe("canClearChatThread", () => {
  const admin = [...DEFAULT_ROLE_PERMISSIONS.admin];
  const manager = [...DEFAULT_ROLE_PERMISSIONS.manager];
  const agent = [...DEFAULT_ROLE_PERMISSIONS.agent];

  it("allows a moderating member to clear their thread", () => {
    expect(
      canClearChatThread({
        uid: "mod1",
        permissions: admin,
        members: { mod1: true, peer: true },
        isGroup: false,
      }),
    ).toBe(true);
  });

  it("blocks a moderator who is not a member of a DM", () => {
    expect(
      canClearChatThread({
        uid: "mod1",
        permissions: admin,
        members: { a: true, b: true },
        isGroup: false,
      }),
    ).toBe(false);
  });

  it("allows group managers to clear a group they are not in", () => {
    expect(
      canClearChatThread({
        uid: "staff",
        permissions: admin,
        members: { a: true, b: true },
        isGroup: true,
      }),
    ).toBe(true);
  });

  it("blocks managers without moderate from clearing", () => {
    expect(actorHasPermission(manager, "chats.messages.moderate")).toBe(false);
    expect(
      canClearChatThread({
        uid: "mgr",
        permissions: manager,
        members: { mgr: true },
        isGroup: true,
      }),
    ).toBe(false);
  });

  it("blocks agents even when they are members", () => {
    expect(
      canClearChatThread({
        uid: "agent1",
        permissions: agent,
        members: { agent1: true, peer: true },
        isGroup: false,
      }),
    ).toBe(false);
  });
});
