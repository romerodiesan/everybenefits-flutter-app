import { describe, expect, it } from "vitest";
import {
  buildChatTimelineOldestFirst,
  chatHueFromName,
  messagesGroupTogether,
} from "@/lib/chats/timeline";
import { isSyntheticShareBody, showsTextBubble } from "@/lib/chats/share";
import type { ChatMessage } from "@/lib/types";

function msg(
  id: string,
  senderId: string,
  createdAt: number,
): ChatMessage {
  return {
    id,
    chatId: "c1",
    body: "hi",
    senderId,
    senderName: senderId,
    createdAt,
  };
}

describe("chat timeline", () => {
  it("groups consecutive messages from the same sender", () => {
    const t0 = Date.parse("2026-08-14T12:00:00Z");
    const a = msg("1", "a", t0);
    const b = msg("2", "a", t0 + 30_000);
    expect(messagesGroupTogether(a, b)).toBe(true);
    const items = buildChatTimelineOldestFirst({
      oldestFirst: [a, b],
      viewerUid: "me",
      isGroup: true,
    });
    const messages = items.filter((i) => i.kind === "message");
    expect(messages[0]?.groupedWithNewer).toBe(true);
    expect(messages[1]?.groupedWithOlder).toBe(true);
    expect(messages[1]?.showSenderName).toBe(false);
  });

  it("inserts an unread divider before the unread batch", () => {
    const t0 = Date.parse("2026-08-14T12:00:00Z");
    const items = buildChatTimelineOldestFirst({
      oldestFirst: [
        msg("1", "a", t0),
        msg("2", "a", t0 + 60_000),
        msg("3", "a", t0 + 120_000),
      ],
      viewerUid: "me",
      isGroup: false,
      unreadCount: 2,
    });
    const kinds = items.map((i) => i.kind);
    expect(kinds).toContain("unread");
    expect(kinds.indexOf("unread")).toBeLessThan(
      kinds.lastIndexOf("message"),
    );
  });

  it("hashes names to a stable hue", () => {
    expect(chatHueFromName("Ana")).toBe(chatHueFromName("Ana"));
    expect(chatHueFromName("Ana")).not.toBe(chatHueFromName("Carlos"));
  });
});

describe("shared post body", () => {
  it("treats Pregunta/Question previews as synthetic", () => {
    const post = { title: "NPN" };
    expect(
      isSyntheticShareBody({ body: "Pregunta: NPN", sharedPost: post }),
    ).toBe(true);
    expect(
      isSyntheticShareBody({ body: "Question: NPN", sharedPost: post }),
    ).toBe(true);
    expect(
      showsTextBubble({ body: "Look at this", sharedPost: post }),
    ).toBe(true);
  });
});
