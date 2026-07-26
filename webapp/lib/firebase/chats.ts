import {
  get,
  onValue,
  push,
  ref,
  remove,
  set,
  update,
  query,
  orderByChild,
  limitToLast,
  type Unsubscribe,
} from "firebase/database";
import { getFirebaseRtdb } from "./client";
import { callCloudFunction } from "./call-function";
import type {
  ChatConversation,
  ChatMessage,
  SharedPostPreview,
  UserProfile,
} from "../types";
import { SUPPORT_AI_UID } from "../types";
import {
  dmKeyFor,
  headlineName,
  supportChatIdFor,
  canCreateChatGroups,
} from "../roles";
import { postSupportAiMessage } from "./functions";

function asMap(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  return raw as Record<string, unknown>;
}

function boolMap(raw: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(asMap(raw))) {
    if (v === true) out[k] = true;
  }
  return out;
}

function numberMap(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(asMap(raw))) {
    out[k] = Number(v ?? 0);
  }
  return out;
}

function stringMap(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(asMap(raw))) {
    out[k] = String(v ?? "");
  }
  return out;
}

export function chatFrom(id: string, data: Record<string, unknown>): ChatConversation {
  const members = boolMap(data.members);
  return {
    id,
    memberIds: Object.keys(members).sort(),
    memberNames: stringMap(data.memberNames),
    isGroup: Boolean(data.isGroup),
    title: (data.title as string) ?? null,
    dmKey: (data.dmKey as string) ?? null,
    lastMessage: String(data.lastMessage ?? ""),
    lastMessageAt: Number(data.lastMessageAt ?? 0),
    lastMessageSenderId: (data.lastMessageSenderId as string) ?? null,
    unreadCounts: numberMap(data.unreadCounts),
    pinnedBy: boolMap(data.pinnedBy),
    createdAt: Number(data.createdAt ?? 0),
    createdBy: String(data.createdBy ?? ""),
    isDefaultAgentGroup: Boolean(data.isDefaultAgentGroup),
    isSupportChat: Boolean(data.isSupportChat),
  };
}

function messageFrom(
  chatId: string,
  id: string,
  data: Record<string, unknown>,
): ChatMessage {
  const shared = data.sharedPost
    ? (asMap(data.sharedPost) as unknown as SharedPostPreview)
    : null;
  return {
    id,
    chatId,
    body: String(data.body ?? ""),
    senderId: String(data.senderId ?? ""),
    senderName: String(data.senderName ?? ""),
    createdAt: Number(data.createdAt ?? 0),
    sharedPost: shared,
    isAi: Boolean(data.isAi),
    reactions: stringMap(data.reactions),
  };
}

function chatToRtdb(chat: ChatConversation) {
  return {
    members: Object.fromEntries(chat.memberIds.map((id) => [id, true])),
    memberNames: chat.memberNames,
    isGroup: chat.isGroup,
    title: chat.title,
    dmKey: chat.dmKey,
    lastMessage: chat.lastMessage,
    lastMessageAt: chat.lastMessageAt,
    lastMessageSenderId: chat.lastMessageSenderId,
    unreadCounts: chat.unreadCounts,
    pinnedBy: Object.fromEntries(
      Object.entries(chat.pinnedBy).filter(([, v]) => v),
    ),
    createdAt: chat.createdAt,
    createdBy: chat.createdBy,
    isDefaultAgentGroup: chat.isDefaultAgentGroup,
    isSupportChat: chat.isSupportChat,
  };
}

export function watchInbox(
  uid: string,
  onChange: (chats: ChatConversation[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseRtdb();
  void callCloudFunction("rebuildChatInbox", {}).catch(() => {
    // Legacy rows still refresh on the next chat update.
  });
  // Legacy index rows (only `lastMessageAt`) predate syncChatInbox; their
  // chat meta is soft-read once and refreshed when a newer message lands.
  const legacyMeta = new Map<string, Record<string, unknown>>();
  let epoch = 0;
  return onValue(
    ref(db, `userChats/${uid}`),
    (snap) => {
      const token = ++epoch;
      const raw = asMap(snap.val());
      const isLegacy = (index: Record<string, unknown>) =>
        !Array.isArray(index.memberIds);
      const build = () =>
        Object.entries(raw)
          .map(([chatId, indexRaw]) => {
            const index = asMap(indexRaw);
            if (isLegacy(index)) {
              const meta = legacyMeta.get(chatId);
              if (!meta) {
                return chatFrom(chatId, {
                  lastMessageAt: index.lastMessageAt,
                  pinnedBy: { [uid]: index.pinned === true },
                });
              }
              const chat = chatFrom(chatId, meta);
              if (typeof index.pinned === "boolean") {
                chat.pinnedBy = { ...chat.pinnedBy, [uid]: index.pinned };
              }
              return chat;
            }
            const memberIds = (index.memberIds as unknown[]).map(String);
            return chatFrom(chatId, {
              ...index,
              members: Object.fromEntries(memberIds.map((id) => [id, true])),
              unreadCounts: { [uid]: Number(index.unreadCount ?? 0) },
              pinnedBy: { [uid]: index.pinned === true },
            });
          })
          .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
      onChange(build());

      const stale = Object.entries(raw)
        .filter(([chatId, indexRaw]) => {
          const index = asMap(indexRaw);
          if (!isLegacy(index)) return false;
          const cached = legacyMeta.get(chatId);
          return (
            !cached ||
            Number(index.lastMessageAt ?? 0) >
              Number(cached.lastMessageAt ?? 0)
          );
        })
        .map(([chatId]) => chatId);
      if (!stale.length) return;
      void Promise.all(
        stale.map(async (chatId) => {
          const chatSnap = await get(ref(db, `chats/${chatId}`));
          if (chatSnap.exists()) legacyMeta.set(chatId, asMap(chatSnap.val()));
        }),
      )
        .then(() => {
          if (token === epoch) onChange(build());
        })
        .catch(() => {
          // Names stay blank for rows we could not read; nothing to surface.
        });
    },
    (error) => onError?.(error),
  );
}

export function watchChat(
  chatId: string,
  onChange: (chat: ChatConversation | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onValue(
    ref(getFirebaseRtdb(), `chats/${chatId}`),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(chatFrom(chatId, asMap(snap.val())));
    },
    (error) => onError?.(error),
  );
}

export function watchMessages(
  chatId: string,
  onChange: (messages: ChatMessage[]) => void,
  pageSize = 40,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    ref(getFirebaseRtdb(), `messages/${chatId}`),
    orderByChild("createdAt"),
    limitToLast(pageSize),
  );
  return onValue(
    q,
    (snap) => {
      const raw = asMap(snap.val());
      const list = Object.entries(raw).map(([id, value]) =>
        messageFrom(chatId, id, asMap(value)),
      );
      list.sort((a, b) => a.createdAt - b.createdAt);
      onChange(list);
    },
    (error) => onError?.(error),
  );
}

async function createChat(chat: ChatConversation): Promise<ChatConversation> {
  const db = getFirebaseRtdb();
  const id =
    chat.id ||
    push(ref(db, "chats")).key ||
    `${Date.now()}`;
  const saved = { ...chat, id };
  const updates: Record<string, unknown> = {
    [`chats/${id}`]: chatToRtdb(saved),
  };
  updates[`userChats/${saved.createdBy}/${id}`] = {
    lastMessageAt: saved.lastMessageAt,
  };
  await update(ref(db), updates);
  return saved;
}

export async function getOrCreateDm(me: UserProfile, other: UserProfile) {
  if (me.uid === other.uid) throw new Error("Cannot chat with yourself");
  const key = dmKeyFor(me.uid, other.uid);
  const db = getFirebaseRtdb();
  const byId = await get(ref(db, `chats/${key}`));
  if (byId.exists()) return chatFrom(key, asMap(byId.val()));
  const index = await get(ref(db, `dmIndex/${key}`));
  if (index.exists()) {
    const id = String(index.val());
    const snap = await get(ref(db, `chats/${id}`));
    if (snap.exists()) return chatFrom(id, asMap(snap.val()));
  }
  const now = Date.now();
  return createChat({
    id: key,
    memberIds: [me.uid, other.uid].sort(),
    memberNames: {
      [me.uid]: headlineName(me),
      [other.uid]: headlineName(other),
    },
    isGroup: false,
    title: null,
    dmKey: key,
    lastMessage: "",
    lastMessageAt: now,
    lastMessageSenderId: null,
    unreadCounts: { [me.uid]: 0, [other.uid]: 0 },
    pinnedBy: {},
    createdAt: now,
    createdBy: me.uid,
    isDefaultAgentGroup: false,
    isSupportChat: false,
  });
}

export async function createGroupChat(input: {
  creator: UserProfile;
  title: string;
  members: UserProfile[];
}) {
  if (!canCreateChatGroups(input.creator.role)) {
    throw new Error("Not allowed to create groups");
  }
  const title = input.title.trim();
  if (!title) throw new Error("Group name required");
  const seen = new Set([input.creator.uid]);
  const others = input.members.filter((m) => seen.add(m.uid));
  if (!others.length) throw new Error("Pick at least one member");
  const all = [input.creator, ...others];
  if (all.length > 20) throw new Error("Max 20 members");
  const result = await callCloudFunction<{ chatId?: string }>(
    "createGroupChat",
    { title, memberIds: all.map((profile) => profile.uid) },
  );
  const chatId = String(result?.chatId ?? "");
  const snap = await get(ref(getFirebaseRtdb(), `chats/${chatId}`));
  if (!snap.exists()) throw new Error("Group creation failed");
  return chatFrom(chatId, asMap(snap.val()));
}

async function ensureUserChatIndex(
  uid: string,
  chatId: string,
  lastMessageAt: number,
) {
  await update(ref(getFirebaseRtdb()), {
    [`userChats/${uid}/${chatId}/lastMessageAt`]: lastMessageAt,
  });
}

export async function getOrCreateSupportChat(
  me: UserProfile,
  aiName: string,
  welcomeMessage?: string,
) {
  const id = supportChatIdFor(me.uid);
  const db = getFirebaseRtdb();

  // Prefer chats/$id: the inbox row can be missing (hidden/cleared) while the
  // support thread still exists — recreating is denied by create-only rules.
  const existing = await get(ref(db, `chats/${id}`));
  if (existing.exists()) {
    const chat = chatFrom(id, asMap(existing.val()));
    await ensureUserChatIndex(me.uid, id, chat.lastMessageAt);
    return chat;
  }

  const now = Date.now();
  const chat = await createChat({
    id,
    memberIds: [me.uid, SUPPORT_AI_UID].sort(),
    memberNames: {
      [me.uid]: headlineName(me),
      [SUPPORT_AI_UID]: aiName,
    },
    isGroup: true,
    title: "Support",
    dmKey: null,
    lastMessage: "",
    lastMessageAt: now,
    lastMessageSenderId: null,
    unreadCounts: { [me.uid]: 0, [SUPPORT_AI_UID]: 0 },
    pinnedBy: {},
    createdAt: now,
    createdBy: me.uid,
    isDefaultAgentGroup: false,
    isSupportChat: true,
  });
  if (welcomeMessage?.trim()) {
    await postSupportAiMessage({
      chatId: chat.id,
      body: welcomeMessage.trim(),
      senderName: aiName,
    });
  }
  return chat;
}

export async function sendMessage(input: {
  chatId: string;
  body: string;
  author: UserProfile;
  sharedPost?: SharedPostPreview | null;
  isAi?: boolean;
}) {
  const text = input.body.trim();
  if (!text && !input.sharedPost) throw new Error("Empty message");
  const db = getFirebaseRtdb();
  const chatSnap = await get(ref(db, `chats/${input.chatId}`));
  if (!chatSnap.exists()) throw new Error("Chat gone");
  const chat = chatFrom(input.chatId, asMap(chatSnap.val()));
  const now = Date.now();
  const msgRef = push(ref(db, `messages/${input.chatId}`));
  const message: ChatMessage = {
    id: msgRef.key!,
    chatId: input.chatId,
    body: text,
    senderId: input.author.uid,
    senderName: headlineName(input.author),
    createdAt: now,
    sharedPost: input.sharedPost ?? null,
    isAi: input.isAi ?? false,
    reactions: {},
  };
  await set(msgRef, {
    body: message.body,
    senderId: message.senderId,
    senderName: message.senderName,
    createdAt: now,
    sharedPost: message.sharedPost ?? null,
    isAi: message.isAi ?? false,
  });

  const nextUnread = { ...chat.unreadCounts };
  for (const memberId of chat.memberIds) {
    nextUnread[memberId] =
      memberId === input.author.uid ? 0 : (nextUnread[memberId] ?? 0) + 1;
  }
  const preview = input.sharedPost
    ? `Question: ${input.sharedPost.title}`
    : text;
  const updates: Record<string, unknown> = {
    [`chats/${input.chatId}/lastMessage`]: preview,
    [`chats/${input.chatId}/lastMessageAt`]: now,
    [`chats/${input.chatId}/lastMessageSenderId`]: input.author.uid,
    [`chats/${input.chatId}/unreadCounts`]: nextUnread,
  };
  await update(ref(db), updates);
  return message;
}

export async function markChatRead(chatId: string, uid: string) {
  const db = getFirebaseRtdb();
  await update(ref(db), {
    [`chats/${chatId}/unreadCounts/${uid}`]: 0,
  });
}

export async function setPinned(chatId: string, uid: string, pinned: boolean) {
  const db = getFirebaseRtdb();
  const updates: Record<string, unknown> = {
    [`userChats/${uid}/${chatId}/pinned`]: pinned,
  };
  if (pinned) {
    updates[`chats/${chatId}/pinnedBy/${uid}`] = true;
  } else {
    updates[`chats/${chatId}/pinnedBy/${uid}`] = null;
  }
  await update(ref(db), updates);
}

export async function hideChatForMe(chatId: string, uid: string) {
  if (chatId === supportChatIdFor(uid) || chatId.startsWith("support_")) {
    throw new Error("Support chat cannot be hidden.");
  }
  const chatSnap = await get(ref(getFirebaseRtdb(), `chats/${chatId}`));
  if (chatSnap.exists()) {
    const chat = chatFrom(chatId, asMap(chatSnap.val()));
    if (chat.isSupportChat || chat.isDefaultAgentGroup) {
      throw new Error("This chat cannot be hidden.");
    }
  }
  await remove(ref(getFirebaseRtdb(), `userChats/${uid}/${chatId}`));
}

export async function setReaction(input: {
  chatId: string;
  messageId: string;
  uid: string;
  emoji: string | null;
}) {
  const path = `messages/${input.chatId}/${input.messageId}/reactions/${input.uid}`;
  if (input.emoji) {
    await set(ref(getFirebaseRtdb(), path), input.emoji);
  } else {
    await remove(ref(getFirebaseRtdb(), path));
  }
}

export function chatTitleFor(
  chat: ChatConversation,
  viewerUid: string,
  labels: { support: string; team: string },
) {
  if (chat.isSupportChat) return chat.title?.trim() || labels.support;
  if (chat.isDefaultAgentGroup) return chat.title?.trim() || labels.team;
  if (chat.isGroup && chat.title?.trim()) return chat.title.trim();
  const other = chat.memberIds.find((id) => id !== viewerUid);
  if (other) return chat.memberNames[other] || other;
  return chat.title || "Chat";
}
