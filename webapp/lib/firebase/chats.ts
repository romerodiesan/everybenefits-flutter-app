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
import { AGENTS_DEFAULT_ID, SUPPORT_AI_UID } from "../types";
import {
  dmKeyFor,
  headlineName,
  supportChatIdFor,
  canCreateChatGroups,
  canAccessSupport,
} from "../roles";
import { postSupportAiMessage } from "./functions";

const REBUILD_SESSION_KEY = "pulse:rebuild-inbox-once";

function raceTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Fire rebuildChatInbox at most once per browser tab session. */
function maybeRebuildInbox() {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(REBUILD_SESSION_KEY)) return;
    sessionStorage.setItem(REBUILD_SESSION_KEY, "1");
  } catch {
    // Private mode — still attempt once via in-memory guard below.
  }
  void callCloudFunction("rebuildChatInbox", {}).catch(() => {
    // Legacy rows still refresh on the next chat update.
  });
}

let rebuildAttempted = false;
function maybeRebuildInboxGuarded() {
  if (rebuildAttempted) return;
  rebuildAttempted = true;
  maybeRebuildInbox();
}

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
  const isSupportChat =
    Boolean(data.isSupportChat) || id.startsWith("support_");
  const isDefaultAgentGroup =
    Boolean(data.isDefaultAgentGroup) || id === AGENTS_DEFAULT_ID;
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
    isDefaultAgentGroup,
    isSupportChat,
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
    memberCount: chat.memberIds.length,
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
  maybeRebuildInboxGuarded();
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
          try {
            const chatSnap = await raceTimeout(
              get(ref(db, `chats/${chatId}`)),
              8_000,
              "Chat lookup timed out",
            );
            if (chatSnap.exists()) legacyMeta.set(chatId, asMap(chatSnap.val()));
          } catch {
            // Skip this legacy row; blank title is better than hanging.
          }
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
  const rtdbChat = chatToRtdb(saved);
  // Creator inbox only — RTDB rules deny writing other users' indexes.
  // syncChatInbox backfills everyone else after the chat write.
  const updates: Record<string, unknown> = {
    [`chats/${id}`]: rtdbChat,
    [`userChats/${saved.createdBy}/${id}`]: {
      chatId: id,
      memberIds: saved.memberIds.filter((uid) => uid !== SUPPORT_AI_UID),
      memberNames: saved.memberNames,
      isGroup: saved.isGroup,
      title: saved.title,
      dmKey: saved.dmKey,
      lastMessage: saved.lastMessage,
      lastMessageAt: saved.lastMessageAt,
      lastMessageSenderId: saved.lastMessageSenderId,
      unreadCount: 0,
      pinned: false,
      createdAt: saved.createdAt,
      createdBy: saved.createdBy,
      isDefaultAgentGroup: saved.isDefaultAgentGroup,
      isSupportChat: saved.isSupportChat,
    },
  };
  await update(ref(db), updates);
  return saved;
}

export async function getOrCreateDm(me: UserProfile, other: UserProfile) {
  if (me.uid === other.uid) throw new Error("Cannot chat with yourself");
  const key = dmKeyFor(me.uid, other.uid);
  const db = getFirebaseRtdb();
  const byId = await raceTimeout(
    get(ref(db, `chats/${key}`)),
    8_000,
    "Chat lookup timed out",
  );
  if (byId.exists()) return chatFrom(key, asMap(byId.val()));
  const index = await raceTimeout(
    get(ref(db, `dmIndex/${key}`)),
    8_000,
    "Chat lookup timed out",
  );
  if (index.exists()) {
    const id = String(index.val());
    const snap = await raceTimeout(
      get(ref(db, `chats/${id}`)),
      8_000,
      "Chat lookup timed out",
    );
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
  const others: UserProfile[] = [];
  for (const member of input.members) {
    if (seen.has(member.uid)) continue;
    seen.add(member.uid);
    others.push(member);
  }
  if (!others.length) throw new Error("Pick at least one member");
  const all = [input.creator, ...others];
  if (all.length > 20) throw new Error("Max 20 members");
  const memberIds = all.map((profile) => profile.uid);
  const result = await callCloudFunction<{
    chatId?: string;
    createdAt?: number;
  }>("createGroupChat", { title, memberIds }, { timeoutMs: 20_000 });
  const chatId = String(result?.chatId ?? "").trim();
  if (!chatId) throw new Error("Group creation failed");
  const createdAt = Number(result?.createdAt ?? Date.now());
  // Do not await an RTDB read here — a stuck client connection hangs the UI
  // forever even after the callable succeeds. Reconstruct from the request.
  return {
    id: chatId,
    memberIds: [...memberIds].sort(),
    memberNames: Object.fromEntries(
      all.map((profile) => [profile.uid, headlineName(profile)]),
    ),
    isGroup: true,
    title,
    dmKey: null,
    lastMessage: "",
    lastMessageAt: createdAt,
    lastMessageSenderId: null,
    unreadCounts: Object.fromEntries(memberIds.map((id) => [id, 0])),
    pinnedBy: {},
    createdAt,
    createdBy: input.creator.uid,
    isDefaultAgentGroup: false,
    isSupportChat: false,
  };
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
  if (!canAccessSupport(me.role, me.isAnonymous)) {
    throw new Error("Support is not available for this account");
  }
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
  /** When RTDB get hangs, use this membership snapshot to still write. */
  knownChat?: ChatConversation | null;
}) {
  const text = input.body.trim();
  if (!text && !input.sharedPost) throw new Error("Empty message");
  const db = getFirebaseRtdb();
  let chat = input.knownChat?.id === input.chatId ? input.knownChat : null;
  try {
    const chatSnap = await raceTimeout(
      get(ref(db, `chats/${input.chatId}`)),
      8_000,
      "Chat lookup timed out",
    );
    if (chatSnap.exists()) {
      chat = chatFrom(input.chatId, asMap(chatSnap.val()));
    }
  } catch {
    // Fall through to knownChat.
  }
  if (!chat) throw new Error("Chat gone");
  if (!chat.memberIds.includes(input.author.uid)) {
    throw new Error("Not a chat member");
  }
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
  await raceTimeout(
    set(msgRef, {
      body: message.body,
      senderId: message.senderId,
      senderName: message.senderName,
      createdAt: now,
      sharedPost: message.sharedPost ?? null,
      isAi: message.isAi ?? false,
    }),
    12_000,
    "Send timed out",
  );

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
  await raceTimeout(update(ref(db), updates), 12_000, "Send timed out");
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

/** Inbox buckets matching Flutter: support → community → pinned → recent. */
export type ChatInboxSections = {
  support: ChatConversation[];
  community: ChatConversation[];
  pinned: ChatConversation[];
  recent: ChatConversation[];
};

export function partitionChatInbox(
  chats: ChatConversation[],
  viewerUid: string,
): ChatInboxSections {
  const support: ChatConversation[] = [];
  const community: ChatConversation[] = [];
  const pinned: ChatConversation[] = [];
  const recent: ChatConversation[] = [];
  for (const chat of chats) {
    if (chat.isSupportChat) {
      support.push(chat);
    } else if (chat.isDefaultAgentGroup) {
      community.push(chat);
    } else if (chat.pinnedBy[viewerUid]) {
      pinned.push(chat);
    } else {
      recent.push(chat);
    }
  }
  return { support, community, pinned, recent };
}
