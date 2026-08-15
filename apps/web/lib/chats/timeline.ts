import type { ChatMessage } from "../types";

export type ChatTimelineKind = "message" | "day" | "unread";

export const CHAT_GROUP_WINDOW_MS = 2 * 60 * 1000;

export type ChatTimelineItem =
  | {
      kind: "message";
      message: ChatMessage;
      groupedWithOlder: boolean;
      groupedWithNewer: boolean;
      showSenderName: boolean;
      showTime: boolean;
    }
  | { kind: "day"; day: number }
  | { kind: "unread" };

export function chatDayKey(at: number) {
  const local = new Date(at);
  return Date.UTC(local.getFullYear(), local.getMonth(), local.getDate());
}

export function messagesGroupTogether(a: ChatMessage, b: ChatMessage) {
  if (a.senderId !== b.senderId) return false;
  if (chatDayKey(a.createdAt) !== chatDayKey(b.createdAt)) return false;
  return Math.abs(a.createdAt - b.createdAt) <= CHAT_GROUP_WINDOW_MS;
}

/** Oldest → newest visual order (web scrolls naturally, not reverse). */
export function buildChatTimelineOldestFirst({
  oldestFirst,
  viewerUid,
  isGroup,
  unreadCount = 0,
}: {
  oldestFirst: ChatMessage[];
  viewerUid: string;
  isGroup: boolean;
  unreadCount?: number;
}): ChatTimelineItem[] {
  const items: ChatTimelineItem[] = [];
  const unreadStart =
    unreadCount > 0 ? Math.max(0, oldestFirst.length - unreadCount) : -1;

  for (let i = 0; i < oldestFirst.length; i++) {
    const msg = oldestFirst[i]!;
    const older = i > 0 ? oldestFirst[i - 1] : null;
    const newer = i + 1 < oldestFirst.length ? oldestFirst[i + 1] : null;
    const startsDay =
      !older || chatDayKey(msg.createdAt) !== chatDayKey(older.createdAt);
    if (startsDay) {
      items.push({ kind: "day", day: chatDayKey(msg.createdAt) });
    }
    if (i === unreadStart) {
      items.push({ kind: "unread" });
    }
    const groupedWithOlder = Boolean(older && messagesGroupTogether(msg, older));
    const groupedWithNewer = Boolean(newer && messagesGroupTogether(msg, newer));
    const mine = msg.senderId === viewerUid;
    items.push({
      kind: "message",
      message: msg,
      groupedWithOlder,
      groupedWithNewer,
      showSenderName:
        isGroup &&
        !mine &&
        !groupedWithOlder &&
        msg.senderName.trim().length > 0,
      showTime: !groupedWithNewer,
    });
  }
  return items;
}

export function replyPreviewOf(message: ChatMessage, max = 140) {
  const title = message.sharedPost?.title?.trim();
  const source = title || message.body.trim();
  if (source.length <= max) return source;
  return `${source.slice(0, max)}…`;
}

export function chatHueFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0x7fffffff;
  }
  return hash % 360;
}

export function chatTintStyle(name: string, dark: boolean) {
  const hue = chatHueFromName(name);
  const lightness = dark ? 42 : 62;
  return {
    background: `hsla(${hue}, 48%, ${lightness}%, 0.28)`,
    color: dark ? "#F4F3F0" : "#0C0D10",
  };
}

export function formatChatClock(at: number) {
  const d = new Date(at);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}
