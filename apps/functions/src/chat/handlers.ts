import "../lib/bootstrap";
import { getDatabase, ServerValue } from "firebase-admin/database";
import { getFirestore, type DocumentData } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onValueWritten } from "firebase-functions/v2/database";
import {
  GROUP_CREATOR_ROLES,
  GROUP_SEED_ROLES,
  belongsInDefaultAgentGroup,
  canConfigureGroupAutoJoin,
  canManagePlatform,
  parseRole,
  type UserRole,
} from "@pulse/shared";
import {
  callableOpts,
  requireApprovedMember,
  requireCaller,
} from "../lib/auth";
import {
  DEFAULT_AGENT_GROUP_ID,
  SUPPORT_AI_UID,
  addAgentToDefaultGroup,
  chatInboxRow,
} from "../lib/chat-helpers";
import { notifyUser } from "../lib/notifications";
import { headlineName, isUserApprovedForJoin } from "../lib/users";

const db = getFirestore();
const rtdb = getDatabase();
const storage = getStorage();

const MAX_SUPPORT_MESSAGE_CHARS = 2000;
const MAX_GROUP_MEMBERS = 20;
/** Cap auto-join default groups to limit RTDB fan-out per message. */
const MAX_ROLE_SEED_MEMBERS = 100;
/** Skip per-member push fan-out above this (inbox rows still update). */
const MAX_CHAT_NOTIFY_RECIPIENTS = 50;

/** Slim patch for message/unread bumps — avoids rewriting member maps. */
function chatInboxSlimPatch(
  chat: Record<string, unknown>,
  uid: string,
) {
  const unreadCounts =
    (chat.unreadCounts ?? {}) as Record<string, unknown>;
  const pinnedBy = (chat.pinnedBy ?? {}) as Record<string, unknown>;
  return {
    lastMessage: String(chat.lastMessage ?? "").slice(0, 4000),
    lastMessageAt: Number(chat.lastMessageAt ?? 0),
    lastMessageSenderId: chat.lastMessageSenderId ?? null,
    unreadCount: Number(unreadCounts[uid] ?? 0),
    pinned: pinnedBy[uid] === true,
    title: chat.title ?? null,
    isGroup: chat.isGroup === true,
    isSupportChat: chat.isSupportChat === true,
    isDefaultAgentGroup: chat.isDefaultAgentGroup === true,
  };
}

function membersEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  const ak = Object.keys(a).sort();
  const bk = Object.keys(b).sort();
  if (ak.length !== bk.length) return false;
  return ak.every((k, i) => k === bk[i] && a[k] === true && b[k] === true);
}

function applyUnreadTotalDeltas(
  updates: Record<string, unknown>,
  beforeUnread: Record<string, unknown>,
  afterUnread: Record<string, unknown>,
  memberIds: string[],
) {
  for (const uid of memberIds) {
    const prev = Number(beforeUnread[uid] ?? 0);
    const next = Number(afterUnread[uid] ?? 0);
    const delta = next - prev;
    if (delta === 0) continue;
    updates[`userMeta/${uid}/chatUnreadTotal`] =
      ServerValue.increment(delta);
  }
}

async function collectUsersByRoles(
  roles: UserRole[],
  cap: number,
): Promise<Map<string, DocumentData>> {
  const byUid = new Map<string, DocumentData>();
  if (!roles.length) return byUid;
  // Query per role (avoids composite index); filter approval in memory.
  await Promise.all(
    roles.map(async (role) => {
      const snap = await db
        .collection("users")
        .where("role", "==", role)
        .limit(cap)
        .get();
      for (const doc of snap.docs) {
        if (byUid.size >= cap) break;
        const data = doc.data();
        if (!isUserApprovedForJoin(data)) continue;
        if (parseRole(data.role) === "guest") continue;
        byUid.set(doc.id, data);
      }
    }),
  );
  return byUid;
}

export const syncChatInbox = onValueWritten(
  { ref: "/chats/{chatId}", region: "us-central1" },
  async (event) => {
    const chatId = event.params.chatId;
    const before = (event.data.before.val() ?? {}) as Record<string, unknown>;
    const after = (event.data.after.val() ?? {}) as Record<string, unknown>;
    const beforeMembersMap =
      (before.members ?? {}) as Record<string, unknown>;
    const afterMembersMap =
      (after.members ?? {}) as Record<string, unknown>;
    const beforeMembers = Object.keys(beforeMembersMap).filter(
      (uid) => uid !== SUPPORT_AI_UID,
    );
    const members = Object.keys(afterMembersMap).filter(
      (uid) => uid !== SUPPORT_AI_UID,
    );
    const removed = beforeMembers.filter((uid) => !members.includes(uid));
    const updates: Record<string, unknown> = {};
    const beforeUnread =
      (before.unreadCounts ?? {}) as Record<string, unknown>;
    const afterUnread =
      (after.unreadCounts ?? {}) as Record<string, unknown>;

    if (!event.data.after.exists()) {
      for (const uid of beforeMembers) {
        const prev = Number(beforeUnread[uid] ?? 0);
        updates[`userChats/${uid}/${chatId}`] = null;
        if (prev > 0) {
          updates[`userMeta/${uid}/chatUnreadTotal`] =
            ServerValue.increment(-prev);
        }
      }
      if (Object.keys(updates).length) await rtdb.ref().update(updates);
      console.info(
        JSON.stringify({
          scale: "syncChatInbox",
          chatId,
          deleted: true,
          membersTouched: beforeMembers.length,
        }),
      );
      return;
    }

    const membershipChanged = !membersEqual(beforeMembersMap, afterMembersMap);
    const beforeAt = Number(before.lastMessageAt ?? 0);
    const afterAt = Number(after.lastMessageAt ?? 0);
    const messageBumped = afterAt > beforeAt;
    const titleChanged = String(before.title ?? "") !== String(after.title ?? "");
    const photoChanged =
      String(before.photoUrl ?? "") !== String(after.photoUrl ?? "");

    if (membershipChanged) {
      for (const uid of removed) {
        const prev = Number(beforeUnread[uid] ?? 0);
        updates[`userChats/${uid}/${chatId}`] = null;
        if (prev > 0) {
          updates[`userMeta/${uid}/chatUnreadTotal`] =
            ServerValue.increment(-prev);
        }
      }
      for (const uid of members) {
        updates[`userChats/${uid}/${chatId}`] = chatInboxRow(chatId, after, uid);
      }
      // Recalculate unread totals for current members from before→after.
      applyUnreadTotalDeltas(updates, beforeUnread, afterUnread, members);
    } else {
      // Message / unread / meta-only: patch slim fields, not full member maps.
      const touched = new Set<string>();
      if (messageBumped || titleChanged || photoChanged) {
        for (const uid of members) touched.add(uid);
      } else {
        for (const uid of members) {
          if (Number(beforeUnread[uid] ?? 0) !== Number(afterUnread[uid] ?? 0)) {
            touched.add(uid);
          }
          const beforePinned =
            ((before.pinnedBy ?? {}) as Record<string, unknown>)[uid] === true;
          const afterPinned =
            ((after.pinnedBy ?? {}) as Record<string, unknown>)[uid] === true;
          if (beforePinned !== afterPinned) touched.add(uid);
        }
      }
      for (const uid of touched) {
        const patch = chatInboxSlimPatch(after, uid);
        for (const [key, value] of Object.entries(patch)) {
          updates[`userChats/${uid}/${chatId}/${key}`] = value;
        }
      }
      applyUnreadTotalDeltas(
        updates,
        beforeUnread,
        afterUnread,
        [...touched],
      );
    }

    if (Object.keys(updates).length) await rtdb.ref().update(updates);

    console.info(
      JSON.stringify({
        scale: "syncChatInbox",
        chatId,
        membershipChanged,
        messageBumped,
        memberCount: members.length,
        updateKeys: Object.keys(updates).length,
      }),
    );

    // Push when a new message bumps unread for recipients.
    const senderId = String(after.lastMessageSenderId ?? "");
    if (!messageBumped || !senderId) return;

    const preview = String(after.lastMessage ?? "").slice(0, 120);
    const isSupport = after.isSupportChat === true;
    const memberNames =
      (after.memberNames ?? {}) as Record<string, unknown>;
    const senderName = String(memberNames[senderId] ?? "").trim() || "Someone";

    const notifyTargets = members.filter((uid) => {
      if (uid === senderId) return false;
      const prev = Number(beforeUnread[uid] ?? 0);
      const next = Number(afterUnread[uid] ?? 0);
      return next > prev;
    });

    // Large groups: inbox updates only — avoid O(N) notify/FCM in one trigger.
    if (
      !isSupport &&
      notifyTargets.length > MAX_CHAT_NOTIFY_RECIPIENTS
    ) {
      console.info(
        JSON.stringify({
          scale: "syncChatInbox",
          chatId,
          notifySkipped: notifyTargets.length,
          reason: "group_too_large",
        }),
      );
      return;
    }

    await Promise.all(
      notifyTargets.map(async (uid) => {
        await notifyUser(
          uid,
          {
            type: isSupport ? "support_message" : "chat_message",
            title: isSupport ? "Support" : "New message",
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

export const createGroupChat = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "createGroupChat");
  await requireApprovedMember(uid);
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

  const creator = await db.doc(`users/${uid}`).get();
  const creatorRole = parseRole(creator.data()?.role);
  if (!(GROUP_CREATOR_ROLES as readonly string[]).includes(creatorRole)) {
    throw new HttpsError("permission-denied", "Not allowed to create groups.");
  }

  const persistAutoJoin =
    wantAutoJoin &&
    seedRoles.length > 0 &&
    canConfigureGroupAutoJoin(creatorRole);
  if (wantAutoJoin && seedRoles.length > 0 && !persistAutoJoin) {
    throw new HttpsError(
      "permission-denied",
      "Only admins and managers can enable auto-join.",
    );
  }

  const explicitIds = [...new Set([uid, ...requested])]
    .filter((id) => id && id !== SUPPORT_AI_UID);

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

  const memberNames = Object.fromEntries(
    memberIds.map((id) => [id, headlineName(roleUsers.get(id))]),
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
    isSupportChat: false,
    autoJoinRoles: autoJoinRolesMap,
    photoUrl: null,
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

export const updateGroupChat = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "updateGroupChat");
  const chatId = String(request.data?.chatId ?? "").trim();
  if (!chatId) {
    throw new HttpsError("invalid-argument", "chatId required.");
  }

  const actor = await db.doc(`users/${uid}`).get();
  const actorRole = parseRole(actor.data()?.role);
  const chatSnap = await rtdb.ref(`chats/${chatId}`).get();
  const chat = (chatSnap.val() ?? null) as Record<string, unknown> | null;
  if (!chat || chat.isGroup !== true) {
    throw new HttpsError("not-found", "Group not found.");
  }
  if (chat.isSupportChat === true) {
    throw new HttpsError("failed-precondition", "Support chats cannot be edited.");
  }

  const isStaff = actorRole === "admin" || actorRole === "manager";
  const isCreator = String(chat.createdBy ?? "") === uid;
  const isMember = Boolean(
    (chat.members as Record<string, unknown> | undefined)?.[uid],
  );
  if (!isStaff && !(isCreator && isMember)) {
    throw new HttpsError("permission-denied", "Not allowed to edit this group.");
  }

  const titleRaw = request.data?.title;
  const title =
    titleRaw === undefined ? undefined : String(titleRaw ?? "").trim();
  if (title !== undefined && (!title || title.length > 120)) {
    throw new HttpsError("invalid-argument", "Valid group title required.");
  }

  const addIds = Array.isArray(request.data?.addMemberIds)
    ? request.data.addMemberIds.map(String).filter(Boolean)
    : [];
  const removeIds = Array.isArray(request.data?.removeMemberIds)
    ? request.data.removeMemberIds.map(String).filter(Boolean)
    : [];
  const rawSeedRoles = Array.isArray(request.data?.seedRoles)
    ? request.data.seedRoles.map(String)
    : [];
  const seedRoles = [
    ...new Set(
      rawSeedRoles
        .map((role: string) => parseRole(role))
        .filter((role: UserRole) =>
          (GROUP_SEED_ROLES as readonly string[]).includes(role),
        ),
    ),
  ] as UserRole[];

  const wantAutoJoin = request.data?.autoJoin === true;
  const autoJoinRolesInput = Array.isArray(request.data?.autoJoinRoles)
    ? (request.data.autoJoinRoles as unknown[])
        .map((role) => parseRole(role))
        .filter((role) =>
          (GROUP_SEED_ROLES as readonly string[]).includes(role),
        )
    : null;

  if (
    (wantAutoJoin || (autoJoinRolesInput && autoJoinRolesInput.length > 0)) &&
    !canConfigureGroupAutoJoin(actorRole)
  ) {
    throw new HttpsError(
      "permission-denied",
      "Only admins and managers can enable auto-join.",
    );
  }

  const photoUrlRaw = request.data?.photoUrl;
  const photoUrl =
    photoUrlRaw === undefined
      ? undefined
      : photoUrlRaw === null || photoUrlRaw === ""
        ? null
        : String(photoUrlRaw).slice(0, 2000);

  const members = {
    ...((chat.members as Record<string, unknown>) ?? {}),
  } as Record<string, boolean>;
  const memberNames = {
    ...((chat.memberNames as Record<string, unknown>) ?? {}),
  } as Record<string, string>;
  const unreadCounts = {
    ...((chat.unreadCounts as Record<string, unknown>) ?? {}),
  } as Record<string, number>;

  for (const removeId of removeIds) {
    if (removeId === uid || removeId === String(chat.createdBy ?? "")) continue;
    delete members[removeId];
    delete memberNames[removeId];
    delete unreadCounts[removeId];
  }

  const roleUsers = await collectUsersByRoles(seedRoles, MAX_ROLE_SEED_MEMBERS);
  const toAdd = new Set<string>([
    ...addIds.filter((id: string) => id !== SUPPORT_AI_UID),
    ...roleUsers.keys(),
  ]);

  const missingProfiles = [...toAdd].filter((id: string) => !roleUsers.has(id));
  if (missingProfiles.length) {
    const fetched = await db.getAll(
      ...missingProfiles.map((id) => db.doc(`users/${id}`)),
    );
    for (const profile of fetched) {
      if (profile.exists) roleUsers.set(profile.id, profile.data() ?? {});
    }
  }

  let truncated = false;
  for (const memberId of toAdd) {
    if (members[memberId] === true) continue;
    if (Object.keys(members).length >= MAX_ROLE_SEED_MEMBERS) {
      truncated = true;
      break;
    }
    const data = roleUsers.get(memberId);
    if (!data && !addIds.includes(memberId)) continue;
    members[memberId] = true;
    memberNames[memberId] = headlineName(data);
    unreadCounts[memberId] = Number(unreadCounts[memberId] ?? 0);
  }

  const memberIds = Object.keys(members).filter(
    (id) => id && id !== SUPPORT_AI_UID,
  );
  if (memberIds.length < 2) {
    throw new HttpsError(
      "invalid-argument",
      "Group must keep at least two members.",
    );
  }

  let autoJoinRolesMap = {
    ...((chat.autoJoinRoles as Record<string, unknown>) ?? {}),
  } as Record<string, boolean>;
  const previousAutoRoles = Object.keys(autoJoinRolesMap).filter(
    (role) => autoJoinRolesMap[role] === true,
  );

  if (autoJoinRolesInput) {
    autoJoinRolesMap = Object.fromEntries(
      autoJoinRolesInput.map((role) => [role, true]),
    );
  } else if (wantAutoJoin && seedRoles.length) {
    autoJoinRolesMap = Object.fromEntries(
      seedRoles.map((role) => [role, true]),
    );
  } else if (request.data?.autoJoin === false) {
    autoJoinRolesMap = {};
  }

  const nextAutoRoles = Object.keys(autoJoinRolesMap).filter(
    (role) => autoJoinRolesMap[role] === true,
  );

  const nextChat: Record<string, unknown> = {
    ...chat,
    members,
    memberCount: memberIds.length,
    memberNames,
    unreadCounts,
    title: title ?? chat.title,
    autoJoinRoles: autoJoinRolesMap,
    photoUrl: photoUrl === undefined ? (chat.photoUrl ?? null) : photoUrl,
  };

  const updates: Record<string, unknown> = {
    [`chats/${chatId}`]: nextChat,
  };

  for (const memberId of memberIds) {
    updates[`userChats/${memberId}/${chatId}`] = chatInboxRow(
      chatId,
      nextChat,
      memberId,
    );
  }
  for (const removeId of removeIds) {
    if (!members[removeId]) {
      updates[`userChats/${removeId}/${chatId}`] = null;
    }
  }

  for (const role of previousAutoRoles) {
    if (!nextAutoRoles.includes(role)) {
      updates[`autoJoinGroups/${role}/${chatId}`] = null;
    }
  }
  for (const role of nextAutoRoles) {
    updates[`autoJoinGroups/${role}/${chatId}`] = true;
  }

  await rtdb.ref().update(updates);
  return {
    chatId,
    memberCount: memberIds.length,
    truncated,
    title: nextChat.title ?? null,
    photoUrl: nextChat.photoUrl ?? null,
    autoJoinRoles: nextAutoRoles,
  };
});

/** Hard-delete a group for everyone (messages, inbox rows, auto-join). Never Support. */
export const deleteGroupChat = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "deleteGroupChat");
  const chatId = String(request.data?.chatId ?? "").trim();
  if (!chatId) {
    throw new HttpsError("invalid-argument", "chatId required.");
  }

  const actor = await db.doc(`users/${uid}`).get();
  const actorRole = parseRole(actor.data()?.role);
  if (!canManagePlatform(actorRole)) {
    throw new HttpsError("permission-denied", "Only admins can delete groups.");
  }

  const chatSnap = await rtdb.ref(`chats/${chatId}`).get();
  const chat = (chatSnap.val() ?? null) as Record<string, unknown> | null;
  if (!chat || chat.isGroup !== true) {
    throw new HttpsError("not-found", "Group not found.");
  }
  if (chat.isSupportChat === true) {
    throw new HttpsError(
      "failed-precondition",
      "Support chats cannot be deleted.",
    );
  }

  const members = Object.keys(
    (chat.members as Record<string, unknown> | undefined) ?? {},
  );
  const autoJoinRoles = Object.keys(
    (chat.autoJoinRoles as Record<string, unknown> | undefined) ?? {},
  ).filter(
    (role) =>
      (chat.autoJoinRoles as Record<string, unknown>)?.[role] === true,
  );

  // Wipe message tree first (may be large).
  await rtdb.ref(`messages/${chatId}`).remove();

  const updates: Record<string, null> = {
    [`chats/${chatId}`]: null,
  };
  for (const memberId of members) {
    updates[`userChats/${memberId}/${chatId}`] = null;
  }
  for (const role of autoJoinRoles) {
    updates[`autoJoinGroups/${role}/${chatId}`] = null;
  }
  // Also clear index entries for any role that might still point here.
  for (const role of GROUP_SEED_ROLES) {
    updates[`autoJoinGroups/${role}/${chatId}`] = null;
  }
  await rtdb.ref().update(updates);

  try {
    await storage.bucket().file(`chatAvatars/${chatId}.jpg`).delete();
  } catch {
    // Avatar may not exist.
  }

  return { ok: true, chatId };
});

/**
 * Ensures the caller (staff) is a member of the default community RTDB chat.
 */
export const ensureDefaultAgentGroup = onCall(callableOpts, async (request) => {
  const callerUid = await requireCaller(request, "ensureDefaultAgentGroup");
  const targetUid = String(request.data?.uid ?? callerUid);

  const caller = await db.doc(`users/${callerUid}`).get();
  const callerRole = String(caller.data()?.role ?? "");
  if (targetUid !== callerUid && callerRole !== "admin") {
    throw new HttpsError("permission-denied", "Admins only for other users.");
  }

  const target = await db.doc(`users/${targetUid}`).get();
  if (!target.exists) {
    throw new HttpsError("not-found", "User not found.");
  }
  const targetRole = String(target.data()?.role ?? "");
  if (!belongsInDefaultAgentGroup(parseRole(targetRole))) {
    throw new HttpsError(
      "failed-precondition",
      "Agents, instructors, managers, and admins only.",
    );
  }

  await addAgentToDefaultGroup(targetUid, headlineName(target.data()));
  return { ok: true, uid: targetUid, chatId: DEFAULT_AGENT_GROUP_ID };
});

/**
 * Writes an automated reply from the support bot.
 *
 * RTDB rules deny clients any write whose `senderId` is not their own uid, so
 * this callable is the only path that can post as `support-ai`. A caller may
 * only trigger it inside their own support thread.
 */
export const postSupportAiMessage = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "postSupportAiMessage");
  const chatId = String(request.data?.chatId ?? "");
  const body = String(request.data?.body ?? "").trim();
  const senderName = "Pulse Support";

  if (chatId !== `support_${uid}`) {
    throw new HttpsError("permission-denied", "Not your support chat.");
  }
  if (!body) {
    throw new HttpsError("invalid-argument", "Message body is required.");
  }
  if (body.length > MAX_SUPPORT_MESSAGE_CHARS) {
    throw new HttpsError("invalid-argument", "Message is too long.");
  }

  const chatRef = rtdb.ref(`chats/${chatId}`);
  const chatSnap = await chatRef.get();
  const chat = chatSnap.val();
  if (!chat || chat.isSupportChat !== true) {
    throw new HttpsError("not-found", "Support chat not found.");
  }
  if (chat.members?.[uid] !== true) {
    throw new HttpsError("permission-denied", "Not a member of this chat.");
  }

  const now = Date.now();
  const messageRef = rtdb.ref(`messages/${chatId}`).push();
  await messageRef.set({
    body,
    senderId: SUPPORT_AI_UID,
    senderName: senderName || "Support",
    createdAt: now,
    sharedPost: null,
    isAi: true,
  });

  const unreadCounts: Record<string, number> = {
    ...(chat.unreadCounts ?? {}),
  };
  for (const memberId of Object.keys(chat.members ?? {})) {
    unreadCounts[memberId] =
      memberId === SUPPORT_AI_UID ? 0 : (unreadCounts[memberId] ?? 0) + 1;
  }

  await rtdb.ref().update({
    [`chats/${chatId}/lastMessage`]: body,
    [`chats/${chatId}/lastMessageAt`]: now,
    [`chats/${chatId}/lastMessageSenderId`]: SUPPORT_AI_UID,
    [`chats/${chatId}/unreadCounts`]: unreadCounts,
    [`chats/${chatId}/memberNames/${SUPPORT_AI_UID}`]: senderName || "Support",
    [`userChats/${uid}/${chatId}/lastMessageAt`]: now,
  });

  return { id: messageRef.key, createdAt: now };
});

/**
 * Upload a group chat avatar. Verifies edit rights, writes via Admin Storage
 * (clients cannot write chatAvatars/ directly).
 */
export const uploadGroupAvatar = onCall(
  { ...callableOpts, memory: "512MiB", timeoutSeconds: 60 },
  async (request) => {
    const uid = await requireCaller(request, "uploadGroupAvatar");
    const chatId = String(request.data?.chatId ?? "").trim();
    const contentType = String(request.data?.contentType ?? "image/jpeg").trim();
    const base64 = String(request.data?.data ?? "");

    if (!chatId || chatId.startsWith("support_")) {
      throw new HttpsError("invalid-argument", "Valid chatId required.");
    }
    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
    if (!allowedTypes.has(contentType)) {
      throw new HttpsError("invalid-argument", "Unsupported image type.");
    }
    if (!base64 || base64.length > 7_000_000) {
      throw new HttpsError("invalid-argument", "Image too large or empty.");
    }

    const actor = await db.doc(`users/${uid}`).get();
    const actorRole = parseRole(actor.data()?.role);
    const chatSnap = await rtdb.ref(`chats/${chatId}`).get();
    const chat = (chatSnap.val() ?? null) as Record<string, unknown> | null;
    if (!chat || chat.isGroup !== true) {
      throw new HttpsError("not-found", "Group not found.");
    }
    if (chat.isSupportChat === true) {
      throw new HttpsError(
        "failed-precondition",
        "Support chats cannot have avatars.",
      );
    }

    const isStaff = actorRole === "admin" || actorRole === "manager";
    const isCreator = String(chat.createdBy ?? "") === uid;
    const isMember = Boolean(
      (chat.members as Record<string, unknown> | undefined)?.[uid],
    );
    if (!isStaff && !(isCreator && isMember)) {
      throw new HttpsError(
        "permission-denied",
        "Not allowed to edit this group.",
      );
    }

    const buffer = Buffer.from(base64, "base64");
    if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
      throw new HttpsError("invalid-argument", "Image must be under 5MB.");
    }

    const path = `chatAvatars/${chatId}.jpg`;
    const file = storage.bucket().file(path);
    await file.save(buffer, {
      metadata: {
        contentType,
        cacheControl: "public,max-age=3600",
      },
      resumable: false,
    });
    await file.makePublic().catch(() => undefined);
    const [meta] = await file.getMetadata();
    const photoUrl =
      typeof meta.mediaLink === "string" && meta.mediaLink
        ? meta.mediaLink
        : `https://storage.googleapis.com/${storage.bucket().name}/${path}`;

    await rtdb.ref(`chats/${chatId}/photoUrl`).set(photoUrl);
    return { photoUrl };
  },
);

/** Members set/clear their own emoji reaction on a non-support message. */
export const setChatReaction = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "setChatReaction");
  const chatId = String(request.data?.chatId ?? "").trim();
  const messageId = String(request.data?.messageId ?? "").trim();
  const emojiRaw = request.data?.emoji;
  const emoji =
    emojiRaw == null || emojiRaw === ""
      ? null
      : String(emojiRaw).trim();

  if (!chatId || !messageId) {
    throw new HttpsError("invalid-argument", "chatId and messageId required.");
  }
  if (chatId.startsWith("support_")) {
    throw new HttpsError(
      "failed-precondition",
      "Reactions are not allowed in support chats.",
    );
  }

  const allowed = new Set(["👍", "❤️", "😂", "😮", "😢", "🙏"]);
  if (emoji != null && !allowed.has(emoji)) {
    throw new HttpsError("invalid-argument", "Invalid reaction.");
  }

  const chatSnap = await rtdb.ref(`chats/${chatId}`).get();
  const chat = (chatSnap.val() ?? null) as Record<string, unknown> | null;
  if (!chat) {
    throw new HttpsError("not-found", "Chat not found.");
  }
  if (chat.isSupportChat === true) {
    throw new HttpsError(
      "failed-precondition",
      "Reactions are not allowed in support chats.",
    );
  }
  const members = (chat.members ?? {}) as Record<string, unknown>;
  if (members[uid] !== true) {
    throw new HttpsError("permission-denied", "Not a member of this chat.");
  }

  const messageRef = rtdb.ref(`messages/${chatId}/${messageId}`);
  const messageSnap = await messageRef.get();
  if (!messageSnap.exists()) {
    throw new HttpsError("not-found", "Message not found.");
  }

  const reactionRef = messageRef.child(`reactions/${uid}`);
  if (emoji == null) {
    await reactionRef.remove();
  } else {
    await reactionRef.set(emoji);
  }
  return { ok: true };
});
