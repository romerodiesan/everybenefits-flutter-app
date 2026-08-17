import { onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onValueCreated, onValueWritten } from "firebase-functions/v2/database";
import { HttpsError } from "firebase-functions/v2/https";
import type { DocumentData } from "firebase-admin/firestore";
import {
  GROUP_SEED_ROLES,
  belongsInDefaultAgentGroup,
  canConfigureGroupAutoJoin,
  canCreateChatGroups,
  parseRole,
  parseUsername,
  parseMentions,
  type UserRole,
} from "@pulse/shared";
import { db, rtdb, callableOpts } from "./init";
import {
  DEFAULT_AGENT_GROUP_ID,
  MAX_GROUP_MEMBERS,
  MAX_ROLE_SEED_MEMBERS,
} from "./constants";
import {
  headlineName,
  isUserApprovedForJoin,
} from "./auth";
import { actorHasPermission, requireActor, requireCaller } from "./guards";
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

  await chatRef.transaction((current) => {
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

  await rtdb.ref(`userChats/${uid}/${DEFAULT_AGENT_GROUP_ID}`).set({
    lastMessageAt: now,
  });
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
  const uid = await requireCaller(request, "createDm");
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

  const allowDirect =
    publicSnap.exists
      ? publicSnap.data()?.allowDirectMessages !== false
      : (otherData.privacy as { allowDirectMessages?: boolean } | undefined)
          ?.allowDirectMessages !== false;
  if (!allowDirect) {
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
    return {
      chatId: dmKey,
      createdAt: Number(chat.createdAt ?? Date.now()),
      existing: true,
      memberIds,
      memberNames: (chat.memberNames ?? {}) as Record<string, string>,
    };
  }

  if (!(await areMutualContacts(uid, otherUid))) {
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
 * Ensures the caller (staff) is a member of the default community RTDB chat.
 */
export const ensureDefaultAgentGroup = onCall(callableOpts, async (request) => {
  const actor = await requireActor(request, "ensureDefaultAgentGroup");
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
  if (!belongsInDefaultAgentGroup(targetRole)) {
    throw new HttpsError(
      "failed-precondition",
      "Role lacks default agent group permission.",
    );
  }

  await addAgentToDefaultGroup(targetUid, headlineName(target.data()));
  return { ok: true, uid: targetUid, chatId: DEFAULT_AGENT_GROUP_ID };
});
