import { onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onValueCreated, onValueWritten } from "firebase-functions/v2/database";
import { HttpsError } from "firebase-functions/v2/https";
import type { DocumentData } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import {
  GROUP_SEED_ROLES,
  canConfigureGroupAutoJoin,
  canCreateChatGroups,
  parseRole,
  parseUsername,
  parseMentions,
  type UserRole,
} from "@pulse/shared";
import { db, rtdb, callableOpts, storageBucket } from "./init";
import {
  DEFAULT_AGENT_GROUP_ID,
  MAX_GROUP_MEMBERS,
  MAX_ROLE_SEED_MEMBERS,
} from "./constants";
import {
  headlineName,
  isUserApprovedForJoin,
} from "./auth";
import {
  canOpenDirectMessage,
  canResumeDirectMessage,
} from "./chat-access";
import { actorHasPermission, requireActor, requireCaller } from "./guards";
import { canClearChatThread } from "./chat-moderation";
import { loadPermissionsForRole } from "./permissions";
import { notifyUser } from "./notifications";
import {
  areMutualContacts,
  isBlockedEitherWay,
  isMutedBy,
} from "./social";

function asObj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object"
    ? { ...(raw as Record<string, unknown>) }
    : {};
}

function photoOf(data: DocumentData | undefined): string {
  return typeof data?.photoUrl === "string" ? data.photoUrl.trim() : "";
}

function claimedUsernameOf(data: DocumentData | undefined): string {
  const parsed = parseUsername(data?.username);
  return parsed.ok ? parsed.value : "";
}

function compactStrings(
  entries: Array<[string, string]>,
): Record<string, string> {
  return Object.fromEntries(entries.filter(([, value]) => value));
}

async function canProfileUseChats(
  data: DocumentData | undefined,
  permissionsByRole = new Map<string, string[]>(),
): Promise<boolean> {
  if (!isUserApprovedForJoin(data)) return false;
  const role = String(data?.role ?? "student");
  let permissions = permissionsByRole.get(role);
  if (!permissions) {
    permissions = await loadPermissionsForRole(role);
    permissionsByRole.set(role, permissions);
  }
  return actorHasPermission(permissions, "chats.participate");
}

function chatIdFrom(request: { data?: unknown }): string {
  const raw =
    request.data && typeof request.data === "object"
      ? (request.data as Record<string, unknown>).chatId
      : undefined;
  const chatId = String(raw ?? "").trim();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(chatId)) {
    throw new HttpsError("invalid-argument", "Valid chat required.");
  }
  return chatId;
}

const GROUP_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function refreshChatSummary(chatId: string): Promise<void> {
  const latest = await rtdb
    .ref(`messages/${chatId}`)
    .orderByChild("createdAt")
    .limitToLast(1)
    .get();
  const values = (latest.val() ?? {}) as Record<string, Record<string, unknown>>;
  const message = Object.values(values)[0];
  const chatRef = rtdb.ref(`chats/${chatId}`);
  const chatSnap = await chatRef.get();
  if (!chatSnap.exists()) return;
  if (!message) {
    const chat = (chatSnap.val() ?? {}) as Record<string, unknown>;
    const members = Object.keys((chat.members ?? {}) as Record<string, unknown>);
    await chatRef.update({
      lastMessage: "",
      lastMessageAt: Number(chat.createdAt ?? Date.now()),
      lastMessageSenderId: null,
      unreadCounts: Object.fromEntries(members.map((uid) => [uid, 0])),
    });
    return;
  }
  await chatRef.update({
    lastMessage: String(message.body ?? "").slice(0, 4000),
    lastMessageAt: Number(message.createdAt ?? Date.now()),
    lastMessageSenderId: String(message.senderId ?? "") || null,
  });
}

function applyMemberIdentity(
  current: Record<string, unknown>,
  uid: string,
  displayName: string,
  photoUrl: string,
  username: string,
) {
  const memberNames = { ...asObj(current.memberNames), [uid]: displayName };
  const memberPhotos = { ...asObj(current.memberPhotos) };
  if (photoUrl) memberPhotos[uid] = photoUrl;
  const memberUsernames = { ...asObj(current.memberUsernames) };
  if (username) memberUsernames[uid] = username;
  return { memberNames, memberPhotos, memberUsernames };
}

/** Rewrites this member's name / photo / username inside their RTDB chats. */
export async function syncChatMemberIdentity(
  uid: string,
  fields: {
    name?: string;
    photoUrl?: string | null;
    username?: string | null;
  },
): Promise<void> {
  const index = await rtdb.ref(`userChats/${uid}`).get();
  const chatIds = Object.keys((index.val() ?? {}) as Record<string, unknown>);
  const updates: Record<string, unknown> = {};
  for (const chatId of chatIds.slice(0, 200)) {
    if (fields.name != null) {
      updates[`chats/${chatId}/memberNames/${uid}`] = fields.name;
    }
    if ("photoUrl" in fields) {
      updates[`chats/${chatId}/memberPhotos/${uid}`] = fields.photoUrl || null;
    }
    if ("username" in fields) {
      updates[`chats/${chatId}/memberUsernames/${uid}`] =
        fields.username || null;
    }
  }
  if (Object.keys(updates).length) await rtdb.ref().update(updates);
}

export function chatInboxRow(
  chatId: string,
  chat: Record<string, unknown>,
  uid: string,
) {
  const members = Object.keys((chat.members ?? {}) as Record<string, unknown>);
  const unreadCounts =
    (chat.unreadCounts ?? {}) as Record<string, unknown>;
  const pinnedBy = (chat.pinnedBy ?? {}) as Record<string, unknown>;
  const autoJoinRoles =
    (chat.autoJoinRoles ?? {}) as Record<string, unknown>;
  return {
    chatId,
    memberIds: members,
    memberNames: (chat.memberNames ?? {}) as Record<string, unknown>,
    memberPhotos: (chat.memberPhotos ?? {}) as Record<string, unknown>,
    memberUsernames: (chat.memberUsernames ?? {}) as Record<string, unknown>,
    isGroup: chat.isGroup === true,
    title: chat.title ?? null,
    dmKey: chat.dmKey ?? null,
    lastMessage: String(chat.lastMessage ?? "").slice(0, 4000),
    lastMessageAt: Number(chat.lastMessageAt ?? 0),
    lastMessageSenderId: chat.lastMessageSenderId ?? null,
    unreadCount: Number(unreadCounts[uid] ?? 0),
    pinned: pinnedBy[uid] === true,
    createdAt: Number(chat.createdAt ?? 0),
    createdBy: String(chat.createdBy ?? ""),
    isDefaultAgentGroup: chat.isDefaultAgentGroup === true,
    autoJoinRoles,
    photoUrl: typeof chat.photoUrl === "string" ? chat.photoUrl : null,
    dmMessagingEnabled:
      chat.isGroup === true || chat.dmMessagingEnabled === true,
  };
}

export async function addMemberToChat(
  chatId: string,
  uid: string,
  displayName: string,
) {
  const userSnap = await db.doc(`users/${uid}`).get();
  if (!(await canProfileUseChats(userSnap.data()))) return;
  const photoUrl = photoOf(userSnap.data());
  const username = claimedUsernameOf(userSnap.data());
  const chatRef = rtdb.ref(`chats/${chatId}`);
  let joinedChat: Record<string, unknown> | null = null;
  await chatRef.transaction((current) => {
    if (current === null || typeof current !== "object") {
      return; // abort — chat gone
    }
    const members =
      current.members && typeof current.members === "object"
        ? { ...current.members }
        : {};
    if (members[uid] === true) {
      joinedChat = current as Record<string, unknown>;
      return; // abort — already a member
    }
    members[uid] = true;
    const identity = applyMemberIdentity(
      current as Record<string, unknown>,
      uid,
      displayName,
      photoUrl,
      username,
    );
    const unreadCounts =
      current.unreadCounts && typeof current.unreadCounts === "object"
        ? { ...current.unreadCounts, [uid]: 0 }
        : { [uid]: 0 };
    joinedChat = {
      ...current,
      members,
      memberCount: Object.keys(members).length,
      ...identity,
      unreadCounts,
    };
    return joinedChat;
  });
  if (!joinedChat) {
    const snap = await chatRef.get();
    joinedChat = (snap.val() as Record<string, unknown> | null) ?? null;
  }
  if (joinedChat?.members &&
      (joinedChat.members as Record<string, unknown>)[uid] === true) {
    await rtdb
      .ref(`userChats/${uid}/${chatId}`)
      .set(chatInboxRow(chatId, joinedChat, uid));
  }
}

export async function ensureAutoJoinMemberships(
  uid: string,
  role: UserRole,
  approvalStatus: string,
  displayName: string,
  isAnonymous: boolean,
) {
  if (isAnonymous) return;
  if (approvalStatus !== "approved") return;
  const permissions = await loadPermissionsForRole(role);
  if (!actorHasPermission(permissions, "chats.participate")) return;
  if (actorHasPermission(permissions, "chats.groups.default.join")) {
    await addAgentToDefaultGroup(uid, displayName);
  }
  const indexSnap = await rtdb.ref(`autoJoinGroups/${role}`).get();
  const chatIds = Object.keys(
    (indexSnap.val() ?? {}) as Record<string, unknown>,
  ).filter((chatId) => chatId && chatId !== DEFAULT_AGENT_GROUP_ID);
  await Promise.all(
    chatIds.map((chatId) => addMemberToChat(chatId, uid, displayName)),
  );
}

export async function collectUsersByRoles(
  roles: UserRole[],
  cap: number,
): Promise<Map<string, DocumentData>> {
  const byUid = new Map<string, DocumentData>();
  if (!roles.length) return byUid;
  // Query per role (avoids composite index); filter approval in memory.
  await Promise.all(
    roles.map(async (role) => {
      const permissions = await loadPermissionsForRole(role);
      if (!actorHasPermission(permissions, "chats.participate")) return;
      const snap = await db
        .collection("users")
        .where("role", "==", role)
        .limit(cap)
        .get();
      for (const doc of snap.docs) {
        if (byUid.size >= cap) break;
        const data = doc.data();
        if (!isUserApprovedForJoin(data)) continue;
        if (data.isAnonymous === true) continue;
        byUid.set(doc.id, data);
      }
    }),
  );
  return byUid;
}

export async function addAgentToDefaultGroup(uid: string, displayName: string) {
  const userSnap = await db.doc(`users/${uid}`).get();
  const photoUrl = photoOf(userSnap.data());
  const username = claimedUsernameOf(userSnap.data());
  const chatRef = rtdb.ref(`chats/${DEFAULT_AGENT_GROUP_ID}`);
  const now = Date.now();

  const transaction = await chatRef.transaction((current) => {
    if (current === null) {
      return {
        members: { [uid]: true },
        memberCount: 1,
        memberNames: { [uid]: displayName },
        memberPhotos: photoUrl ? { [uid]: photoUrl } : {},
        memberUsernames: username ? { [uid]: username } : {},
        isGroup: true,
        isDefaultAgentGroup: true,
        title: "Team",
        dmKey: null,
        lastMessage: "",
        lastMessageAt: now,
        lastMessageSenderId: null,
        unreadCounts: { [uid]: 0 },
        pinnedBy: {},
        createdAt: now,
        createdBy: "system",
      };
    }

    const members =
      current.members && typeof current.members === "object"
        ? { ...current.members }
        : {};
    if (members[uid] === true) {
      return; // abort — already a member
    }
    members[uid] = true;
    const identity = applyMemberIdentity(
      current as Record<string, unknown>,
      uid,
      displayName,
      photoUrl,
      username,
    );
    const unreadCounts =
      current.unreadCounts && typeof current.unreadCounts === "object"
        ? { ...current.unreadCounts, [uid]: 0 }
        : { [uid]: 0 };

    return {
      ...current,
      members,
      memberCount: Object.keys(members).length,
      ...identity,
      unreadCounts,
      isGroup: true,
      isDefaultAgentGroup: true,
      // Keep existing custom title; migrate legacy "Agents" label.
      title:
        current.title === "Agents" || current.title == null
          ? "Team"
          : current.title,
      createdBy: current.createdBy ?? "system",
    };
  });

  const chat = transaction.snapshot.val() as Record<string, unknown> | null;
  const members = asObj(chat?.members);
  if (chat && members[uid] === true) {
    await rtdb
      .ref(`userChats/${uid}/${DEFAULT_AGENT_GROUP_ID}`)
      .set(chatInboxRow(DEFAULT_AGENT_GROUP_ID, chat, uid));
  }
}

/** Join auto-join groups when role or approvalStatus changes. */
export const syncUserAutoJoinGroups = onDocumentWritten(
  "users/{uid}",
  async (event) => {
    const uid = event.params.uid;
    const before = event.data?.before;
    const after = event.data?.after;
    if (!after?.exists) return;
    const beforeData = before?.exists ? before.data() : undefined;
    const afterData = after.data() ?? {};
    const beforeRole = beforeData ? parseRole(beforeData.role) : null;
    const afterRole = parseRole(afterData.role);
    const beforeApproval = String(beforeData?.approvalStatus ?? "approved");
    const afterApproval = String(afterData.approvalStatus ?? "approved");
    const identityChanged =
      !before?.exists ||
      headlineName(beforeData) !== headlineName(afterData) ||
      photoOf(beforeData) !== photoOf(afterData) ||
      claimedUsernameOf(beforeData) !== claimedUsernameOf(afterData);
    if (identityChanged) {
      await syncChatMemberIdentity(uid, {
        name: headlineName(afterData),
        photoUrl: photoOf(afterData) || null,
        username: claimedUsernameOf(afterData) || null,
      });
    }
    if (
      before?.exists &&
      beforeRole === afterRole &&
      beforeApproval === afterApproval
    ) {
      return;
    }
    await ensureAutoJoinMemberships(
      uid,
      afterRole,
      afterApproval,
      headlineName(afterData),
      afterData.isAnonymous === true,
    );
  },
);

export const syncChatInbox = onValueWritten(
  { ref: "/chats/{chatId}", region: "us-central1" },
  async (event) => {
    const chatId = event.params.chatId;
    const before = (event.data.before.val() ?? {}) as Record<string, unknown>;
    const after = (event.data.after.val() ?? {}) as Record<string, unknown>;
    const beforeMembers = Object.keys(
      (before.members ?? {}) as Record<string, unknown>,
    );
    const members = Object.keys((after.members ?? {}) as Record<string, unknown>);
    const removed = beforeMembers.filter((uid) => !members.includes(uid));
    const updates: Record<string, unknown> = {};

    for (const uid of removed) updates[`userChats/${uid}/${chatId}`] = null;
    if (event.data.after.exists()) {
      for (const uid of members) {
        updates[`userChats/${uid}/${chatId}`] = chatInboxRow(chatId, after, uid);
      }
    }
    if (Object.keys(updates).length) await rtdb.ref().update(updates);

    // Push + inbox when a new message bumps unread for recipients.
    const beforeAt = Number(before.lastMessageAt ?? 0);
    const afterAt = Number(after.lastMessageAt ?? 0);
    const senderId = String(after.lastMessageSenderId ?? "");
    if (!event.data.after.exists() || afterAt <= beforeAt || !senderId) {
      return;
    }
    const preview = String(after.lastMessage ?? "").slice(0, 120);
    const beforeUnread =
      (before.unreadCounts ?? {}) as Record<string, unknown>;
    const afterUnread =
      (after.unreadCounts ?? {}) as Record<string, unknown>;
    const memberNames =
      (after.memberNames ?? {}) as Record<string, unknown>;
    const senderName = String(memberNames[senderId] ?? "").trim() || "Someone";

    await Promise.all(
      members.map(async (uid) => {
        if (uid === senderId) return;
        const prev = Number(beforeUnread[uid] ?? 0);
        const next = Number(afterUnread[uid] ?? 0);
        if (next <= prev) return;
        if (await isMutedBy(uid, senderId)) return;
        await notifyUser(
          uid,
          {
            type: "chat_message",
            title: "New message",
            body: preview || "You have a new message",
            href: `/chats/${chatId}`,
            deepLink: `pulse://chats/${chatId}`,
            ref: { chatId },
            actorId: senderId,
            actorName: senderName,
          },
          { chatIdForDebounce: chatId },
        );
      }),
    );
  },
);

/**
 * When a message is created, only the Admin SDK may bump chat summary fields
 * (clients cannot forge lastMessage / unreadCounts for push spam).
 */
export const syncChatMetadataOnMessage = onValueCreated(
  { ref: "/messages/{chatId}/{messageId}", region: "us-central1" },
  async (event) => {
    const chatId = event.params.chatId;
    const msg = (event.data.val() ?? {}) as Record<string, unknown>;
    const senderId = String(msg.senderId ?? "");
    if (!senderId) return;

    const createdAt = Number(msg.createdAt ?? Date.now());
    const shared = msg.sharedPost as { title?: string } | null | undefined;
    const body = String(msg.body ?? "").trim();
    const preview = shared?.title
      ? `Question: ${String(shared.title).slice(0, 200)}`
      : body.slice(0, 4000);
    if (!preview) return;

    const chatRef = rtdb.ref(`chats/${chatId}`);
    const chatSnap = await chatRef.get();
    const chat = chatSnap.val() as Record<string, unknown> | null;
    if (!chat?.members || typeof chat.members !== "object") return;
    const members = chat.members as Record<string, unknown>;
    if (members[senderId] !== true) return;

    const unreadCounts: Record<string, number> = {
      ...((chat.unreadCounts ?? {}) as Record<string, number>),
    };
    for (const memberId of Object.keys(members)) {
      unreadCounts[memberId] =
        memberId === senderId ? 0 : (unreadCounts[memberId] ?? 0) + 1;
    }

    await rtdb.ref().update({
      [`chats/${chatId}/lastMessage`]: preview,
      [`chats/${chatId}/lastMessageAt`]: createdAt,
      [`chats/${chatId}/lastMessageSenderId`]: senderId,
      [`chats/${chatId}/unreadCounts`]: unreadCounts,
    });

    const memberUsernames =
      (chat.memberUsernames ?? {}) as Record<string, unknown>;
    const byHandle = new Map<string, string>();
    for (const [uid, raw] of Object.entries(memberUsernames)) {
      const parsed = parseUsername(raw);
      if (parsed.ok) byHandle.set(parsed.value, uid);
    }
    const memberNames =
      (chat.memberNames ?? {}) as Record<string, unknown>;
    const senderName = String(memberNames[senderId] ?? "").trim() || "Someone";
    const handles = parseMentions(body);
    const mentioned = new Set<string>();
    for (const handle of handles) {
      const uid = byHandle.get(handle);
      if (!uid || uid === senderId || members[uid] !== true) continue;
      mentioned.add(uid);
    }
    await Promise.all(
      [...mentioned].map(async (uid) => {
        if (await isMutedBy(uid, senderId)) return;
        await notifyUser(uid, {
          type: "chat_mention",
          title: `${senderName} mentioned you`,
          body: body.slice(0, 120) || `@${handles[0] ?? "you"}`,
          href: `/chats/${chatId}`,
          deepLink: `pulse://chats/${chatId}`,
          ref: { chatId, messageId: event.params.messageId },
          actorId: senderId,
          actorName: senderName,
        });
      }),
    );
  },
);

/**
 * Create (or return) a 1:1 DM. Enforces privacy.allowDirectMessages server-side.
 */
export const createDm = onCall(callableOpts, async (request) => {
  const actor = await requireActor(request, "createDm", {
    permission: "chats.participate",
  });
  const uid = actor.uid;
  const otherUid = String(request.data?.otherUid ?? "").trim();
  if (!otherUid || otherUid === uid) {
    throw new HttpsError("invalid-argument", "Valid recipient required.");
  }

  const [meSnap, otherSnap, publicSnap] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.doc(`users/${otherUid}`).get(),
    db.doc(`publicProfiles/${otherUid}`).get(),
  ]);
  if (!meSnap.exists || !otherSnap.exists) {
    throw new HttpsError("not-found", "User not found.");
  }
  const meData = meSnap.data() ?? {};
  const otherData = otherSnap.data() ?? {};
  if (meData.isAnonymous === true || otherData.isAnonymous === true) {
    throw new HttpsError("permission-denied", "Anonymous users cannot DM.");
  }
  if (!isUserApprovedForJoin(meData) || !isUserApprovedForJoin(otherData)) {
    throw new HttpsError("permission-denied", "Both users must be approved.");
  }
  if (!(await canProfileUseChats(otherData))) {
    throw new HttpsError(
      "permission-denied",
      "Recipient cannot participate in chats.",
    );
  }

  const canAccessAllContacts = actorHasPermission(
    actor.permissions,
    "chats.contacts.all",
  );
  const canOverrideRecipientOptOut = actorHasPermission(
    actor.permissions,
    "chats.dm.override_optout",
  );
  const allowDirect =
    publicSnap.exists
      ? publicSnap.data()?.allowDirectMessages !== false
      : (otherData.privacy as { allowDirectMessages?: boolean } | undefined)
          ?.allowDirectMessages !== false;
  if (
    !canOpenDirectMessage({
      canOverrideRecipientOptOut,
      recipientAllowsDirectMessages: allowDirect,
    })
  ) {
    throw new HttpsError(
      "failed-precondition",
      "direct-messages-disabled",
    );
  }
  if (await isBlockedEitherWay(uid, otherUid)) {
    throw new HttpsError("permission-denied", "Cannot message this member.");
  }

  const memberIds = [uid, otherUid].sort();
  const dmKey = memberIds.join("_");
  const existing = await rtdb.ref(`chats/${dmKey}`).get();
  if (existing.exists()) {
    const chat = existing.val() as Record<string, unknown>;
    const canResumeExistingDm = canResumeDirectMessage({
      canAccessAllContacts,
      mutualContacts:
        !canAccessAllContacts && (await areMutualContacts(uid, otherUid)),
    });
    if (canResumeExistingDm && chat.dmMessagingEnabled !== true) {
      await existing.ref.child("dmMessagingEnabled").set(true);
    }
    return {
      chatId: dmKey,
      createdAt: Number(chat.createdAt ?? Date.now()),
      existing: true,
      memberIds,
      memberNames: (chat.memberNames ?? {}) as Record<string, string>,
    };
  }

  if (!canAccessAllContacts && !(await areMutualContacts(uid, otherUid))) {
    throw new HttpsError("failed-precondition", "not-contacts");
  }

  const memberNames = {
    [uid]: headlineName(meData),
    [otherUid]: headlineName(otherData),
  };
  const memberPhotos = compactStrings([
    [uid, photoOf(meData)],
    [otherUid, photoOf(otherData)],
  ]);
  const memberUsernames = compactStrings([
    [uid, claimedUsernameOf(meData)],
    [otherUid, claimedUsernameOf(otherData)],
  ]);
  const now = Date.now();
  const chat = {
    members: Object.fromEntries(memberIds.map((id) => [id, true])),
    memberCount: 2,
    memberNames,
    memberPhotos,
    memberUsernames,
    isGroup: false,
    title: null,
    dmKey,
    lastMessage: "",
    lastMessageAt: now,
    lastMessageSenderId: null,
    unreadCounts: Object.fromEntries(memberIds.map((id) => [id, 0])),
    pinnedBy: {},
    createdAt: now,
    createdBy: uid,
    isDefaultAgentGroup: false,
    autoJoinRoles: {},
    dmMessagingEnabled: true,
  };

  const updates: Record<string, unknown> = {
    [`chats/${dmKey}`]: chat,
    [`dmIndex/${dmKey}`]: dmKey,
  };
  for (const memberId of memberIds) {
    updates[`userChats/${memberId}/${dmKey}`] = chatInboxRow(
      dmKey,
      chat,
      memberId,
    );
  }
  await rtdb.ref().update(updates);
  return {
    chatId: dmKey,
    createdAt: now,
    existing: false,
    memberIds,
    memberNames,
  };
});

export const rebuildChatInbox = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "rebuildChatInbox");
  const index = await rtdb.ref(`userChats/${uid}`).get();
  const chatIds = Object.keys((index.val() ?? {}) as Record<string, unknown>);
  const updates: Record<string, unknown> = {};
  await Promise.all(
    chatIds.slice(0, 100).map(async (chatId) => {
      const chat = await rtdb.ref(`chats/${chatId}`).get();
      const value = chat.val() as Record<string, unknown> | null;
      if (value?.members &&
          (value.members as Record<string, unknown>)[uid] === true) {
        updates[`userChats/${uid}/${chatId}`] = chatInboxRow(chatId, value, uid);
      }
    }),
  );
  if (Object.keys(updates).length) await rtdb.ref().update(updates);
  return { ok: true };
});

export const deleteChatMessage = onCall(callableOpts, async (request) => {
  const actor = await requireActor(request, "deleteChatMessage");
  const chatId = chatIdFrom(request);
  const messageId = String(request.data?.messageId ?? "").trim();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(messageId)) {
    throw new HttpsError("invalid-argument", "Valid message required.");
  }
  const [chatSnap, messageSnap] = await Promise.all([
    rtdb.ref(`chats/${chatId}`).get(),
    rtdb.ref(`messages/${chatId}/${messageId}`).get(),
  ]);
  if (!chatSnap.exists()) throw new HttpsError("not-found", "Chat not found.");
  if (!messageSnap.exists()) return { ok: true, deleted: false };
  const chat = (chatSnap.val() ?? {}) as Record<string, unknown>;
  const members = (chat.members ?? {}) as Record<string, unknown>;
  const canModerate = actorHasPermission(
    actor.permissions,
    "chats.messages.moderate",
  );
  if (members[actor.uid] !== true && !canModerate) {
    throw new HttpsError("permission-denied", "Chat membership required.");
  }
  const message = (messageSnap.val() ?? {}) as Record<string, unknown>;
  if (String(message.senderId ?? "") !== actor.uid && !canModerate) {
    throw new HttpsError("permission-denied", "Cannot delete this message.");
  }
  await messageSnap.ref.remove();
  await refreshChatSummary(chatId);
  return { ok: true, deleted: true };
});

export const clearChatMessages = onCall(callableOpts, async (request) => {
  const actor = await requireActor(request, "clearChatMessages", {
    permission: "chats.messages.moderate",
  });
  const chatId = chatIdFrom(request);
  const chatSnap = await rtdb.ref(`chats/${chatId}`).get();
  if (!chatSnap.exists()) throw new HttpsError("not-found", "Chat not found.");
  const chat = (chatSnap.val() ?? {}) as Record<string, unknown>;
  const members = asObj(chat.members);
  if (
    !canClearChatThread({
      uid: actor.uid,
      permissions: actor.permissions,
      members,
      isGroup: chat.isGroup === true,
    })
  ) {
    throw new HttpsError("permission-denied", "Chat membership required.");
  }
  await rtdb.ref().update({
    [`messages/${chatId}`]: null,
    [`typing/${chatId}`]: null,
  });
  await refreshChatSummary(chatId);
  return { ok: true };
});

export const listManagedGroupChats = onCall(callableOpts, async (request) => {
  const actor = await requireActor(request, "listManagedGroupChats", {
    permission: "chats.groups.manage",
    skipQuota: true,
  });
  const requestedLimit = Math.round(Number(request.data?.limit ?? 100));
  const limit = Math.max(1, Math.min(200, requestedLimit));
  const snap = await rtdb
    .ref("chats")
    .orderByChild("isGroup")
    .equalTo(true)
    .limitToFirst(limit)
    .get();
  const raw = (snap.val() ?? {}) as Record<string, Record<string, unknown>>;
  const groups = Object.entries(raw)
    .filter(([, chat]) => chat.isGroup === true)
    .map(([chatId, chat]) => ({
      ...chatInboxRow(chatId, chat, actor.uid),
      id: chatId,
    }))
    .sort((a, b) => Number(b.lastMessageAt) - Number(a.lastMessageAt))
    .slice(0, limit);
  return { groups };
});

export const updateGroupChat = onCall(callableOpts, async (request) => {
  await requireActor(request, "updateGroupChat", {
    permission: "chats.groups.manage",
  });
  const chatId = chatIdFrom(request);
  const title = String(request.data?.title ?? "").trim();
  const requestedMemberIds: unknown[] = Array.isArray(request.data?.memberIds)
    ? request.data.memberIds
    : [];
  const memberIds: string[] = [
    ...new Set(
      requestedMemberIds
        .map((value) => String(value).trim())
        .filter((uid) => uid.length > 0),
    ),
  ];
  if (!title || title.length > 120) {
    throw new HttpsError("invalid-argument", "Valid group title required.");
  }
  if (memberIds.length < 1 || memberIds.length > MAX_ROLE_SEED_MEMBERS) {
    throw new HttpsError("invalid-argument", "Valid group members required.");
  }
  const chatRef = rtdb.ref(`chats/${chatId}`);
  const chatSnap = await chatRef.get();
  if (!chatSnap.exists()) throw new HttpsError("not-found", "Chat not found.");
  const current = (chatSnap.val() ?? {}) as Record<string, unknown>;
  if (current.isGroup !== true) {
    throw new HttpsError("failed-precondition", "Only groups can be edited.");
  }
  const profileSnaps = await db.getAll(
    ...memberIds.map((uid) => db.doc(`users/${uid}`)),
  );
  const eligibilityCache = new Map<string, string[]>();
  const eligibility = await Promise.all(
    profileSnaps.map(
      async (profile) =>
        profile.exists &&
        (await canProfileUseChats(profile.data(), eligibilityCache)),
    ),
  );
  if (eligibility.some((allowed) => !allowed)) {
    throw new HttpsError("failed-precondition", "Unknown group member.");
  }
  const profiles = new Map(
    profileSnaps.map((profile) => [profile.id, profile.data() ?? {}]),
  );
  const oldUnread = asObj(current.unreadCounts);
  const oldPinned = asObj(current.pinnedBy);
  const patch: Record<string, unknown> = {
    title,
    members: Object.fromEntries(memberIds.map((uid) => [uid, true])),
    memberCount: memberIds.length,
    memberNames: Object.fromEntries(
      memberIds.map((uid) => [uid, headlineName(profiles.get(uid))]),
    ),
    memberPhotos: compactStrings(
      memberIds.map((uid): [string, string] => [uid, photoOf(profiles.get(uid))]),
    ),
    memberUsernames: compactStrings(
      memberIds.map((uid): [string, string] => [
        uid,
        claimedUsernameOf(profiles.get(uid)),
      ]),
    ),
    unreadCounts: Object.fromEntries(
      memberIds.map((uid) => [uid, Number(oldUnread[uid] ?? 0)]),
    ),
    pinnedBy: Object.fromEntries(
      memberIds
        .filter((uid) => oldPinned[uid] === true)
        .map((uid) => [uid, true]),
    ),
  };
  const incomingPhoto = request.data?.photoUrl;
  if (typeof incomingPhoto === "string") {
    const trimmed = incomingPhoto.trim();
    patch.photoUrl =
      trimmed.length > 0 && trimmed.length <= 4096 ? trimmed : null;
  }
  await chatRef.update(patch);
  return { ok: true, chatId, memberCount: memberIds.length };
});

export const deleteGroupChat = onCall(callableOpts, async (request) => {
  await requireActor(request, "deleteGroupChat", {
    permission: "chats.groups.manage",
  });
  const chatId = chatIdFrom(request);
  const chatSnap = await rtdb.ref(`chats/${chatId}`).get();
  if (!chatSnap.exists()) return { ok: true, deleted: false };
  const chat = (chatSnap.val() ?? {}) as Record<string, unknown>;
  if (chat.isGroup !== true) {
    throw new HttpsError("failed-precondition", "Only groups can be deleted.");
  }
  if (chatId === DEFAULT_AGENT_GROUP_ID || chat.isDefaultAgentGroup === true) {
    throw new HttpsError("failed-precondition", "The Team group cannot be deleted.");
  }
  const updates: Record<string, unknown> = {
    [`chats/${chatId}`]: null,
    [`messages/${chatId}`]: null,
    [`typing/${chatId}`]: null,
  };
  for (const uid of Object.keys(asObj(chat.members))) {
    updates[`userChats/${uid}/${chatId}`] = null;
  }
  for (const role of Object.keys(asObj(chat.autoJoinRoles))) {
    updates[`autoJoinGroups/${role}/${chatId}`] = null;
  }
  await rtdb.ref().update(updates);
  return { ok: true, deleted: true };
});

export const createGroupChat = onCall(callableOpts, async (request) => {
  const actor = await requireActor(request, "createGroupChat", {
    permission: "chats.groups.create",
  });
  const uid = actor.uid;
  const title = String(request.data?.title ?? "").trim();
  const requested = Array.isArray(request.data?.memberIds)
    ? request.data.memberIds.map(String)
    : [];
  const rawSeedRoles = Array.isArray(request.data?.seedRoles)
    ? request.data.seedRoles.map(String)
    : [];
  const wantAutoJoin = request.data?.autoJoin === true;

  const seedRoles = [
    ...new Set(
      rawSeedRoles
        .map((role: string) => parseRole(role))
        .filter((role: UserRole) =>
          (GROUP_SEED_ROLES as readonly string[]).includes(role),
        ),
    ),
  ] as UserRole[];

  if (!title || title.length > 120) {
    throw new HttpsError("invalid-argument", "Valid group title required.");
  }

  const creatorPerms = actor.permissions;
  if (!canCreateChatGroups(creatorPerms)) {
    throw new HttpsError("permission-denied", "Not allowed to create groups.");
  }

  const persistAutoJoin =
    wantAutoJoin &&
    seedRoles.length > 0 &&
    canConfigureGroupAutoJoin(creatorPerms);
  if (wantAutoJoin && seedRoles.length > 0 && !persistAutoJoin) {
    throw new HttpsError(
      "permission-denied",
      "Not allowed to enable auto-join.",
    );
  }

  const explicitIds = [...new Set([uid, ...requested])].filter(Boolean);

  const roleUsers = await collectUsersByRoles(seedRoles, MAX_ROLE_SEED_MEMBERS);
  const truncated =
    seedRoles.length > 0 && roleUsers.size >= MAX_ROLE_SEED_MEMBERS;

  const memberIdSet = new Set<string>(explicitIds);
  for (const memberId of roleUsers.keys()) {
    if (memberIdSet.size >= MAX_ROLE_SEED_MEMBERS) {
      break;
    }
    memberIdSet.add(memberId);
  }
  const memberIds = [...memberIdSet];

  const maxAllowed =
    seedRoles.length > 0 ? MAX_ROLE_SEED_MEMBERS : MAX_GROUP_MEMBERS;
  if (memberIds.length < 2) {
    throw new HttpsError(
      "invalid-argument",
      "Group must include the creator and at least one other member or matching role.",
    );
  }
  if (memberIds.length > maxAllowed) {
    throw new HttpsError(
      "invalid-argument",
      `Group cannot exceed ${maxAllowed} members.`,
    );
  }

  // Fetch any explicit members not already loaded via role query.
  const missing = memberIds.filter((id) => !roleUsers.has(id));
  const fetched =
    missing.length > 0
      ? await db.getAll(...missing.map((id) => db.doc(`users/${id}`)))
      : [];
  if (fetched.some((profile) => !profile.exists)) {
    throw new HttpsError("failed-precondition", "Unknown group member.");
  }
  for (const profile of fetched) {
    roleUsers.set(profile.id, profile.data() ?? {});
  }
  const eligibilityCache = new Map<string, string[]>();
  const eligibleMembers = await Promise.all(
    memberIds.map((id) =>
      canProfileUseChats(roleUsers.get(id), eligibilityCache),
    ),
  );
  if (eligibleMembers.some((allowed) => !allowed)) {
    throw new HttpsError(
      "failed-precondition",
      "All group members must have active chat access.",
    );
  }

  const memberNames = Object.fromEntries(
    memberIds.map((id) => [id, headlineName(roleUsers.get(id))]),
  );
  const memberPhotos = compactStrings(
    memberIds.map((id) => [id, photoOf(roleUsers.get(id))] as [string, string]),
  );
  const memberUsernames = compactStrings(
    memberIds.map(
      (id) => [id, claimedUsernameOf(roleUsers.get(id))] as [string, string],
    ),
  );
  const autoJoinRolesMap = persistAutoJoin
    ? Object.fromEntries(seedRoles.map((role) => [role, true]))
    : {};

  const now = Date.now();
  const chatRef = rtdb.ref("chats").push();
  const chatId = chatRef.key!;
  const chat = {
    members: Object.fromEntries(memberIds.map((id) => [id, true])),
    memberCount: memberIds.length,
    memberNames,
    memberPhotos,
    memberUsernames,
    isGroup: true,
    title,
    dmKey: null,
    lastMessage: "",
    lastMessageAt: now,
    lastMessageSenderId: null,
    unreadCounts: Object.fromEntries(memberIds.map((id) => [id, 0])),
    pinnedBy: {},
    createdAt: now,
    createdBy: uid,
    isDefaultAgentGroup: false,
    autoJoinRoles: autoJoinRolesMap,
  };

  const updates: Record<string, unknown> = {
    [`chats/${chatId}`]: chat,
  };
  for (const memberId of memberIds) {
    updates[`userChats/${memberId}/${chatId}`] = chatInboxRow(
      chatId,
      chat,
      memberId,
    );
  }
  if (persistAutoJoin) {
    for (const role of seedRoles) {
      updates[`autoJoinGroups/${role}/${chatId}`] = true;
    }
  }
  await rtdb.ref().update(updates);
  return {
    chatId,
    createdAt: now,
    memberCount: memberIds.length,
    truncated,
    autoJoinRoles: persistAutoJoin ? seedRoles : [],
  };
});

/**
 * Ensures the caller is a member of the default Team community RTDB chat.
 */
export const ensureDefaultAgentGroup = onCall(callableOpts, async (request) => {
  const actor = await requireActor(request, "ensureDefaultAgentGroup", {
    permission: "chats.groups.default.join",
  });
  const callerUid = actor.uid;
  const targetUid = String(request.data?.uid ?? callerUid);

  if (
    targetUid !== callerUid &&
    !actorHasPermission(actor.permissions, "platform.manage")
  ) {
    throw new HttpsError("permission-denied", "Admins only for other users.");
  }

  const target = await db.doc(`users/${targetUid}`).get();
  if (!target.exists) {
    throw new HttpsError("not-found", "User not found.");
  }
  const targetRole = String(target.data()?.role ?? "");
  const targetPermissions = await loadPermissionsForRole(targetRole);
  if (
    !actorHasPermission(targetPermissions, "chats.groups.default.join") ||
    !(await canProfileUseChats(target.data()))
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Role lacks default agent group permission.",
    );
  }

  await addAgentToDefaultGroup(targetUid, headlineName(target.data()));
  return { ok: true, uid: targetUid, chatId: DEFAULT_AGENT_GROUP_ID };
});

/** Upload group cover via Admin SDK (client Storage writes are denied). */
export const uploadGroupChatPhoto = onCall(
  { ...callableOpts, memory: "512MiB", timeoutSeconds: 60 },
  async (request) => {
    const actor = await requireActor(request, "uploadGroupChatPhoto", {
      permission: "chats.groups.manage",
    });
    const chatId = chatIdFrom(request);
    const chatSnap = await rtdb.ref(`chats/${chatId}`).get();
    if (!chatSnap.exists()) throw new HttpsError("not-found", "Chat not found.");
    const chat = (chatSnap.val() ?? {}) as Record<string, unknown>;
    if (chat.isGroup !== true) {
      throw new HttpsError("failed-precondition", "Only groups have photos.");
    }

    const contentType = String(request.data?.contentType ?? "image/jpeg").trim();
    if (!GROUP_PHOTO_TYPES.has(contentType)) {
      throw new HttpsError(
        "invalid-argument",
        "Photo must be JPEG, PNG, or WebP.",
      );
    }

    const base64 = String(request.data?.bytesBase64 ?? "");
    if (!base64 || base64.length > 7_000_000) {
      throw new HttpsError("invalid-argument", "Photo payload missing or too large.");
    }
    const buffer = Buffer.from(base64, "base64");
    if (!buffer.length || buffer.length >= 5 * 1024 * 1024) {
      throw new HttpsError("invalid-argument", "Photo must be under 5MB.");
    }

    const path = `chat-photos/${chatId}.jpg`;
    const token = randomUUID();
    const file = storageBucket().file(path);
    await file.save(buffer, {
      resumable: false,
      contentType,
      metadata: {
        contentType,
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });

    const bucket = file.bucket.name;
    const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST?.trim();
    const encoded = encodeURIComponent(path);
    const downloadUrl = emulatorHost
      ? `http://${emulatorHost}/v0/b/${bucket}/o/${encoded}?alt=media&token=${token}`
      : `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media&token=${token}`;

    await rtdb.ref(`chats/${chatId}`).update({ photoUrl: downloadUrl });
    return { downloadUrl, path, chatId, updatedBy: actor.uid };
  },
);

