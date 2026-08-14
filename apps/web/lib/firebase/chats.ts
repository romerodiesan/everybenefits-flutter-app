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
  UserRole,
} from "../types";
import { AGENTS_DEFAULT_ID } from "../types";
import { dmKeyFor } from "../chat-ids";
import { headlineName } from "../display-name";
import {
  parseRole,
  canCreateChatGroups,
} from "../roles";

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
  const isDefaultAgentGroup =
    Boolean(data.isDefaultAgentGroup) || id === AGENTS_DEFAULT_ID;
  const autoJoinRaw = asMap(data.autoJoinRoles);
  const autoJoinRoles = Object.keys(autoJoinRaw)
    .filter((role) => autoJoinRaw[role] === true)
    .map((role) => parseRole(role));
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
    autoJoinRoles,
    dmMessagingEnabled:
      Boolean(data.isGroup) || data.dmMessagingEnabled === true,
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
    reactions: stringMap(data.reactions),
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

export async function getOrCreateDm(me: UserProfile, other: UserProfile) {
  if (me.uid === other.uid) throw new Error("Cannot chat with yourself");
  if (me.isAnonymous || other.isAnonymous) {
    throw new Error("Anonymous users cannot DM");
  }

  const key = dmKeyFor(me.uid, other.uid);
  const db = getFirebaseRtdb();
  const byId = await raceTimeout(
    get(ref(db, `chats/${key}`)),
    8_000,
    "Chat lookup timed out",
  );
  if (byId.exists()) return chatFrom(key, asMap(byId.val()));

  const result = await callCloudFunction<{
    chatId?: string;
    createdAt?: number;
    existing?: boolean;
    memberIds?: string[];
    memberNames?: Record<string, string>;
  }>("createDm", { otherUid: other.uid }, { timeoutMs: 45_000 });

  const chatId = String(result?.chatId ?? key).trim() || key;
  const createdAt = Number(result?.createdAt ?? Date.now());
  const memberIds = (result?.memberIds ?? [me.uid, other.uid]).map(String);
  const memberNames = result?.memberNames ?? {
    [me.uid]: headlineName(me),
    [other.uid]: headlineName(other),
  };

  return {
    id: chatId,
    memberIds: [...memberIds].sort(),
    memberNames,
    isGroup: false,
    title: null,
    dmKey: key,
    lastMessage: "",
    lastMessageAt: createdAt,
    lastMessageSenderId: null,
    unreadCounts: Object.fromEntries(memberIds.map((id) => [id, 0])),
    pinnedBy: {},
    createdAt,
    createdBy: me.uid,
    isDefaultAgentGroup: false,
    autoJoinRoles: [],
    dmMessagingEnabled: true,
  } satisfies ChatConversation;
}

export async function createGroupChat(input: {
  creator: UserProfile;
  title: string;
  members: UserProfile[];
  seedRoles?: UserRole[];
  autoJoin?: boolean;
}) {
  if (!canCreateChatGroups(input.creator.role)) {
    throw new Error("Not allowed to create groups");
  }
  const title = input.title.trim();
  if (!title) throw new Error("Group name required");
  const seedRoles = [...new Set(input.seedRoles ?? [])];
  const seen = new Set([input.creator.uid]);
  const others: UserProfile[] = [];
  for (const member of input.members) {
    if (seen.has(member.uid)) continue;
    seen.add(member.uid);
    others.push(member);
  }
  if (!others.length && !seedRoles.length) {
    throw new Error("Pick at least one member or role");
  }
  const all = [input.creator, ...others];
  const memberIds = all.map((profile) => profile.uid);
  const result = await callCloudFunction<{
    chatId?: string;
    createdAt?: number;
    memberCount?: number;
    truncated?: boolean;
    autoJoinRoles?: string[];
  }>(
    "createGroupChat",
    {
      title,
      memberIds,
      seedRoles,
      autoJoin: input.autoJoin === true,
    },
    { timeoutMs: 45_000 },
  );
  const chatId = String(result?.chatId ?? "").trim();
  if (!chatId) throw new Error("Group creation failed");
  const createdAt = Number(result?.createdAt ?? Date.now());
  const autoJoinRoles = (result?.autoJoinRoles ?? []).map((role) =>
    parseRole(role),
  );
  // Do not await an RTDB read here — a stuck client connection hangs the UI
  // forever even after the callable succeeds. Reconstruct from the request.
  const chat: ChatConversation & { truncated?: boolean } = {
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
    autoJoinRoles,
    dmMessagingEnabled: true,
  };
  if (result?.truncated === true) chat.truncated = true;
  return chat;
}

export async function sendMessage(input: {
  chatId: string;
  body: string;
  author: UserProfile;
  sharedPost?: SharedPostPreview | null;
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
  const preview = input.sharedPost
    ? `Question: ${input.sharedPost.title}`
    : text;
  // RTDB rules require non-empty body; shared-post-only uses the preview.
  const bodyForStore = text || preview;
  const msgRef = push(ref(db, `messages/${input.chatId}`));
  const message: ChatMessage = {
    id: msgRef.key!,
    chatId: input.chatId,
    body: bodyForStore,
    senderId: input.author.uid,
    senderName: headlineName(input.author),
    createdAt: now,
    sharedPost: input.sharedPost ?? null,
    reactions: {},
  };
  await raceTimeout(
    set(msgRef, {
      body: message.body,
      senderId: message.senderId,
      senderName: message.senderName,
      createdAt: now,
      sharedPost: message.sharedPost ?? null,
    }),
    12_000,
    "Send timed out",
  );
  // lastMessage / unreadCounts are applied server-side by syncChatMetadataOnMessage.
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
  const chatSnap = await get(ref(getFirebaseRtdb(), `chats/${chatId}`));
  if (chatSnap.exists()) {
    const chat = chatFrom(chatId, asMap(chatSnap.val()));
    if (chat.isDefaultAgentGroup) {
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
  labels: { team: string },
) {
  if (chat.isDefaultAgentGroup) return chat.title?.trim() || labels.team;
  if (chat.isGroup && chat.title?.trim()) return chat.title.trim();
  const other = chat.memberIds.find((id) => id !== viewerUid);
  if (other) return chat.memberNames[other] || other;
  return chat.title || "Chat";
}

/** Inbox buckets matching Flutter: community → pinned → recent. */
export type ChatInboxSections = {
  community: ChatConversation[];
  pinned: ChatConversation[];
  recent: ChatConversation[];
};

export function partitionChatInbox(
  chats: ChatConversation[],
  viewerUid: string,
): ChatInboxSections {
  const community: ChatConversation[] = [];
  const pinned: ChatConversation[] = [];
  const recent: ChatConversation[] = [];
  for (const chat of chats) {
    if (chat.isDefaultAgentGroup) {
      community.push(chat);
    } else if (chat.pinnedBy[viewerUid]) {
      pinned.push(chat);
    } else {
      recent.push(chat);
    }
  }
  return { community, pinned, recent };
}
