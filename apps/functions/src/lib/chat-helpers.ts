import "./bootstrap";
import { getDatabase } from "firebase-admin/database";
import type { UserRole } from "@pulse/shared";

const rtdb = getDatabase();

export const DEFAULT_AGENT_GROUP_ID = "agents-default";
/** Synthetic sender for automated support replies; never a real account. */
export const SUPPORT_AI_UID = "support-ai";

export function chatInboxRow(
  chatId: string,
  chat: Record<string, unknown>,
  uid: string,
) {
  const members = Object.keys((chat.members ?? {}) as Record<string, unknown>)
    .filter((memberId) => memberId !== SUPPORT_AI_UID);
  const unreadCounts =
    (chat.unreadCounts ?? {}) as Record<string, unknown>;
  const pinnedBy = (chat.pinnedBy ?? {}) as Record<string, unknown>;
  const autoJoinRoles =
    (chat.autoJoinRoles ?? {}) as Record<string, unknown>;
  return {
    chatId,
    memberIds: members,
    memberNames: (chat.memberNames ?? {}) as Record<string, unknown>,
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
    isSupportChat: chat.isSupportChat === true,
    autoJoinRoles,
    photoUrl:
      typeof chat.photoUrl === "string" && chat.photoUrl
        ? String(chat.photoUrl).slice(0, 2000)
        : null,
  };
}

export async function addMemberToChat(
  chatId: string,
  uid: string,
  displayName: string,
) {
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
    const memberNames =
      current.memberNames && typeof current.memberNames === "object"
        ? { ...current.memberNames, [uid]: displayName }
        : { [uid]: displayName };
    const unreadCounts =
      current.unreadCounts && typeof current.unreadCounts === "object"
        ? { ...current.unreadCounts, [uid]: 0 }
        : { [uid]: 0 };
    joinedChat = {
      ...current,
      members,
      memberCount: Object.keys(members).length,
      memberNames,
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
  if (isAnonymous || role === "guest") return;
  if (approvalStatus !== "approved") return;
  const indexSnap = await rtdb.ref(`autoJoinGroups/${role}`).get();
  const chatIds = Object.keys(
    (indexSnap.val() ?? {}) as Record<string, unknown>,
  ).filter((chatId) => chatId && chatId !== DEFAULT_AGENT_GROUP_ID);
  await Promise.all(
    chatIds.map((chatId) => addMemberToChat(chatId, uid, displayName)),
  );
}

export async function addAgentToDefaultGroup(uid: string, displayName: string) {
  const chatRef = rtdb.ref(`chats/${DEFAULT_AGENT_GROUP_ID}`);
  const now = Date.now();

  await chatRef.transaction((current) => {
    if (current === null) {
      return {
        members: { [uid]: true },
        memberCount: 1,
        memberNames: { [uid]: displayName },
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
    const memberNames =
      current.memberNames && typeof current.memberNames === "object"
        ? { ...current.memberNames, [uid]: displayName }
        : { [uid]: displayName };
    const unreadCounts =
      current.unreadCounts && typeof current.unreadCounts === "object"
        ? { ...current.unreadCounts, [uid]: 0 }
        : { [uid]: 0 };

    return {
      ...current,
      members,
      memberCount: Object.keys(members).length,
      memberNames,
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
