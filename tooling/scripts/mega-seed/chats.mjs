import { config } from "./config.mjs";
import { log } from "./admin.mjs";

const MAX_GROUP = 20;
const MAX_ROLE_SEED = 200;
const DEFAULT_AGENT_GROUP_ID = "agents-default";

function dmKeyFor(a, b) {
  return [a, b].sort().join("_");
}

function inboxRow(chatId, chat, uid) {
  const members = Object.keys(chat.members ?? {}).filter(Boolean);
  return {
    chatId,
    memberIds: members,
    memberNames: chat.memberNames ?? {},
    isGroup: chat.isGroup === true,
    title: chat.title ?? null,
    dmKey: chat.dmKey ?? null,
    lastMessage: String(chat.lastMessage ?? "").slice(0, 4000),
    lastMessageAt: Number(chat.lastMessageAt ?? 0),
    lastMessageSenderId: chat.lastMessageSenderId ?? null,
    unreadCount: Number((chat.unreadCounts ?? {})[uid] ?? 0),
    pinned: (chat.pinnedBy ?? {})[uid] === true,
    createdAt: Number(chat.createdAt ?? 0),
    createdBy: String(chat.createdBy ?? ""),
    isDefaultAgentGroup: chat.isDefaultAgentGroup === true,
    isSupportChat: chat.isSupportChat === true,
    autoJoinRoles: chat.autoJoinRoles ?? {},
  };
}

/**
 * Write via RTDB emulator REST (Bearer owner). Avoids Admin SDK websocket hangs.
 */
async function patchRest(path, data) {
  const ns = `${config.project}-default-rtdb`;
  const url = `http://${config.databaseHost}/${path}.json?ns=${encodeURIComponent(ns)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer owner",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`RTDB PUT ${path}: ${res.status} ${await res.text()}`);
  }
}

async function updateRest(updates) {
  // Emulator accepts PATCH at root with shallow merge of top-level keys only;
  // nested paths need slash-encoded deep updates via PATCH with path keys.
  const ns = `${config.project}-default-rtdb`;
  const url = `http://${config.databaseHost}/.json?ns=${encodeURIComponent(ns)}`;
  const entries = Object.entries(updates);
  const chunkSize = 80;
  for (let i = 0; i < entries.length; i += chunkSize) {
    const slice = Object.fromEntries(entries.slice(i, i + chunkSize));
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer owner",
      },
      body: JSON.stringify(slice),
    });
    if (!res.ok) {
      // Fallback: write each path individually
      for (const [path, value] of entries.slice(i, i + chunkSize)) {
        await patchRest(path, value);
      }
    }
  }
}

/**
 * @param {{ users: Array<{uid:string,displayName:string,role:string,approvalStatus:string}>, byRole: Record<string,string[]>, fixtures: Record<string,string> }} userCtx
 */
export async function seedChats(userCtx) {
  log(
    "chats",
    `${config.dmChats} DMs, ${config.groupChats} groups, ${config.messagesPerChat} msgs/chat`,
  );
  const approved = userCtx.users.filter((u) => u.approvalStatus === "approved");
  if (approved.length < 2) throw new Error("Need ≥2 approved users for chats");

  const byUid = Object.fromEntries(approved.map((u) => [u.uid, u]));
  const updates = {};
  const now = Date.now();

  const agentUids = (userCtx.byRole.agent ?? []).slice(0, MAX_ROLE_SEED);
  if (agentUids.length) {
    const members = Object.fromEntries(agentUids.map((uid) => [uid, true]));
    const memberNames = Object.fromEntries(
      agentUids.map((uid) => [uid, byUid[uid]?.displayName ?? "Agent"]),
    );
    const unreadCounts = Object.fromEntries(agentUids.map((uid) => [uid, 0]));
    const chat = {
      members,
      memberNames,
      memberCount: agentUids.length,
      isGroup: true,
      title: "All Agents",
      dmKey: null,
      lastMessage: "Welcome to the agent lounge (mega-seed).",
      lastMessageAt: now,
      lastMessageSenderId: agentUids[0],
      unreadCounts,
      pinnedBy: {},
      createdAt: now - 86_400_000,
      createdBy: userCtx.fixtures["admin@pulse.local"] ?? agentUids[0],
      isDefaultAgentGroup: true,
      isSupportChat: false,
      autoJoinRoles: { agent: true },
    };
    updates[`chats/${DEFAULT_AGENT_GROUP_ID}`] = chat;
    updates[`autoJoinGroups/agent/${DEFAULT_AGENT_GROUP_ID}`] = true;
    for (const uid of agentUids) {
      updates[`userChats/${uid}/${DEFAULT_AGENT_GROUP_ID}`] = inboxRow(
        DEFAULT_AGENT_GROUP_ID,
        chat,
        uid,
      );
    }
    for (let m = 0; m < Math.min(config.messagesPerChat, 8); m++) {
      const sender = agentUids[m % agentUids.length];
      const msgId = `m${String(m).padStart(3, "0")}`;
      updates[`messages/${DEFAULT_AGENT_GROUP_ID}/${msgId}`] = {
        text: `Agent lounge message ${m + 1}`,
        senderId: sender,
        senderName: memberNames[sender],
        createdAt: now - (8 - m) * 60_000,
        type: "text",
      };
    }
  }

  const dmCount = Math.min(
    config.dmChats,
    Math.floor((approved.length * (approved.length - 1)) / 2),
  );
  for (let i = 0; i < dmCount; i++) {
    const a = approved[i % approved.length];
    const b = approved[(i * 7 + 3) % approved.length];
    if (a.uid === b.uid) continue;
    const key = dmKeyFor(a.uid, b.uid);
    const chatId = key;
    const createdAt = now - i * 45_000;
    const lastSender = i % 2 === 0 ? a : b;
    const lastMessage = `DM load #${i + 1}`;
    const chat = {
      members: { [a.uid]: true, [b.uid]: true },
      memberNames: { [a.uid]: a.displayName, [b.uid]: b.displayName },
      memberCount: 2,
      isGroup: false,
      title: null,
      dmKey: key,
      lastMessage,
      lastMessageAt: createdAt + config.messagesPerChat * 1_000,
      lastMessageSenderId: lastSender.uid,
      unreadCounts: {
        [a.uid]: i % 5 === 0 ? 2 : 0,
        [b.uid]: i % 7 === 0 ? 1 : 0,
      },
      pinnedBy: {},
      createdAt,
      createdBy: a.uid,
      isDefaultAgentGroup: false,
      isSupportChat: false,
      autoJoinRoles: {},
    };
    updates[`chats/${chatId}`] = chat;
    updates[`dmIndex/${key}`] = chatId;
    updates[`userChats/${a.uid}/${chatId}`] = inboxRow(chatId, chat, a.uid);
    updates[`userChats/${b.uid}/${chatId}`] = inboxRow(chatId, chat, b.uid);
    for (let m = 0; m < config.messagesPerChat; m++) {
      const sender = m % 2 === 0 ? a : b;
      const msgId = `m${String(m).padStart(3, "0")}`;
      updates[`messages/${chatId}/${msgId}`] = {
        text: `Message ${m + 1} in DM ${i + 1}`,
        senderId: sender.uid,
        senderName: sender.displayName,
        createdAt: createdAt + m * 1_000,
        type: "text",
      };
    }
  }

  const creators = [
    ...(userCtx.byRole.manager ?? []),
    ...(userCtx.byRole.admin ?? []),
    ...(userCtx.byRole.agent ?? []).slice(0, 50),
  ];
  for (let g = 0; g < config.groupChats; g++) {
    const creatorUid =
      creators[g % Math.max(1, creators.length)] ?? approved[0].uid;
    const creator = byUid[creatorUid] ?? approved[0];
    const memberIds = new Set([creator.uid]);
    for (let k = 1; k < MAX_GROUP; k++) {
      memberIds.add(approved[(g * 11 + k * 3) % approved.length].uid);
    }
    const ids = [...memberIds];
    const chatId = `group-${String(g).padStart(4, "0")}`;
    const createdAt = now - g * 90_000;
    const members = Object.fromEntries(ids.map((uid) => [uid, true]));
    const memberNames = Object.fromEntries(
      ids.map((uid) => [uid, byUid[uid]?.displayName ?? "User"]),
    );
    const unreadCounts = Object.fromEntries(
      ids.map((uid, idx) => [uid, idx === 1 && g % 4 === 0 ? 3 : 0]),
    );
    const lastSender = ids[g % ids.length];
    const chat = {
      members,
      memberNames,
      memberCount: ids.length,
      isGroup: true,
      title: `Team ${g + 1}`,
      dmKey: null,
      lastMessage: `Group update ${g + 1}`,
      lastMessageAt: createdAt + config.messagesPerChat * 2_000,
      lastMessageSenderId: lastSender,
      unreadCounts,
      pinnedBy: {},
      createdAt,
      createdBy: creator.uid,
      isDefaultAgentGroup: false,
      isSupportChat: false,
      autoJoinRoles: {},
    };
    updates[`chats/${chatId}`] = chat;
    for (const uid of ids) {
      updates[`userChats/${uid}/${chatId}`] = inboxRow(chatId, chat, uid);
    }
    for (let m = 0; m < config.messagesPerChat; m++) {
      const sender = ids[m % ids.length];
      const msgId = `m${String(m).padStart(3, "0")}`;
      updates[`messages/${chatId}/${msgId}`] = {
        text: `Group ${g + 1} message ${m + 1}`,
        senderId: sender,
        senderName: memberNames[sender],
        createdAt: createdAt + m * 2_000,
        type: "text",
      };
    }
  }

  const presenceCount = Math.floor(approved.length * config.presenceRate);
  for (let i = 0; i < presenceCount; i++) {
    const u = approved[i];
    updates[`presence/${u.uid}`] = {
      state: i % 5 === 0 ? "away" : "online",
      lastChanged: now - i * 1_000,
    };
  }

  await updateRest(updates);
  log(
    "chats",
    `RTDB written · presence ${presenceCount} · default agent members ${agentUids.length}`,
  );
}
