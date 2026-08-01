"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgency = exports.exchangeSsoToken = exports.createSsoHandoff = exports.onThreadCreated = exports.purgeDeletedAccounts = exports.cancelAccountDeletion = exports.requestAccountDeletion = exports.reactivateAccount = exports.deactivateAccount = exports.onCoursePublished = exports.markAllNotificationsRead = exports.markNotificationRead = exports.setChatReaction = exports.uploadGroupAvatar = exports.postSupportAiMessage = exports.ensureDefaultAgentGroup = exports.submitQuizAttempt = exports.searchDirectory = exports.listPublicProfiles = exports.assignUserToOrgNode = exports.moveOrgNode = exports.updateOrgNode = exports.createOrgNode = exports.listOrgSubtree = exports.ensureOrgRoot = exports.getAdminInsights = exports.listCourseStudents = exports.getCatalogInsights = exports.getCourseInsights = exports.adminReactivateUser = exports.adminDeactivateUser = exports.listUsersForAdmin = exports.listStudentsForPromotion = exports.listPendingApprovals = exports.setUserApproval = exports.setUserRole = exports.deleteForumThread = exports.deleteForumReply = exports.addForumReply = exports.castForumVote = exports.saveCourseProgress = exports.enrollInCourse = exports.deleteGroupChat = exports.updateGroupChat = exports.createGroupChat = exports.rebuildChatInbox = exports.syncChatInbox = exports.onPresenceWritten = exports.syncUserAutoJoinGroups = exports.syncPublicProfile = void 0;
exports.completeInvite = exports.getInvite = exports.createUserInvite = exports.onUserPendingApproval = exports.adminSendNotification = exports.repairOrgTree = void 0;
const node_crypto_1 = require("node:crypto");
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const database_1 = require("firebase-admin/database");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const https_1 = require("firebase-functions/v2/https");
const firestore_2 = require("firebase-functions/v2/firestore");
const database_2 = require("firebase-functions/v2/database");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const v2_1 = require("firebase-functions/v2");
const shared_1 = require("@pulse/shared");
const notifications_1 = require("./notifications");
const email_1 = require("./email");
// Insights module is imported lazily inside Studio callables to shrink cold
// starts for chat/forum/admin paths that share this codebase.
(0, app_1.initializeApp)({
    databaseURL: process.env.FIREBASE_DATABASE_URL ||
        "https://every-benefits-us-default-rtdb.firebaseio.com",
});
(0, v2_1.setGlobalOptions)({ region: "us-central1", maxInstances: 20 });
/** Gen2 callables need explicit CORS for browser (e.g. localhost webapp). */
const usingFunctionsEmulator = process.env.FUNCTIONS_EMULATOR === "true";
/** Opt-in: set FUNCTIONS_ENFORCE_APP_CHECK=true once Pulse/Studio site keys are live. */
const enforceAppCheck = !usingFunctionsEmulator &&
    process.env.FUNCTIONS_ENFORCE_APP_CHECK === "true";
const callableOpts = {
    // Emulator Gen2 often drops Access-Control headers on preflight when cors is
    // an allow-list; open it fully locally. Production keeps an explicit list.
    cors: usingFunctionsEmulator
        ? true
        : [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
            "http://localhost:3002",
            "http://127.0.0.1:3002",
            "https://every-insurance.web.app",
            "https://every-insurance.firebaseapp.com",
            "https://pulse.everybenefits.us",
            "https://studio.everybenefits.us",
            "https://admin.everybenefits.us",
            "https://pulse-web-app--every-benefits-us.us-central1.hosted.app",
            "https://studio-web-app--every-benefits-us.us-central1.hosted.app",
            "https://admin-web-app--every-benefits-us.us-central1.hosted.app",
            ...(process.env.FUNCTIONS_ALLOWED_ORIGINS ?? "")
                .split(",")
                .map((origin) => origin.trim())
                .filter(Boolean),
        ],
    // Emulator clients skip App Check. Production stays off until site keys are
    // configured on pulse.everybenefits.us / studio.everybenefits.us, then set
    // FUNCTIONS_ENFORCE_APP_CHECK=true.
    enforceAppCheck,
    // Auth is enforced inside the handler; Cloud Run must allow the OPTIONS preflight.
    invoker: "public",
};
const db = (0, firestore_1.getFirestore)();
const rtdb = (0, database_1.getDatabase)();
const auth = (0, auth_1.getAuth)();
const storage = (0, storage_1.getStorage)();
const DEFAULT_AGENT_GROUP_ID = "agents-default";
/** Synthetic sender for automated support replies; never a real account. */
const SUPPORT_AI_UID = "support-ai";
const MAX_SUPPORT_MESSAGE_CHARS = 2000;
/** Mirrors QUIZ_DEFAULT_PASS_PERCENT / kQuizDefaultPassPercent in the clients. */
const DEFAULT_QUIZ_PASS_PERCENT = 70;
/** Upper bound on option indexes, so a hostile payload can't balloon a set. */
const MAX_QUIZ_OPTIONS = 20;
const MAX_GROUP_MEMBERS = 20;
/** Cap auto-join default groups to limit RTDB fan-out per message. */
const MAX_ROLE_SEED_MEMBERS = 100;
/** Skip per-member push fan-out above this (inbox rows still update). */
const MAX_CHAT_NOTIFY_RECIPIENTS = 50;
const MAX_FUNCTION_CALLS_PER_MINUTE = 30;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const emailSecretsOpts = email_1.emailSecrets.length > 0 ? { secrets: email_1.emailSecrets } : {};
const callableWithEmailOpts = { ...callableOpts, ...emailSecretsOpts };
function parseVote(raw) {
    const n = typeof raw === "number" ? raw : Number(raw);
    if (n === -1 || n === 0 || n === 1)
        return n;
    throw new https_1.HttpsError("invalid-argument", "vote must be -1, 0, or 1");
}
function headlineName(data) {
    const display = typeof data?.displayName === "string" ? data.displayName.trim() : "";
    if (display)
        return display;
    const email = typeof data?.email === "string" ? data.email.trim() : "";
    if (email)
        return email;
    return "Usuario";
}
async function consumeFunctionQuota(uid, operation) {
    const minute = Math.floor(Date.now() / 60000);
    const ref = db.doc(`functionUsage/${uid}_${minute}`);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const count = Number(snap.data()?.count ?? 0);
        if (count >= MAX_FUNCTION_CALLS_PER_MINUTE) {
            throw new https_1.HttpsError("resource-exhausted", "Too many requests.");
        }
        tx.set(ref, {
            uid,
            minute,
            count: count + 1,
            operations: firestore_1.FieldValue.arrayUnion(operation),
            expiresAt: firestore_1.Timestamp.fromMillis((minute + 2) * 60000),
        }, { merge: true });
    });
}
async function requireActiveAccount(uid) {
    const snap = await db.doc(`users/${uid}`).get();
    const data = snap.data();
    const status = String(data?.accountStatus ?? "active");
    if (status === "deactivated" || status === "pendingDeletion") {
        throw new https_1.HttpsError("failed-precondition", "Account is deactivated or pending deletion.");
    }
    return data;
}
/** Community surfaces require an approved (or legacy unset) profile. */
async function requireApprovedMember(uid) {
    const data = await requireActiveAccount(uid);
    if (!data || data.isAnonymous === true || (0, shared_1.parseRole)(data.role) === "guest") {
        throw new https_1.HttpsError("permission-denied", "Registered members only.");
    }
    if (!(0, shared_1.isUserApproved)(data.approvalStatus)) {
        throw new https_1.HttpsError("permission-denied", "Account is pending approval.");
    }
    return data;
}
async function requireCaller(request, operation, options) {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Sign in required.");
    await consumeFunctionQuota(uid, operation);
    if (!options?.allowInactive) {
        await requireActiveAccount(uid);
    }
    return uid;
}
function chatInboxRow(chatId, chat, uid) {
    const members = Object.keys((chat.members ?? {}))
        .filter((memberId) => memberId !== SUPPORT_AI_UID);
    const unreadCounts = (chat.unreadCounts ?? {});
    const pinnedBy = (chat.pinnedBy ?? {});
    const autoJoinRoles = (chat.autoJoinRoles ?? {});
    return {
        chatId,
        memberIds: members,
        memberNames: (chat.memberNames ?? {}),
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
        photoUrl: typeof chat.photoUrl === "string" && chat.photoUrl
            ? String(chat.photoUrl).slice(0, 2000)
            : null,
    };
}
/** Slim patch for message/unread bumps — avoids rewriting member maps. */
function chatInboxSlimPatch(chat, uid) {
    const unreadCounts = (chat.unreadCounts ?? {});
    const pinnedBy = (chat.pinnedBy ?? {});
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
function membersEqual(a, b) {
    const ak = Object.keys(a).sort();
    const bk = Object.keys(b).sort();
    if (ak.length !== bk.length)
        return false;
    return ak.every((k, i) => k === bk[i] && a[k] === true && b[k] === true);
}
function applyUnreadTotalDeltas(updates, beforeUnread, afterUnread, memberIds) {
    for (const uid of memberIds) {
        const prev = Number(beforeUnread[uid] ?? 0);
        const next = Number(afterUnread[uid] ?? 0);
        const delta = next - prev;
        if (delta === 0)
            continue;
        updates[`userMeta/${uid}/chatUnreadTotal`] =
            database_1.ServerValue.increment(delta);
    }
}
function isUserApprovedForJoin(data) {
    if (!data || data.isAnonymous === true)
        return false;
    const status = String(data.approvalStatus ?? "approved");
    return status === "approved";
}
async function addMemberToChat(chatId, uid, displayName) {
    const chatRef = rtdb.ref(`chats/${chatId}`);
    let joinedChat = null;
    await chatRef.transaction((current) => {
        if (current === null || typeof current !== "object") {
            return; // abort — chat gone
        }
        const members = current.members && typeof current.members === "object"
            ? { ...current.members }
            : {};
        if (members[uid] === true) {
            joinedChat = current;
            return; // abort — already a member
        }
        members[uid] = true;
        const memberNames = current.memberNames && typeof current.memberNames === "object"
            ? { ...current.memberNames, [uid]: displayName }
            : { [uid]: displayName };
        const unreadCounts = current.unreadCounts && typeof current.unreadCounts === "object"
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
        joinedChat = snap.val() ?? null;
    }
    if (joinedChat?.members &&
        joinedChat.members[uid] === true) {
        await rtdb
            .ref(`userChats/${uid}/${chatId}`)
            .set(chatInboxRow(chatId, joinedChat, uid));
    }
}
async function ensureAutoJoinMemberships(uid, role, approvalStatus, displayName, isAnonymous) {
    if (isAnonymous || role === "guest")
        return;
    if (approvalStatus !== "approved")
        return;
    const indexSnap = await rtdb.ref(`autoJoinGroups/${role}`).get();
    const chatIds = Object.keys((indexSnap.val() ?? {})).filter((chatId) => chatId && chatId !== DEFAULT_AGENT_GROUP_ID);
    await Promise.all(chatIds.map((chatId) => addMemberToChat(chatId, uid, displayName)));
}
async function collectUsersByRoles(roles, cap) {
    const byUid = new Map();
    if (!roles.length)
        return byUid;
    // Query per role (avoids composite index); filter approval in memory.
    await Promise.all(roles.map(async (role) => {
        const snap = await db
            .collection("users")
            .where("role", "==", role)
            .limit(cap)
            .get();
        for (const doc of snap.docs) {
            if (byUid.size >= cap)
                break;
            const data = doc.data();
            if (!isUserApprovedForJoin(data))
                continue;
            if ((0, shared_1.parseRole)(data.role) === "guest")
                continue;
            byUid.set(doc.id, data);
        }
    }));
    return byUid;
}
async function addAgentToDefaultGroup(uid, displayName) {
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
        const members = current.members && typeof current.members === "object"
            ? { ...current.members }
            : {};
        if (members[uid] === true) {
            return; // abort — already a member
        }
        members[uid] = true;
        const memberNames = current.memberNames && typeof current.memberNames === "object"
            ? { ...current.memberNames, [uid]: displayName }
            : { [uid]: displayName };
        const unreadCounts = current.unreadCounts && typeof current.unreadCounts === "object"
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
            title: current.title === "Agents" || current.title == null
                ? "Team"
                : current.title,
            createdBy: current.createdBy ?? "system",
        };
    });
    await rtdb.ref(`userChats/${uid}/${DEFAULT_AGENT_GROUP_ID}`).set({
        lastMessageAt: now,
    });
}
exports.syncPublicProfile = (0, firestore_2.onDocumentWritten)("users/{uid}", async (event) => {
    const uid = event.params.uid;
    const after = event.data?.after;
    const ref = db.doc(`publicProfiles/${uid}`);
    if (!after?.exists) {
        await ref.delete();
        return;
    }
    const data = after.data() ?? {};
    await ref.set({
        uid,
        displayName: typeof data.displayName === "string" ? data.displayName.slice(0, 120) : null,
        photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
        role: String(data.role ?? "student"),
        agency: typeof data.agency === "string" ? data.agency.slice(0, 120) : null,
        isAnonymous: data.isAnonymous === true,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
});
/** Join auto-join groups when role or approvalStatus changes. */
exports.syncUserAutoJoinGroups = (0, firestore_2.onDocumentWritten)("users/{uid}", async (event) => {
    const uid = event.params.uid;
    const before = event.data?.before;
    const after = event.data?.after;
    if (!after?.exists)
        return;
    const beforeData = before?.exists ? before.data() : undefined;
    const afterData = after.data() ?? {};
    const beforeRole = beforeData ? (0, shared_1.parseRole)(beforeData.role) : null;
    const afterRole = (0, shared_1.parseRole)(afterData.role);
    const beforeApproval = String(beforeData?.approvalStatus ?? "approved");
    const afterApproval = String(afterData.approvalStatus ?? "approved");
    if (before?.exists &&
        beforeRole === afterRole &&
        beforeApproval === afterApproval) {
        return;
    }
    await ensureAutoJoinMemberships(uid, afterRole, afterApproval, headlineName(afterData), afterData.isAnonymous === true);
});
/**
 * Maintain presenceStats/onlineCount when clients set/clear presence/{uid}.
 * Clients cannot write the counter directly (rules write:false).
 */
exports.onPresenceWritten = (0, database_2.onValueWritten)({ ref: "/presence/{uid}", region: "us-central1" }, async (event) => {
    const before = event.data.before.exists();
    const after = event.data.after.exists();
    let delta = 0;
    if (!before && after)
        delta = 1;
    else if (before && !after)
        delta = -1;
    else
        return;
    const countRef = rtdb.ref("presenceStats/onlineCount");
    await countRef.transaction((current) => {
        const n = typeof current === "number" ? current : 0;
        return Math.max(0, n + delta);
    });
});
exports.syncChatInbox = (0, database_2.onValueWritten)({ ref: "/chats/{chatId}", region: "us-central1" }, async (event) => {
    const chatId = event.params.chatId;
    const before = (event.data.before.val() ?? {});
    const after = (event.data.after.val() ?? {});
    const beforeMembersMap = (before.members ?? {});
    const afterMembersMap = (after.members ?? {});
    const beforeMembers = Object.keys(beforeMembersMap).filter((uid) => uid !== SUPPORT_AI_UID);
    const members = Object.keys(afterMembersMap).filter((uid) => uid !== SUPPORT_AI_UID);
    const removed = beforeMembers.filter((uid) => !members.includes(uid));
    const updates = {};
    const beforeUnread = (before.unreadCounts ?? {});
    const afterUnread = (after.unreadCounts ?? {});
    if (!event.data.after.exists()) {
        for (const uid of beforeMembers) {
            const prev = Number(beforeUnread[uid] ?? 0);
            updates[`userChats/${uid}/${chatId}`] = null;
            if (prev > 0) {
                updates[`userMeta/${uid}/chatUnreadTotal`] =
                    database_1.ServerValue.increment(-prev);
            }
        }
        if (Object.keys(updates).length)
            await rtdb.ref().update(updates);
        console.info(JSON.stringify({
            scale: "syncChatInbox",
            chatId,
            deleted: true,
            membersTouched: beforeMembers.length,
        }));
        return;
    }
    const membershipChanged = !membersEqual(beforeMembersMap, afterMembersMap);
    const beforeAt = Number(before.lastMessageAt ?? 0);
    const afterAt = Number(after.lastMessageAt ?? 0);
    const messageBumped = afterAt > beforeAt;
    const titleChanged = String(before.title ?? "") !== String(after.title ?? "");
    const photoChanged = String(before.photoUrl ?? "") !== String(after.photoUrl ?? "");
    if (membershipChanged) {
        for (const uid of removed) {
            const prev = Number(beforeUnread[uid] ?? 0);
            updates[`userChats/${uid}/${chatId}`] = null;
            if (prev > 0) {
                updates[`userMeta/${uid}/chatUnreadTotal`] =
                    database_1.ServerValue.increment(-prev);
            }
        }
        for (const uid of members) {
            updates[`userChats/${uid}/${chatId}`] = chatInboxRow(chatId, after, uid);
        }
        // Recalculate unread totals for current members from before→after.
        applyUnreadTotalDeltas(updates, beforeUnread, afterUnread, members);
    }
    else {
        // Message / unread / meta-only: patch slim fields, not full member maps.
        const touched = new Set();
        if (messageBumped || titleChanged || photoChanged) {
            for (const uid of members)
                touched.add(uid);
        }
        else {
            for (const uid of members) {
                if (Number(beforeUnread[uid] ?? 0) !== Number(afterUnread[uid] ?? 0)) {
                    touched.add(uid);
                }
                const beforePinned = (before.pinnedBy ?? {})[uid] === true;
                const afterPinned = (after.pinnedBy ?? {})[uid] === true;
                if (beforePinned !== afterPinned)
                    touched.add(uid);
            }
        }
        for (const uid of touched) {
            const patch = chatInboxSlimPatch(after, uid);
            for (const [key, value] of Object.entries(patch)) {
                updates[`userChats/${uid}/${chatId}/${key}`] = value;
            }
        }
        applyUnreadTotalDeltas(updates, beforeUnread, afterUnread, [...touched]);
    }
    if (Object.keys(updates).length)
        await rtdb.ref().update(updates);
    console.info(JSON.stringify({
        scale: "syncChatInbox",
        chatId,
        membershipChanged,
        messageBumped,
        memberCount: members.length,
        updateKeys: Object.keys(updates).length,
    }));
    // Push when a new message bumps unread for recipients.
    const senderId = String(after.lastMessageSenderId ?? "");
    if (!messageBumped || !senderId)
        return;
    const preview = String(after.lastMessage ?? "").slice(0, 120);
    const isSupport = after.isSupportChat === true;
    const memberNames = (after.memberNames ?? {});
    const senderName = String(memberNames[senderId] ?? "").trim() || "Someone";
    const notifyTargets = members.filter((uid) => {
        if (uid === senderId)
            return false;
        const prev = Number(beforeUnread[uid] ?? 0);
        const next = Number(afterUnread[uid] ?? 0);
        return next > prev;
    });
    // Large groups: inbox updates only — avoid O(N) notify/FCM in one trigger.
    if (!isSupport &&
        notifyTargets.length > MAX_CHAT_NOTIFY_RECIPIENTS) {
        console.info(JSON.stringify({
            scale: "syncChatInbox",
            chatId,
            notifySkipped: notifyTargets.length,
            reason: "group_too_large",
        }));
        return;
    }
    await Promise.all(notifyTargets.map(async (uid) => {
        await (0, notifications_1.notifyUser)(uid, {
            type: isSupport ? "support_message" : "chat_message",
            title: isSupport ? "Support" : "New message",
            body: preview || "You have a new message",
            href: `/chats/${chatId}`,
            deepLink: `pulse://chats/${chatId}`,
            ref: { chatId },
            actorId: senderId,
            actorName: senderName,
        }, { chatIdForDebounce: chatId });
    }));
});
exports.rebuildChatInbox = (0, https_1.onCall)(callableOpts, async (request) => {
    const uid = await requireCaller(request, "rebuildChatInbox");
    const index = await rtdb.ref(`userChats/${uid}`).get();
    const chatIds = Object.keys((index.val() ?? {}));
    const updates = {};
    await Promise.all(chatIds.slice(0, 100).map(async (chatId) => {
        const chat = await rtdb.ref(`chats/${chatId}`).get();
        const value = chat.val();
        if (value?.members &&
            value.members[uid] === true) {
            updates[`userChats/${uid}/${chatId}`] = chatInboxRow(chatId, value, uid);
        }
    }));
    if (Object.keys(updates).length)
        await rtdb.ref().update(updates);
    return { ok: true };
});
exports.createGroupChat = (0, https_1.onCall)(callableOpts, async (request) => {
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
        ...new Set(rawSeedRoles
            .map((role) => (0, shared_1.parseRole)(role))
            .filter((role) => shared_1.GROUP_SEED_ROLES.includes(role))),
    ];
    if (!title || title.length > 120) {
        throw new https_1.HttpsError("invalid-argument", "Valid group title required.");
    }
    const creator = await db.doc(`users/${uid}`).get();
    const creatorRole = (0, shared_1.parseRole)(creator.data()?.role);
    if (!shared_1.GROUP_CREATOR_ROLES.includes(creatorRole)) {
        throw new https_1.HttpsError("permission-denied", "Not allowed to create groups.");
    }
    const persistAutoJoin = wantAutoJoin &&
        seedRoles.length > 0 &&
        (0, shared_1.canConfigureGroupAutoJoin)(creatorRole);
    if (wantAutoJoin && seedRoles.length > 0 && !persistAutoJoin) {
        throw new https_1.HttpsError("permission-denied", "Only admins and managers can enable auto-join.");
    }
    const explicitIds = [...new Set([uid, ...requested])]
        .filter((id) => id && id !== SUPPORT_AI_UID);
    const roleUsers = await collectUsersByRoles(seedRoles, MAX_ROLE_SEED_MEMBERS);
    const truncated = seedRoles.length > 0 && roleUsers.size >= MAX_ROLE_SEED_MEMBERS;
    const memberIdSet = new Set(explicitIds);
    for (const memberId of roleUsers.keys()) {
        if (memberIdSet.size >= MAX_ROLE_SEED_MEMBERS) {
            break;
        }
        memberIdSet.add(memberId);
    }
    const memberIds = [...memberIdSet];
    const maxAllowed = seedRoles.length > 0 ? MAX_ROLE_SEED_MEMBERS : MAX_GROUP_MEMBERS;
    if (memberIds.length < 2) {
        throw new https_1.HttpsError("invalid-argument", "Group must include the creator and at least one other member or matching role.");
    }
    if (memberIds.length > maxAllowed) {
        throw new https_1.HttpsError("invalid-argument", `Group cannot exceed ${maxAllowed} members.`);
    }
    // Fetch any explicit members not already loaded via role query.
    const missing = memberIds.filter((id) => !roleUsers.has(id));
    const fetched = missing.length > 0
        ? await db.getAll(...missing.map((id) => db.doc(`users/${id}`)))
        : [];
    if (fetched.some((profile) => !profile.exists)) {
        throw new https_1.HttpsError("failed-precondition", "Unknown group member.");
    }
    for (const profile of fetched) {
        roleUsers.set(profile.id, profile.data() ?? {});
    }
    const memberNames = Object.fromEntries(memberIds.map((id) => [id, headlineName(roleUsers.get(id))]));
    const autoJoinRolesMap = persistAutoJoin
        ? Object.fromEntries(seedRoles.map((role) => [role, true]))
        : {};
    const now = Date.now();
    const chatRef = rtdb.ref("chats").push();
    const chatId = chatRef.key;
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
    const updates = {
        [`chats/${chatId}`]: chat,
    };
    for (const memberId of memberIds) {
        updates[`userChats/${memberId}/${chatId}`] = chatInboxRow(chatId, chat, memberId);
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
exports.updateGroupChat = (0, https_1.onCall)(callableOpts, async (request) => {
    const uid = await requireCaller(request, "updateGroupChat");
    const chatId = String(request.data?.chatId ?? "").trim();
    if (!chatId) {
        throw new https_1.HttpsError("invalid-argument", "chatId required.");
    }
    const actor = await db.doc(`users/${uid}`).get();
    const actorRole = (0, shared_1.parseRole)(actor.data()?.role);
    const chatSnap = await rtdb.ref(`chats/${chatId}`).get();
    const chat = (chatSnap.val() ?? null);
    if (!chat || chat.isGroup !== true) {
        throw new https_1.HttpsError("not-found", "Group not found.");
    }
    if (chat.isSupportChat === true) {
        throw new https_1.HttpsError("failed-precondition", "Support chats cannot be edited.");
    }
    const isStaff = actorRole === "admin" || actorRole === "manager";
    const isCreator = String(chat.createdBy ?? "") === uid;
    const isMember = Boolean(chat.members?.[uid]);
    if (!isStaff && !(isCreator && isMember)) {
        throw new https_1.HttpsError("permission-denied", "Not allowed to edit this group.");
    }
    const titleRaw = request.data?.title;
    const title = titleRaw === undefined ? undefined : String(titleRaw ?? "").trim();
    if (title !== undefined && (!title || title.length > 120)) {
        throw new https_1.HttpsError("invalid-argument", "Valid group title required.");
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
        ...new Set(rawSeedRoles
            .map((role) => (0, shared_1.parseRole)(role))
            .filter((role) => shared_1.GROUP_SEED_ROLES.includes(role))),
    ];
    const wantAutoJoin = request.data?.autoJoin === true;
    const autoJoinRolesInput = Array.isArray(request.data?.autoJoinRoles)
        ? request.data.autoJoinRoles
            .map((role) => (0, shared_1.parseRole)(role))
            .filter((role) => shared_1.GROUP_SEED_ROLES.includes(role))
        : null;
    if ((wantAutoJoin || (autoJoinRolesInput && autoJoinRolesInput.length > 0)) &&
        !(0, shared_1.canConfigureGroupAutoJoin)(actorRole)) {
        throw new https_1.HttpsError("permission-denied", "Only admins and managers can enable auto-join.");
    }
    const photoUrlRaw = request.data?.photoUrl;
    const photoUrl = photoUrlRaw === undefined
        ? undefined
        : photoUrlRaw === null || photoUrlRaw === ""
            ? null
            : String(photoUrlRaw).slice(0, 2000);
    const members = {
        ...(chat.members ?? {}),
    };
    const memberNames = {
        ...(chat.memberNames ?? {}),
    };
    const unreadCounts = {
        ...(chat.unreadCounts ?? {}),
    };
    for (const removeId of removeIds) {
        if (removeId === uid || removeId === String(chat.createdBy ?? ""))
            continue;
        delete members[removeId];
        delete memberNames[removeId];
        delete unreadCounts[removeId];
    }
    const roleUsers = await collectUsersByRoles(seedRoles, MAX_ROLE_SEED_MEMBERS);
    const toAdd = new Set([
        ...addIds.filter((id) => id !== SUPPORT_AI_UID),
        ...roleUsers.keys(),
    ]);
    const missingProfiles = [...toAdd].filter((id) => !roleUsers.has(id));
    if (missingProfiles.length) {
        const fetched = await db.getAll(...missingProfiles.map((id) => db.doc(`users/${id}`)));
        for (const profile of fetched) {
            if (profile.exists)
                roleUsers.set(profile.id, profile.data() ?? {});
        }
    }
    let truncated = false;
    for (const memberId of toAdd) {
        if (members[memberId] === true)
            continue;
        if (Object.keys(members).length >= MAX_ROLE_SEED_MEMBERS) {
            truncated = true;
            break;
        }
        const data = roleUsers.get(memberId);
        if (!data && !addIds.includes(memberId))
            continue;
        members[memberId] = true;
        memberNames[memberId] = headlineName(data);
        unreadCounts[memberId] = Number(unreadCounts[memberId] ?? 0);
    }
    const memberIds = Object.keys(members).filter((id) => id && id !== SUPPORT_AI_UID);
    if (memberIds.length < 2) {
        throw new https_1.HttpsError("invalid-argument", "Group must keep at least two members.");
    }
    let autoJoinRolesMap = {
        ...(chat.autoJoinRoles ?? {}),
    };
    const previousAutoRoles = Object.keys(autoJoinRolesMap).filter((role) => autoJoinRolesMap[role] === true);
    if (autoJoinRolesInput) {
        autoJoinRolesMap = Object.fromEntries(autoJoinRolesInput.map((role) => [role, true]));
    }
    else if (wantAutoJoin && seedRoles.length) {
        autoJoinRolesMap = Object.fromEntries(seedRoles.map((role) => [role, true]));
    }
    else if (request.data?.autoJoin === false) {
        autoJoinRolesMap = {};
    }
    const nextAutoRoles = Object.keys(autoJoinRolesMap).filter((role) => autoJoinRolesMap[role] === true);
    const nextChat = {
        ...chat,
        members,
        memberCount: memberIds.length,
        memberNames,
        unreadCounts,
        title: title ?? chat.title,
        autoJoinRoles: autoJoinRolesMap,
        photoUrl: photoUrl === undefined ? (chat.photoUrl ?? null) : photoUrl,
    };
    const updates = {
        [`chats/${chatId}`]: nextChat,
    };
    for (const memberId of memberIds) {
        updates[`userChats/${memberId}/${chatId}`] = chatInboxRow(chatId, nextChat, memberId);
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
exports.deleteGroupChat = (0, https_1.onCall)(callableOpts, async (request) => {
    const uid = await requireCaller(request, "deleteGroupChat");
    const chatId = String(request.data?.chatId ?? "").trim();
    if (!chatId) {
        throw new https_1.HttpsError("invalid-argument", "chatId required.");
    }
    const actor = await db.doc(`users/${uid}`).get();
    const actorRole = (0, shared_1.parseRole)(actor.data()?.role);
    if (!(0, shared_1.canManagePlatform)(actorRole)) {
        throw new https_1.HttpsError("permission-denied", "Only admins can delete groups.");
    }
    const chatSnap = await rtdb.ref(`chats/${chatId}`).get();
    const chat = (chatSnap.val() ?? null);
    if (!chat || chat.isGroup !== true) {
        throw new https_1.HttpsError("not-found", "Group not found.");
    }
    if (chat.isSupportChat === true) {
        throw new https_1.HttpsError("failed-precondition", "Support chats cannot be deleted.");
    }
    const members = Object.keys(chat.members ?? {});
    const autoJoinRoles = Object.keys(chat.autoJoinRoles ?? {}).filter((role) => chat.autoJoinRoles?.[role] === true);
    // Wipe message tree first (may be large).
    await rtdb.ref(`messages/${chatId}`).remove();
    const updates = {
        [`chats/${chatId}`]: null,
    };
    for (const memberId of members) {
        updates[`userChats/${memberId}/${chatId}`] = null;
    }
    for (const role of autoJoinRoles) {
        updates[`autoJoinGroups/${role}/${chatId}`] = null;
    }
    // Also clear index entries for any role that might still point here.
    for (const role of shared_1.GROUP_SEED_ROLES) {
        updates[`autoJoinGroups/${role}/${chatId}`] = null;
    }
    await rtdb.ref().update(updates);
    try {
        await storage.bucket().file(`chatAvatars/${chatId}.jpg`).delete();
    }
    catch {
        // Avatar may not exist.
    }
    return { ok: true, chatId };
});
exports.enrollInCourse = (0, https_1.onCall)(callableOpts, async (request) => {
    const uid = await requireCaller(request, "enrollInCourse");
    const user = await requireApprovedMember(uid);
    const courseId = String(request.data?.courseId ?? "");
    if (!courseId)
        throw new https_1.HttpsError("invalid-argument", "courseId required");
    if ((0, shared_1.parseRole)(user.role) === "guest") {
        throw new https_1.HttpsError("permission-denied", "Sign in required.");
    }
    const courseRef = db.doc(`courses/${courseId}`);
    const enrollmentRef = db.doc(`users/${uid}/enrollments/${courseId}`);
    await db.runTransaction(async (tx) => {
        const [course, enrollment] = await Promise.all([
            tx.get(courseRef),
            tx.get(enrollmentRef),
        ]);
        if (!course.exists || course.data()?.status !== "published") {
            throw new https_1.HttpsError("not-found", "Published course not found.");
        }
        if (enrollment.exists)
            return;
        tx.set(enrollmentRef, {
            courseId,
            completedLessonIds: [],
            lastLessonId: null,
            lastPositionSeconds: 0,
            quizAttempts: {},
            enrolledAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            completedAt: null,
        });
        tx.update(courseRef, {
            studentCount: firestore_1.FieldValue.increment(1),
            activeStudentCount: firestore_1.FieldValue.increment(1),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        tx.set(courseRef.collection("stats").doc("summary"), {
            enrolled: firestore_1.FieldValue.increment(1),
            completed: firestore_1.FieldValue.increment(0),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    return { ok: true };
});
exports.saveCourseProgress = (0, https_1.onCall)(callableOpts, async (request) => {
    const uid = await requireCaller(request, "saveCourseProgress");
    const courseId = String(request.data?.courseId ?? "");
    const lessonId = String(request.data?.lessonId ?? "");
    const positionSeconds = Math.max(0, Math.min(86400, Math.round(Number(request.data?.positionSeconds ?? 0))));
    const completed = request.data?.completed === true;
    if (!courseId || !lessonId || !Number.isFinite(positionSeconds)) {
        throw new https_1.HttpsError("invalid-argument", "Invalid course progress.");
    }
    const courseRef = db.doc(`courses/${courseId}`);
    const lessonRef = courseRef.collection("lessons").doc(lessonId);
    const enrollmentRef = db.doc(`users/${uid}/enrollments/${courseId}`);
    await db.runTransaction(async (tx) => {
        const [course, lesson, enrollment] = await Promise.all([
            tx.get(courseRef),
            tx.get(lessonRef),
            tx.get(enrollmentRef),
        ]);
        if (!course.exists || !lesson.exists || !enrollment.exists) {
            throw new https_1.HttpsError("failed-precondition", "Enrollment or lesson missing.");
        }
        if (completed && lesson.data()?.type === "quiz") {
            throw new https_1.HttpsError("failed-precondition", "Submit quizzes for grading.");
        }
        const data = enrollment.data() ?? {};
        const completedLessonIds = Array.isArray(data.completedLessonIds)
            ? data.completedLessonIds.map(String)
            : [];
        if (completed && !completedLessonIds.includes(lessonId)) {
            completedLessonIds.push(lessonId);
        }
        const lessonCount = Number(course.data()?.lessonCount ?? 0);
        const allDone = lessonCount > 0 && completedLessonIds.length >= lessonCount;
        const wasComplete = data.completedAt != null;
        tx.set(enrollmentRef, {
            completedLessonIds,
            lastLessonId: lessonId,
            lastPositionSeconds: positionSeconds,
            completedAt: allDone
                ? (data.completedAt ?? firestore_1.FieldValue.serverTimestamp())
                : null,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        if (allDone && !wasComplete) {
            tx.update(courseRef, {
                activeStudentCount: firestore_1.FieldValue.increment(-1),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            tx.set(courseRef.collection("stats").doc("summary"), {
                completed: firestore_1.FieldValue.increment(1),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
    });
    return { ok: true };
});
/**
 * Trusted vote path: updates vote doc + score increment under Admin SDK.
 */
exports.castForumVote = (0, https_1.onCall)(callableOpts, async (request) => {
    const uid = await requireCaller(request, "castForumVote");
    const user = await requireApprovedMember(uid);
    const threadId = String(request.data?.threadId ?? "");
    const replyId = request.data?.replyId == null ? null : String(request.data.replyId);
    const next = parseVote(request.data?.vote);
    if (!threadId) {
        throw new https_1.HttpsError("invalid-argument", "threadId required");
    }
    if (!shared_1.FORUM_ROLES.includes((0, shared_1.parseRole)(user.role))) {
        throw new https_1.HttpsError("permission-denied", "Forum participants only.");
    }
    const targetRef = replyId
        ? db.doc(`threads/${threadId}/replies/${replyId}`)
        : db.doc(`threads/${threadId}`);
    const voteRef = replyId
        ? db.doc(`threads/${threadId}/replies/${replyId}/votes/${uid}`)
        : db.doc(`threads/${threadId}/votes/${uid}`);
    const inboxVoteRef = db.doc(`users/${uid}/forumVotes/${replyId ? `${threadId}_${replyId}` : threadId}`);
    await db.runTransaction(async (tx) => {
        const target = await tx.get(targetRef);
        if (!target.exists) {
            throw new https_1.HttpsError("not-found", "Target not found.");
        }
        if (target.data()?.authorId === uid) {
            throw new https_1.HttpsError("failed-precondition", "Cannot vote on own content.");
        }
        const voteSnap = await tx.get(voteRef);
        const previous = voteSnap.data()?.value ?? 0;
        const delta = next - previous;
        if (delta === 0)
            return;
        if (next === 0) {
            tx.delete(voteRef);
            tx.delete(inboxVoteRef);
        }
        else {
            tx.set(voteRef, {
                value: next,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
            tx.set(inboxVoteRef, {
                threadId,
                replyId,
                value: next,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        tx.update(targetRef, {
            score: firestore_1.FieldValue.increment(delta),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
    // Notify content author on upvote (not clear / downvote). Never fail the
    // vote itself if the inbox/push side effect errors.
    if (next === 1) {
        try {
            const target = await (replyId
                ? db.doc(`threads/${threadId}/replies/${replyId}`)
                : db.doc(`threads/${threadId}`)).get();
            const authorId = String(target.data()?.authorId ?? "");
            if (authorId && authorId !== uid) {
                const voterName = headlineName(user);
                await (0, notifications_1.notifyUser)(authorId, {
                    type: "forum_vote",
                    title: "New upvote",
                    body: `${voterName} upvoted your ${replyId ? "reply" : "question"}`,
                    href: `/home/${threadId}`,
                    deepLink: `pulse://forums/${threadId}`,
                    ref: { threadId, ...(replyId ? { replyId } : {}) },
                    actorId: uid,
                    actorName: voterName,
                });
            }
        }
        catch (error) {
            console.error("castForumVote notify failed", error);
        }
    }
    return { ok: true };
});
exports.addForumReply = (0, https_1.onCall)(callableOpts, async (request) => {
    const uid = await requireCaller(request, "addForumReply");
    const profile = await requireApprovedMember(uid);
    const threadId = String(request.data?.threadId ?? "");
    const body = String(request.data?.body ?? "").trim();
    if (!threadId || !body || body.length > 20000) {
        throw new https_1.HttpsError("invalid-argument", "Valid reply required.");
    }
    if (!shared_1.FORUM_ROLES.includes((0, shared_1.parseRole)(profile.role))) {
        throw new https_1.HttpsError("permission-denied", "Forum participants only.");
    }
    const thread = await db.doc(`threads/${threadId}`).get();
    if (!thread.exists) {
        throw new https_1.HttpsError("permission-denied", "Forum participants only.");
    }
    if (thread.data()?.closed === true) {
        throw new https_1.HttpsError("failed-precondition", "This thread is closed to new replies.");
    }
    const replyRef = db.collection(`threads/${threadId}/replies`).doc();
    const batch = db.batch();
    batch.set(replyRef, {
        body,
        authorId: uid,
        authorName: headlineName(profile),
        authorPhotoUrl: typeof profile.photoUrl === "string" ? profile.photoUrl : null,
        authorRole: (0, shared_1.parseRole)(profile.role),
        score: 0,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    batch.update(thread.ref, {
        replyCount: firestore_1.FieldValue.increment(1),
        lastReplyAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await batch.commit();
    await (0, notifications_1.ensureThreadParticipant)(threadId, uid);
    const authorId = String(thread.data()?.authorId ?? "");
    if (authorId && authorId !== uid) {
        await (0, notifications_1.ensureThreadParticipant)(threadId, authorId);
    }
    const targets = await (0, notifications_1.listThreadNotifyTargets)(threadId, uid);
    const actorName = headlineName(profile);
    await Promise.all(targets.map((targetUid) => (0, notifications_1.notifyUser)(targetUid, {
        type: "forum_reply",
        title: "New reply",
        body: `${actorName}: ${body.slice(0, 100)}`,
        href: `/home/${threadId}`,
        deepLink: `pulse://forums/${threadId}`,
        ref: { threadId, replyId: replyRef.id },
        actorId: uid,
        actorName: actorName,
    })));
    return { replyId: replyRef.id };
});
exports.deleteForumReply = (0, https_1.onCall)(callableOpts, async (request) => {
    const uid = await requireCaller(request, "deleteForumReply");
    const threadId = String(request.data?.threadId ?? "");
    const replyId = String(request.data?.replyId ?? "");
    const threadRef = db.doc(`threads/${threadId}`);
    const replyRef = db.doc(`threads/${threadId}/replies/${replyId}`);
    const [actor, thread, reply] = await Promise.all([
        db.doc(`users/${uid}`).get(),
        threadRef.get(),
        replyRef.get(),
    ]);
    if (!thread.exists || !reply.exists) {
        throw new https_1.HttpsError("not-found", "Reply not found.");
    }
    if ((0, shared_1.parseRole)(actor.data()?.role) !== "admin" && reply.data()?.authorId !== uid) {
        throw new https_1.HttpsError("permission-denied", "Not allowed to delete this reply.");
    }
    const remaining = await db
        .collection(`threads/${threadId}/replies`)
        .orderBy("createdAt", "desc")
        .limit(2)
        .get();
    const latest = remaining.docs.find((doc) => doc.id !== replyId);
    const replyVotes = await replyRef.collection("votes").get();
    const batch = db.batch();
    for (const vote of replyVotes.docs)
        batch.delete(vote.ref);
    batch.delete(replyRef);
    batch.update(threadRef, {
        replyCount: firestore_1.FieldValue.increment(-1),
        lastReplyAt: latest?.get("createdAt") ?? thread.get("createdAt") ?? firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        ...(thread.get("acceptedReplyId") === replyId
            ? { acceptedReplyId: null }
            : {}),
    });
    await batch.commit();
    return { ok: true };
});
exports.deleteForumThread = (0, https_1.onCall)(callableOpts, async (request) => {
    const uid = await requireCaller(request, "deleteForumThread");
    const threadId = String(request.data?.threadId ?? "");
    if (!threadId) {
        throw new https_1.HttpsError("invalid-argument", "threadId required");
    }
    const threadRef = db.doc(`threads/${threadId}`);
    const [actor, thread] = await Promise.all([
        db.doc(`users/${uid}`).get(),
        threadRef.get(),
    ]);
    if (!thread.exists) {
        throw new https_1.HttpsError("not-found", "Thread not found.");
    }
    const isAdmin = (0, shared_1.parseRole)(actor.data()?.role) === "admin";
    if (!isAdmin && thread.data()?.authorId !== uid) {
        throw new https_1.HttpsError("permission-denied", "Not allowed to delete this thread.");
    }
    const [repliesSnap, threadVotesSnap, participantsSnap] = await Promise.all([
        threadRef.collection("replies").get(),
        threadRef.collection("votes").get(),
        threadRef.collection("participants").get(),
    ]);
    // Firestore batches cap at 500 ops; chunk if a thread is unusually large.
    const refsToDelete = [];
    for (const reply of repliesSnap.docs) {
        const voteSnap = await reply.ref.collection("votes").get();
        for (const vote of voteSnap.docs)
            refsToDelete.push(vote.ref);
        refsToDelete.push(reply.ref);
    }
    for (const vote of threadVotesSnap.docs)
        refsToDelete.push(vote.ref);
    for (const participant of participantsSnap.docs) {
        refsToDelete.push(participant.ref);
    }
    refsToDelete.push(threadRef);
    for (let i = 0; i < refsToDelete.length; i += 450) {
        const batch = db.batch();
        for (const ref of refsToDelete.slice(i, i + 450)) {
            batch.delete(ref);
        }
        await batch.commit();
    }
    return { ok: true };
});
/**
 * Admin-only role assignment.
 * Staff roles (agent / instructor / manager / admin) join the default group.
 */
exports.setUserRole = (0, https_1.onCall)(callableOpts, async (request) => {
    const actorUid = await requireCaller(request, "setUserRole");
    const targetUid = String(request.data?.uid ?? "");
    const role = String(request.data?.role ?? "");
    if (!targetUid || !shared_1.ALL_ROLES.includes(role)) {
        throw new https_1.HttpsError("invalid-argument", "uid and valid role required");
    }
    const actor = await db.doc(`users/${actorUid}`).get();
    if (actor.data()?.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Admins only.");
    }
    const target = await db.doc(`users/${targetUid}`).get();
    if (!target.exists) {
        throw new https_1.HttpsError("not-found", "User not found.");
    }
    const currentRole = String(target.data()?.role ?? "");
    if (currentRole === "agent" && (role === "student" || role === "guest")) {
        throw new https_1.HttpsError("failed-precondition", "Cannot downgrade an agent to student or guest.");
    }
    await db.doc(`users/${targetUid}`).update({
        role,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    if ((0, shared_1.belongsInDefaultAgentGroup)((0, shared_1.parseRole)(role))) {
        await addAgentToDefaultGroup(targetUid, headlineName(target.data()));
    }
    const approvalStatus = String(target.data()?.approvalStatus ?? "approved");
    await ensureAutoJoinMemberships(targetUid, (0, shared_1.parseRole)(role), approvalStatus, headlineName({ ...target.data(), role }), target.data()?.isAnonymous === true);
    return { ok: true, uid: targetUid, role };
});
/**
 * Admin or manager: approve / reject newly registered accounts.
 * Legacy users without approvalStatus are already treated as approved.
 */
exports.setUserApproval = (0, https_1.onCall)(callableOpts, async (request) => {
    const actorUid = await requireCaller(request, "setUserApproval");
    const targetUid = String(request.data?.uid ?? "");
    const status = String(request.data?.status ?? "");
    if (!targetUid || (status !== "approved" && status !== "rejected")) {
        throw new https_1.HttpsError("invalid-argument", "uid and status required");
    }
    const actor = await db.doc(`users/${actorUid}`).get();
    const actorRole = (0, shared_1.parseRole)(actor.data()?.role);
    if (actorRole !== "admin" && actorRole !== "manager") {
        throw new https_1.HttpsError("permission-denied", "Admins and managers only.");
    }
    const target = await db.doc(`users/${targetUid}`).get();
    if (!target.exists) {
        throw new https_1.HttpsError("not-found", "User not found.");
    }
    await db.doc(`users/${targetUid}`).update({
        approvalStatus: status,
        approvedBy: actorUid,
        approvedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    if (status === "approved") {
        const data = target.data();
        await ensureAutoJoinMemberships(targetUid, (0, shared_1.parseRole)(data?.role), "approved", headlineName(data), data?.isAnonymous === true);
    }
    return { ok: true, uid: targetUid, status };
});
/** Admin/manager directory of users awaiting approval. */
exports.listPendingApprovals = (0, https_1.onCall)(callableOpts, async (request) => {
    const actorUid = await requireCaller(request, "listPendingApprovals");
    const actor = await db.doc(`users/${actorUid}`).get();
    const actorRole = (0, shared_1.parseRole)(actor.data()?.role);
    if (actorRole !== "admin" && actorRole !== "manager") {
        throw new https_1.HttpsError("permission-denied", "Admins and managers only.");
    }
    const snap = await db
        .collection("users")
        .where("approvalStatus", "==", "pending")
        .limit(100)
        .get();
    const users = snap.docs
        .filter((doc) => doc.id !== actorUid && doc.data()?.isAnonymous !== true)
        .map((doc) => {
        const data = doc.data();
        return {
            uid: doc.id,
            email: typeof data.email === "string" ? data.email : null,
            displayName: typeof data.displayName === "string" ? data.displayName : null,
            photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
            role: String(data.role ?? "student"),
            profileCompleted: data.profileCompleted !== false,
            agency: typeof data.agency === "string" ? data.agency : null,
            approvalStatus: "pending",
        };
    });
    return { users };
});
/**
 * Admin-only directory of students awaiting promotion.
 * Uses Admin SDK so the client does not need a fragile users list rule.
 */
exports.listStudentsForPromotion = (0, https_1.onCall)(callableOpts, async (request) => {
    const actorUid = await requireCaller(request, "listStudentsForPromotion");
    const actor = await db.doc(`users/${actorUid}`).get();
    if (actor.data()?.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Admins only.");
    }
    const snap = await db
        .collection("users")
        .where("role", "==", "student")
        .limit(120)
        .get();
    const students = snap.docs
        .map((doc) => {
        const data = doc.data();
        return {
            uid: doc.id,
            email: typeof data.email === "string" ? data.email : null,
            displayName: typeof data.displayName === "string" ? data.displayName : null,
            photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
            role: "student",
            isAnonymous: data.isAnonymous === true,
            profileCompleted: data.profileCompleted !== false,
        };
    })
        .filter((row) => row.isAnonymous !== true);
    return { students };
});
function serializeOrgNode(id, data) {
    return {
        id,
        name: typeof data?.name === "string" ? data.name : "",
        type: String(data?.type ?? ""),
        depth: Number(data?.depth ?? 0),
        parentId: typeof data?.parentId === "string" ? data.parentId : null,
        path: Array.isArray(data?.path) ? data.path.map(String) : [],
        managerUids: Array.isArray(data?.managerUids)
            ? data.managerUids.map(String)
            : [],
        active: data?.active !== false,
    };
}
function serializeAdminUser(id, data) {
    return {
        uid: id,
        email: typeof data.email === "string" ? data.email : null,
        displayName: typeof data.displayName === "string" ? data.displayName : null,
        photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
        role: String(data.role ?? "student"),
        isAnonymous: data.isAnonymous === true,
        profileCompleted: data.profileCompleted !== false,
        npn: typeof data.npn === "string" ? data.npn : null,
        agency: typeof data.agency === "string" ? data.agency : null,
        orgNodeId: typeof data.orgNodeId === "string" ? data.orgNodeId : null,
        accountStatus: String(data.accountStatus ?? "active"),
        approvalStatus: data.approvalStatus === "pending" ||
            data.approvalStatus === "approved" ||
            data.approvalStatus === "rejected"
            ? data.approvalStatus
            : null,
    };
}
async function requireAdminStaff(actorUid) {
    const actor = await db.doc(`users/${actorUid}`).get();
    const role = (0, shared_1.parseRole)(actor.data()?.role);
    if (!(0, shared_1.canAccessAdmin)(role)) {
        throw new https_1.HttpsError("permission-denied", "Admins and managers only.");
    }
    const orgNodeId = typeof actor.data()?.orgNodeId === "string" ? actor.data().orgNodeId : null;
    return { role, orgNodeId };
}
async function managerCanAccessNode(actor, node, actorUid) {
    if ((0, shared_1.canManagePlatform)(actor.role))
        return true;
    if (Array.isArray(node.managerUids) && node.managerUids.includes(actorUid)) {
        return true;
    }
    if (!actor.orgNodeId)
        return false;
    const path = Array.isArray(node.path) ? node.path : [];
    return path.includes(actor.orgNodeId);
}
/** Admin/manager directory with filters for Pulse Admin. */
exports.listUsersForAdmin = (0, https_1.onCall)(callableOpts, async (request) => {
    const actorUid = await requireCaller(request, "listUsersForAdmin");
    const actor = await requireAdminStaff(actorUid);
    const roleFilter = String(request.data?.role ?? "").trim();
    const approvalFilter = String(request.data?.approvalStatus ?? "").trim();
    const accountFilter = String(request.data?.accountStatus ?? "").trim();
    const orgFilter = String(request.data?.orgNodeId ?? "").trim();
    const queryText = String(request.data?.query ?? "").trim().toLowerCase();
    const max = Math.max(1, Math.min(200, Math.round(Number(request.data?.limit ?? 150))));
    const cursorUid = String(request.data?.cursor ?? "").trim();
    let base = db.collection("users").where("isAnonymous", "==", false);
    if (roleFilter && shared_1.ALL_ROLES.includes(roleFilter)) {
        base = base.where("role", "==", roleFilter);
    }
    if (approvalFilter === "pending" ||
        approvalFilter === "approved" ||
        approvalFilter === "rejected") {
        base = base.where("approvalStatus", "==", approvalFilter);
    }
    if (accountFilter === "active" ||
        accountFilter === "deactivated" ||
        accountFilter === "pendingDeletion") {
        base = base.where("accountStatus", "==", accountFilter);
    }
    if (orgFilter) {
        base = base.where("orgNodeId", "==", orgFilter);
    }
    base = base.orderBy(firestore_1.FieldPath.documentId());
    // Manager scope: resolve once, filter in memory while scanning.
    let scopedIds = null;
    if (!(0, shared_1.canManagePlatform)(actor.role) && actor.orgNodeId) {
        scopedIds = new Set();
        const scopeSnap = await db.doc(`orgNodes/${actor.orgNodeId}`).get();
        const scopePath = Array.isArray(scopeSnap.data()?.path)
            ? scopeSnap.data().path.map(String)
            : [actor.orgNodeId];
        for (const id of scopePath)
            scopedIds.add(id);
        const subtree = await db
            .collection("orgNodes")
            .where("path", "array-contains", actor.orgNodeId)
            .limit(500)
            .get();
        for (const doc of subtree.docs)
            scopedIds.add(doc.id);
    }
    const needsInMemoryFilter = Boolean(queryText || scopedIds);
    // Collect max+1 matches so hasMore is the leftover, not "page looks full".
    const collected = [];
    let scanCursor = cursorUid || null;
    const maxRounds = needsInMemoryFilter ? 12 : 3;
    let exhausted = false;
    let hitRoundCap = false;
    for (let round = 0; round < maxRounds && collected.length <= max; round++) {
        let q = base;
        if (scanCursor)
            q = q.startAfter(scanCursor);
        const remaining = max + 1 - collected.length;
        const batchSize = needsInMemoryFilter
            ? Math.min(200, Math.max(remaining * 3, remaining))
            : remaining;
        const snap = await q.limit(batchSize).get();
        if (snap.empty) {
            exhausted = true;
            break;
        }
        for (const doc of snap.docs) {
            scanCursor = doc.id;
            if (doc.id === actorUid)
                continue;
            const user = serializeAdminUser(doc.id, doc.data());
            if (scopedIds && (!user.orgNodeId || !scopedIds.has(user.orgNodeId))) {
                continue;
            }
            if (queryText) {
                const hay = `${user.displayName ?? ""} ${user.email ?? ""}`.toLowerCase();
                if (!hay.includes(queryText))
                    continue;
            }
            collected.push(user);
            if (collected.length > max)
                break;
        }
        if (snap.size < batchSize) {
            exhausted = true;
            break;
        }
        if (round === maxRounds - 1 && collected.length <= max) {
            hitRoundCap = true;
        }
    }
    const hasMore = collected.length > max || (hitRoundCap && !exhausted);
    const users = collected.slice(0, max);
    const nextCursor = hasMore && users.length > 0 ? users[users.length - 1].uid : null;
    return { users, nextCursor };
});
exports.adminDeactivateUser = (0, https_1.onCall)(callableOpts, async (request) => {
    const actorUid = await requireCaller(request, "adminDeactivateUser");
    const actor = await requireAdminStaff(actorUid);
    if (!(0, shared_1.canManagePlatform)(actor.role)) {
        throw new https_1.HttpsError("permission-denied", "Admins only.");
    }
    const targetUid = String(request.data?.uid ?? "");
    if (!targetUid || targetUid === actorUid) {
        throw new https_1.HttpsError("invalid-argument", "uid required");
    }
    const userRef = db.doc(`users/${targetUid}`);
    const snap = await userRef.get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "User not found.");
    if (snap.data()?.accountStatus === "pendingDeletion") {
        throw new https_1.HttpsError("failed-precondition", "Deletion already requested.");
    }
    await userRef.update({
        accountStatus: "deactivated",
        deactivatedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await clearFcmTokens(targetUid);
    return { ok: true, uid: targetUid };
});
exports.adminReactivateUser = (0, https_1.onCall)(callableOpts, async (request) => {
    const actorUid = await requireCaller(request, "adminReactivateUser");
    const actor = await requireAdminStaff(actorUid);
    if (!(0, shared_1.canManagePlatform)(actor.role)) {
        throw new https_1.HttpsError("permission-denied", "Admins only.");
    }
    const targetUid = String(request.data?.uid ?? "");
    if (!targetUid)
        throw new https_1.HttpsError("invalid-argument", "uid required");
    const userRef = db.doc(`users/${targetUid}`);
    const snap = await userRef.get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "User not found.");
    if (snap.data()?.accountStatus !== "deactivated") {
        throw new https_1.HttpsError("failed-precondition", "Account is not deactivated.");
    }
    await userRef.update({
        accountStatus: "active",
        deactivatedAt: firestore_1.FieldValue.delete(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { ok: true, uid: targetUid };
});
/** Studio: detailed analytics for one course (author or admin). */
exports.getCourseInsights = (0, https_1.onCall)(callableOpts, async (request) => {
    const actorUid = await requireCaller(request, "getCourseInsights");
    const courseId = String(request.data?.courseId ?? "").trim();
    if (!courseId)
        throw new https_1.HttpsError("invalid-argument", "courseId required");
    const rangeRaw = request.data?.rangeDays;
    let rangeDays = null;
    if (rangeRaw != null && rangeRaw !== "" && rangeRaw !== "all") {
        const n = Number(rangeRaw);
        if (![7, 30, 90].includes(n)) {
            throw new https_1.HttpsError("invalid-argument", "rangeDays must be 7, 30, 90, or all");
        }
        rangeDays = n;
    }
    const courseSnap = await db.doc(`courses/${courseId}`).get();
    if (!courseSnap.exists)
        throw new https_1.HttpsError("not-found", "Course not found.");
    const course = courseSnap.data() ?? {};
    const actor = await db.doc(`users/${actorUid}`).get();
    const role = (0, shared_1.parseRole)(actor.data()?.role);
    const { assertCanViewCourseInsights, buildCourseInsights, } = await Promise.resolve().then(() => __importStar(require("./insights")));
    const allowed = await assertCanViewCourseInsights(actorUid, String(course.createdBy ?? ""), role);
    if (!allowed) {
        throw new https_1.HttpsError("permission-denied", "Not allowed to view this course.");
    }
    if (!(0, shared_1.canAuthorCourses)(role)) {
        throw new https_1.HttpsError("permission-denied", "Studio authors only.");
    }
    try {
        const rawCursor = String(request.data?.learnerCursor ?? "").trim();
        const statusRaw = String(request.data?.learnerStatus ?? "all").trim();
        const learnerStatus = statusRaw === "inProgress" ||
            statusRaw === "completed" ||
            statusRaw === "atRisk" ||
            statusRaw === "all"
            ? statusRaw
            : "all";
        return await buildCourseInsights({
            courseId,
            rangeDays,
            learnerLimit: Math.min(200, Math.max(0, Math.round(Number(request.data?.learnerLimit ?? 100)))),
            learnerCursor: rawCursor || null,
            learnerStatus,
        });
    }
    catch (error) {
        if (error instanceof Error && error.message === "COURSE_NOT_FOUND") {
            throw new https_1.HttpsError("not-found", "Course not found.");
        }
        throw error;
    }
});
/** Studio: portfolio rollup across authored/admin courses. */
exports.getCatalogInsights = (0, https_1.onCall)(callableOpts, async (request) => {
    const actorUid = await requireCaller(request, "getCatalogInsights");
    const actor = await db.doc(`users/${actorUid}`).get();
    const role = (0, shared_1.parseRole)(actor.data()?.role);
    if (!(0, shared_1.canAuthorCourses)(role)) {
        throw new https_1.HttpsError("permission-denied", "Studio authors only.");
    }
    const rawCourseIds = Array.isArray(request.data?.courseIds)
        ? request.data.courseIds.map(String).filter(Boolean)
        : [];
    const rawPaths = Array.isArray(request.data?.paths)
        ? request.data.paths
        : [];
    // Resolve course set: explicit ids, else authored (or all for admin).
    let courseIds = rawCourseIds.slice(0, 100);
    if (courseIds.length === 0) {
        const q = role === "admin"
            ? db.collection("courses").orderBy("updatedAt", "desc").limit(80)
            : db
                .collection("courses")
                .where("createdBy", "==", actorUid)
                .orderBy("updatedAt", "desc")
                .limit(80);
        const snap = await q.get();
        courseIds = snap.docs.map((doc) => doc.id);
    }
    else if (role !== "admin") {
        // Authors may only request their own courses.
        const snaps = await Promise.all(courseIds.map((id) => db.doc(`courses/${id}`).get()));
        courseIds = snaps
            .filter((snap) => snap.exists && String(snap.data()?.createdBy ?? "") === actorUid)
            .map((snap) => snap.id);
    }
    const pathSummaries = rawPaths
        .slice(0, 5)
        .map((path) => ({
        pathId: String(path.pathId ?? path.id ?? ""),
        title: String(path.title ?? "Path"),
        courseIds: Array.isArray(path.courseIds)
            ? path.courseIds.map(String)
            : [],
    }))
        .filter((path) => path.pathId);
    const { buildCatalogInsights } = await Promise.resolve().then(() => __importStar(require("./insights")));
    return buildCatalogInsights({ courseIds, pathSummaries });
});
/** Studio workspace: paged learners for one course (no client collectionGroup). */
exports.listCourseStudents = (0, https_1.onCall)(callableOpts, async (request) => {
    const actorUid = await requireCaller(request, "listCourseStudents");
    const courseId = String(request.data?.courseId ?? "").trim();
    if (!courseId)
        throw new https_1.HttpsError("invalid-argument", "courseId required");
    const courseSnap = await db.doc(`courses/${courseId}`).get();
    if (!courseSnap.exists)
        throw new https_1.HttpsError("not-found", "Course not found.");
    const course = courseSnap.data() ?? {};
    const actor = await db.doc(`users/${actorUid}`).get();
    const role = (0, shared_1.parseRole)(actor.data()?.role);
    if (!(0, shared_1.canAuthorCourses)(role)) {
        throw new https_1.HttpsError("permission-denied", "Studio authors only.");
    }
    const { assertCanViewCourseInsights, listCourseStudentsPage, } = await Promise.resolve().then(() => __importStar(require("./insights")));
    const allowed = await assertCanViewCourseInsights(actorUid, String(course.createdBy ?? ""), role);
    if (!allowed) {
        throw new https_1.HttpsError("permission-denied", "Not allowed.");
    }
    const limit = Math.min(100, Math.max(1, Math.round(Number(request.data?.limit ?? 50))));
    const cursor = String(request.data?.cursor ?? "").trim() || null;
    return listCourseStudentsPage({ courseId, limit, cursor });
});
exports.getAdminInsights = (0, https_1.onCall)(callableOpts, async (request) => {
    const actorUid = await requireCaller(request, "getAdminInsights");
    await requireAdminStaff(actorUid);
    const usersCol = db.collection("users").where("isAnonymous", "==", false);
    const [totalSnap, pendingSnap, activeSnap, deactivatedSnap, pendingDeletionSnap, orgCountSnap, recentSnap,] = await Promise.all([
        usersCol.count().get(),
        usersCol.where("approvalStatus", "==", "pending").count().get(),
        usersCol.where("accountStatus", "==", "active").count().get(),
        usersCol.where("accountStatus", "==", "deactivated").count().get(),
        usersCol.where("accountStatus", "==", "pendingDeletion").count().get(),
        db.collection("orgNodes").count().get(),
        usersCol.orderBy("createdAt", "desc").limit(12).get(),
    ]);
    const byRole = {};
    await Promise.all(shared_1.ALL_ROLES.map(async (role) => {
        const snap = await usersCol.where("role", "==", role).count().get();
        byRole[role] = snap.data().count;
    }));
    const recentRegistrations = recentSnap.docs.map((doc) => {
        const data = doc.data();
        const created = data.createdAt;
        return {
            uid: doc.id,
            displayName: typeof data.displayName === "string" ? data.displayName : null,
            email: typeof data.email === "string" ? data.email : null,
            role: String(data.role ?? "student"),
            createdAt: created?.toMillis?.() ?? null,
        };
    });
    // active count may undercount if accountStatus missing; fall back.
    const totalUsers = totalSnap.data().count;
    const deactivated = deactivatedSnap.data().count;
    const pendingDeletion = pendingDeletionSnap.data().count;
    const activeCounted = activeSnap.data().count;
    const active = activeCounted > 0
        ? activeCounted
        : Math.max(0, totalUsers - deactivated - pendingDeletion);
    return {
        totalUsers,
        byRole,
        pendingApprovals: pendingSnap.data().count,
        active,
        deactivated,
        pendingDeletion,
        orgNodeCount: orgCountSnap.data().count,
        recentRegistrations,
    };
});
exports.ensureOrgRoot = (0, https_1.onCall)(callableOpts, async (request) => {
    const actorUid = await requireCaller(request, "ensureOrgRoot");
    const actor = await requireAdminStaff(actorUid);
    if (!(0, shared_1.canManagePlatform)(actor.role)) {
        throw new https_1.HttpsError("permission-denied", "Admins only.");
    }
    const existing = await db
        .collection("orgNodes")
        .where("type", "==", "organization")
        .limit(1)
        .get();
    if (!existing.empty) {
        const doc = existing.docs[0];
        // Preserve a custom root name; only ensure the node stays active.
        await doc.ref.set({
            active: true,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        const next = await doc.ref.get();
        return { node: serializeOrgNode(doc.id, next.data()) };
    }
    const ref = db.collection("orgNodes").doc();
    const node = {
        name: shared_1.DEFAULT_ORG_ROOT_NAME,
        type: "organization",
        depth: 1,
        parentId: null,
        path: [ref.id],
        managerUids: [],
        active: true,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    await ref.set(node);
    return { node: serializeOrgNode(ref.id, { ...node, path: [ref.id] }) };
});
exports.listOrgSubtree = (0, https_1.onCall)(callableOpts, async (request) => {
    const actorUid = await requireCaller(request, "listOrgSubtree");
    const actor = await requireAdminStaff(actorUid);
    const parentId = request.data?.parentId == null || request.data?.parentId === ""
        ? null
        : String(request.data.parentId);
    let snap;
    if (parentId) {
        snap = await db
            .collection("orgNodes")
            .where("path", "array-contains", parentId)
            .get();
    }
    else if ((0, shared_1.canManagePlatform)(actor.role)) {
        snap = await db.collection("orgNodes").limit(500).get();
    }
    else if (actor.orgNodeId) {
        snap = await db
            .collection("orgNodes")
            .where("path", "array-contains", actor.orgNodeId)
            .get();
    }
    else {
        // Managers without org assignment still see nodes they manage.
        snap = await db
            .collection("orgNodes")
            .where("managerUids", "array-contains", actorUid)
            .get();
    }
    const nodes = snap.docs
        .map((doc) => serializeOrgNode(doc.id, doc.data()))
        .filter((n) => n.id);
    return { nodes };
});
exports.createOrgNode = (0, https_1.onCall)(callableOpts, async (request) => {
    const actorUid = await requireCaller(request, "createOrgNode");
    const actor = await requireAdminStaff(actorUid);
    if (!(0, shared_1.canManagePlatform)(actor.role)) {
        throw new https_1.HttpsError("permission-denied", "Admins only.");
    }
    const name = String(request.data?.name ?? "").trim().slice(0, 120);
    const type = (0, shared_1.parseOrgNodeType)(request.data?.type);
    const parentId = String(request.data?.parentId ?? "");
    if (!name || !type || !parentId) {
        throw new https_1.HttpsError("invalid-argument", "name, type, parentId required");
    }
    if (type === "organization") {
        throw new https_1.HttpsError("invalid-argument", "Use ensureOrgRoot for organizations.");
    }
    const parentSnap = await db.doc(`orgNodes/${parentId}`).get();
    if (!parentSnap.exists)
        throw new https_1.HttpsError("not-found", "Parent not found.");
    const parentType = (0, shared_1.parseOrgNodeType)(parentSnap.data()?.type);
    if (!parentType) {
        throw new https_1.HttpsError("failed-precondition", "Parent node type is invalid or legacy (division/region). Run repairOrgTree.");
    }
    if (!(0, shared_1.isValidChildType)(parentType, type)) {
        throw new https_1.HttpsError("failed-precondition", "Child type must be exactly one level below parent.");
    }
    const parentPath = Array.isArray(parentSnap.data()?.path)
        ? parentSnap.data().path.map(String)
        : [parentId];
    const ref = db.collection("orgNodes").doc();
    const depth = shared_1.ORG_TYPE_DEPTH[type];
    const node = {
        name,
        type,
        depth,
        parentId,
        path: [...parentPath, ref.id],
        managerUids: [],
        active: true,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    await ref.set(node);
    return { node: serializeOrgNode(ref.id, node) };
});
exports.updateOrgNode = (0, https_1.onCall)(callableOpts, async (request) => {
    const actorUid = await requireCaller(request, "updateOrgNode");
    const actor = await requireAdminStaff(actorUid);
    if (!(0, shared_1.canManagePlatform)(actor.role)) {
        throw new https_1.HttpsError("permission-denied", "Admins only.");
    }
    const id = String(request.data?.id ?? "");
    if (!id)
        throw new https_1.HttpsError("invalid-argument", "id required");
    const ref = db.doc(`orgNodes/${id}`);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "Org node not found.");
    const nodeType = (0, shared_1.parseOrgNodeType)(snap.data()?.type);
    if (nodeType === "organization" && typeof request.data?.active === "boolean") {
        throw new https_1.HttpsError("failed-precondition", "Organization root cannot be deactivated.");
    }
    const patch = {
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    if (typeof request.data?.name === "string") {
        const name = request.data.name.trim().slice(0, 120);
        if (!name)
            throw new https_1.HttpsError("invalid-argument", "name required");
        patch.name = name;
    }
    if (typeof request.data?.active === "boolean") {
        patch.active = request.data.active;
    }
    if (Array.isArray(request.data?.managerUids)) {
        patch.managerUids = request.data.managerUids.map(String).slice(0, 50);
    }
    await ref.update(patch);
    const next = await ref.get();
    return { node: serializeOrgNode(id, next.data()) };
});
exports.moveOrgNode = (0, https_1.onCall)(callableOpts, async (request) => {
    const actorUid = await requireCaller(request, "moveOrgNode");
    const actor = await requireAdminStaff(actorUid);
    if (!(0, shared_1.canManagePlatform)(actor.role)) {
        throw new https_1.HttpsError("permission-denied", "Admins only.");
    }
    const id = String(request.data?.id ?? "");
    const newParentId = String(request.data?.parentId ?? "");
    if (!id || !newParentId || id === newParentId) {
        throw new https_1.HttpsError("invalid-argument", "id and parentId required");
    }
    const ref = db.doc(`orgNodes/${id}`);
    const [snap, parentSnap] = await Promise.all([
        ref.get(),
        db.doc(`orgNodes/${newParentId}`).get(),
    ]);
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "Org node not found.");
    if (!parentSnap.exists)
        throw new https_1.HttpsError("not-found", "Parent not found.");
    const type = (0, shared_1.parseOrgNodeType)(snap.data()?.type);
    if (type === "organization") {
        throw new https_1.HttpsError("failed-precondition", "Every Benefits root cannot be moved.");
    }
    const parentType = (0, shared_1.parseOrgNodeType)(parentSnap.data()?.type);
    if (!type || !parentType || !(0, shared_1.isValidChildType)(parentType, type)) {
        throw new https_1.HttpsError("failed-precondition", "Move must keep depth = parent depth + 1.");
    }
    const parentPath = Array.isArray(parentSnap.data()?.path)
        ? parentSnap.data().path.map(String)
        : [newParentId];
    if (parentPath.includes(id)) {
        throw new https_1.HttpsError("failed-precondition", "Cannot move under descendant.");
    }
    const newPath = [...parentPath, id];
    // Update this node + rewrite descendant paths that start with oldPath.
    const descendants = await db
        .collection("orgNodes")
        .where("path", "array-contains", id)
        .get();
    const batch = db.batch();
    batch.update(ref, {
        parentId: newParentId,
        path: newPath,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    for (const doc of descendants.docs) {
        if (doc.id === id)
            continue;
        const childPath = Array.isArray(doc.data().path)
            ? doc.data().path.map(String)
            : [];
        const idx = childPath.indexOf(id);
        if (idx < 0)
            continue;
        const rewritten = [...newPath, ...childPath.slice(idx + 1)];
        batch.update(doc.ref, {
            path: rewritten,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    }
    await batch.commit();
    const next = await ref.get();
    return { node: serializeOrgNode(id, next.data()), rewritten: descendants.size };
});
exports.assignUserToOrgNode = (0, https_1.onCall)(callableOpts, async (request) => {
    const actorUid = await requireCaller(request, "assignUserToOrgNode");
    const actor = await requireAdminStaff(actorUid);
    const targetUid = String(request.data?.uid ?? "");
    const orgNodeId = request.data?.orgNodeId == null || request.data?.orgNodeId === ""
        ? null
        : String(request.data.orgNodeId);
    if (!targetUid)
        throw new https_1.HttpsError("invalid-argument", "uid required");
    let agencyName = null;
    if (orgNodeId) {
        const nodeSnap = await db.doc(`orgNodes/${orgNodeId}`).get();
        if (!nodeSnap.exists)
            throw new https_1.HttpsError("not-found", "Org node not found.");
        const allowed = await managerCanAccessNode(actor, nodeSnap.data() ?? {}, actorUid);
        if (!allowed) {
            throw new https_1.HttpsError("permission-denied", "Outside your org scope.");
        }
        agencyName =
            typeof nodeSnap.data()?.name === "string" ? nodeSnap.data().name : null;
    }
    else if (!(0, shared_1.canManagePlatform)(actor.role)) {
        throw new https_1.HttpsError("permission-denied", "Admins only to clear org.");
    }
    await db.doc(`users/${targetUid}`).update({
        orgNodeId,
        agency: agencyName,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { ok: true, uid: targetUid, orgNodeId, agency: agencyName };
});
exports.listPublicProfiles = (0, https_1.onCall)(callableOpts, async (request) => {
    const uid = await requireCaller(request, "listPublicProfiles");
    await requireApprovedMember(uid);
    const requestedLimit = Math.round(Number(request.data?.limit ?? 80));
    const max = Math.max(1, Math.min(100, requestedLimit));
    const snap = await db
        .collection("users")
        .where("isAnonymous", "==", false)
        .limit(max + 1)
        .get();
    const profiles = snap.docs
        .filter((profile) => profile.id !== uid)
        .slice(0, max)
        .map((profile) => {
        const data = profile.data();
        return {
            uid: profile.id,
            displayName: typeof data.displayName === "string" ? data.displayName : null,
            photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
            role: String(data.role ?? "student"),
            agency: typeof data.agency === "string" ? data.agency : null,
            isAnonymous: false,
            profileCompleted: data.profileCompleted !== false,
        };
    });
    return { profiles };
});
/**
 * Directory search for chats (name, email, NPN). Returns PII for org members
 * who can participate in chats.
 */
exports.searchDirectory = (0, https_1.onCall)(callableOpts, async (request) => {
    const uid = await requireCaller(request, "searchDirectory");
    const callerData = await requireApprovedMember(uid);
    if (!(0, shared_1.canParticipateInChats)((0, shared_1.parseRole)(callerData.role), callerData.isAnonymous === true)) {
        throw new https_1.HttpsError("permission-denied", "Chats not available.");
    }
    const rawQuery = String(request.data?.query ?? "").trim();
    if (rawQuery.length < 2) {
        return { profiles: [] };
    }
    const limit = Math.max(1, Math.min(40, Math.round(Number(request.data?.limit ?? 40))));
    const q = rawQuery.toLowerCase();
    const npnDigits = rawQuery.replace(/\D/g, "");
    const looksEmail = q.includes("@");
    const looksNpn = npnDigits.length >= 5 && /^\d[\d\s-]*$/.test(rawQuery);
    const matched = new Map();
    const pushDoc = (doc) => {
        if (doc.id === uid || matched.has(doc.id))
            return;
        if (matched.size >= limit)
            return;
        const data = doc.data();
        if (data.isAnonymous === true)
            return;
        const role = (0, shared_1.parseRole)(data.role);
        if (role === "guest")
            return;
        if (!isUserApprovedForJoin(data) && String(data.approvalStatus ?? "") === "rejected") {
            return;
        }
        // Allow pending for search so admins can still DM? Plan says approved.
        // Stick to approved (legacy missing = approved).
        if (!isUserApprovedForJoin(data))
            return;
        matched.set(doc.id, data);
    };
    if (looksEmail) {
        const exact = await db
            .collection("users")
            .where("email", "==", q)
            .limit(limit)
            .get();
        exact.docs.forEach(pushDoc);
    }
    if (looksNpn && matched.size < limit) {
        const exact = await db
            .collection("users")
            .where("npn", "==", npnDigits)
            .limit(limit)
            .get();
        exact.docs.forEach(pushDoc);
    }
    if (matched.size < limit) {
        // Prefix range on displayName (case-sensitive Firestore limitation —
        // also scan a pool and filter case-insensitively).
        const pool = await db
            .collection("users")
            .where("isAnonymous", "==", false)
            .limit(200)
            .get();
        for (const doc of pool.docs) {
            if (matched.size >= limit)
                break;
            const data = doc.data();
            const name = String(data.displayName ?? "").toLowerCase();
            const email = String(data.email ?? "").toLowerCase();
            const npn = String(data.npn ?? "").replace(/\D/g, "");
            if (name.includes(q) ||
                email.includes(q) ||
                (npnDigits.length >= 2 && npn.includes(npnDigits))) {
                pushDoc(doc);
            }
        }
    }
    const profiles = [...matched.entries()].map(([id, data]) => ({
        uid: id,
        displayName: typeof data.displayName === "string" ? data.displayName : null,
        photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
        role: String(data.role ?? "student"),
        agency: typeof data.agency === "string" ? data.agency : null,
        email: typeof data.email === "string" ? data.email : null,
        npn: typeof data.npn === "string" ? data.npn : null,
        isAnonymous: false,
        profileCompleted: data.profileCompleted !== false,
    }));
    return { profiles };
});
/** Normalizes a submitted answer into a sorted, deduped list of option indexes. */
function parseSelectedOptions(raw) {
    const list = Array.isArray(raw) ? raw : [raw];
    const indexes = new Set();
    for (const entry of list) {
        const n = typeof entry === "number" ? entry : Number(entry);
        if (Number.isInteger(n) && n >= 0 && n < MAX_QUIZ_OPTIONS) {
            indexes.add(n);
        }
    }
    return [...indexes].sort((a, b) => a - b);
}
function sameOptionSet(expected, given) {
    if (expected.length !== given.length)
        return false;
    return expected.every((value, index) => value === given[index]);
}
/**
 * Grades a quiz lesson server-side.
 *
 * The answer key lives in `courses/{id}/lessons/{id}/secure/answerKey`, which
 * learners cannot read, and this callable is the only writer of
 * `quizAttempts` / quiz completion on an enrollment.
 */
exports.submitQuizAttempt = (0, https_1.onCall)(callableOpts, async (request) => {
    const uid = await requireCaller(request, "submitQuizAttempt");
    const courseId = String(request.data?.courseId ?? "");
    const lessonId = String(request.data?.lessonId ?? "");
    const rawAnswers = request.data?.answers;
    if (!courseId || !lessonId) {
        throw new https_1.HttpsError("invalid-argument", "courseId and lessonId required");
    }
    if (typeof rawAnswers !== "object" || rawAnswers === null) {
        throw new https_1.HttpsError("invalid-argument", "answers must be an object");
    }
    const courseRef = db.doc(`courses/${courseId}`);
    const lessonRef = courseRef.collection("lessons").doc(lessonId);
    const [courseSnap, lessonSnap, keySnap] = await Promise.all([
        courseRef.get(),
        lessonRef.get(),
        lessonRef.collection("secure").doc("answerKey").get(),
    ]);
    if (!courseSnap.exists || !lessonSnap.exists) {
        throw new https_1.HttpsError("not-found", "Lesson not found.");
    }
    const course = courseSnap.data() ?? {};
    const lesson = lessonSnap.data() ?? {};
    if (lesson.type !== "quiz") {
        throw new https_1.HttpsError("failed-precondition", "Lesson is not a quiz.");
    }
    // Drafts are only answerable by their author or an admin (Studio preview).
    if (course.status !== "published") {
        const actor = await db.doc(`users/${uid}`).get();
        const role = (0, shared_1.parseRole)(actor.data()?.role);
        const owns = String(course.createdBy ?? "") === uid;
        if (role !== "admin" && !(owns && (0, shared_1.canAuthorCourses)(role))) {
            throw new https_1.HttpsError("permission-denied", "Course is not published.");
        }
    }
    const questions = Array.isArray(lesson.questions) ? lesson.questions : [];
    if (questions.length === 0) {
        throw new https_1.HttpsError("failed-precondition", "Quiz has no questions.");
    }
    const key = keySnap.exists
        ? (keySnap.data()?.answers ?? {})
        : {};
    if (Object.keys(key).length === 0) {
        throw new https_1.HttpsError("failed-precondition", "Quiz has no answer key.");
    }
    const correctByQuestion = {};
    for (const raw of questions) {
        if (typeof raw !== "object" || raw === null)
            continue;
        const question = raw;
        const questionId = String(question.id ?? "");
        if (!questionId)
            continue;
        const expected = parseSelectedOptions(key[questionId]);
        const given = parseSelectedOptions(rawAnswers[questionId]);
        correctByQuestion[questionId] =
            expected.length > 0 && sameOptionSet(expected, given);
    }
    const total = Object.keys(correctByQuestion).length;
    if (total === 0) {
        throw new https_1.HttpsError("failed-precondition", "Quiz has no gradable questions.");
    }
    const correct = Object.values(correctByQuestion).filter(Boolean).length;
    const score = Math.round((correct / total) * 100);
    const rawPass = Number(lesson.passPercent);
    const passPercent = Number.isFinite(rawPass)
        ? Math.min(100, Math.max(0, Math.round(rawPass)))
        : DEFAULT_QUIZ_PASS_PERCENT;
    const passed = score >= passPercent;
    const enrollmentRef = db.doc(`users/${uid}/enrollments/${courseId}`);
    await db.runTransaction(async (tx) => {
        const [snap, courseSnap] = await Promise.all([
            tx.get(enrollmentRef),
            tx.get(courseRef),
        ]);
        if (!snap.exists) {
            throw new https_1.HttpsError("failed-precondition", "Enroll in the course first.");
        }
        if (!courseSnap.exists) {
            throw new https_1.HttpsError("not-found", "Course not found.");
        }
        const data = snap.data() ?? {};
        const completed = Array.isArray(data.completedLessonIds)
            ? data.completedLessonIds.map(String)
            : [];
        if (passed && !completed.includes(lessonId)) {
            completed.push(lessonId);
        }
        const lessonCount = Number(course.lessonCount ?? 0);
        const allDone = lessonCount > 0 && completed.length >= lessonCount;
        const wasComplete = data.completedAt != null;
        tx.set(enrollmentRef, {
            completedLessonIds: completed,
            lastLessonId: lessonId,
            // Nested map + merge keeps attempts for the other lessons intact.
            quizAttempts: {
                [lessonId]: {
                    score,
                    passed,
                    at: firestore_1.FieldValue.serverTimestamp(),
                },
            },
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            completedAt: allDone
                ? (data.completedAt ?? firestore_1.FieldValue.serverTimestamp())
                : null,
        }, { merge: true });
        if (allDone && !wasComplete) {
            tx.update(courseRef, {
                activeStudentCount: firestore_1.FieldValue.increment(-1),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            tx.set(courseRef.collection("stats").doc("summary"), {
                completed: firestore_1.FieldValue.increment(1),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
    });
    return { score, passed, passPercent, correctByQuestion };
});
/**
 * Ensures the caller (staff) is a member of the default community RTDB chat.
 */
exports.ensureDefaultAgentGroup = (0, https_1.onCall)(callableOpts, async (request) => {
    const callerUid = await requireCaller(request, "ensureDefaultAgentGroup");
    const targetUid = String(request.data?.uid ?? callerUid);
    const caller = await db.doc(`users/${callerUid}`).get();
    const callerRole = String(caller.data()?.role ?? "");
    if (targetUid !== callerUid && callerRole !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Admins only for other users.");
    }
    const target = await db.doc(`users/${targetUid}`).get();
    if (!target.exists) {
        throw new https_1.HttpsError("not-found", "User not found.");
    }
    const targetRole = String(target.data()?.role ?? "");
    if (!(0, shared_1.belongsInDefaultAgentGroup)((0, shared_1.parseRole)(targetRole))) {
        throw new https_1.HttpsError("failed-precondition", "Agents, instructors, managers, and admins only.");
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
exports.postSupportAiMessage = (0, https_1.onCall)(callableOpts, async (request) => {
    const uid = await requireCaller(request, "postSupportAiMessage");
    const chatId = String(request.data?.chatId ?? "");
    const body = String(request.data?.body ?? "").trim();
    const senderName = "Pulse Support";
    if (chatId !== `support_${uid}`) {
        throw new https_1.HttpsError("permission-denied", "Not your support chat.");
    }
    if (!body) {
        throw new https_1.HttpsError("invalid-argument", "Message body is required.");
    }
    if (body.length > MAX_SUPPORT_MESSAGE_CHARS) {
        throw new https_1.HttpsError("invalid-argument", "Message is too long.");
    }
    const chatRef = rtdb.ref(`chats/${chatId}`);
    const chatSnap = await chatRef.get();
    const chat = chatSnap.val();
    if (!chat || chat.isSupportChat !== true) {
        throw new https_1.HttpsError("not-found", "Support chat not found.");
    }
    if (chat.members?.[uid] !== true) {
        throw new https_1.HttpsError("permission-denied", "Not a member of this chat.");
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
    const unreadCounts = {
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
exports.uploadGroupAvatar = (0, https_1.onCall)({ ...callableOpts, memory: "512MiB", timeoutSeconds: 60 }, async (request) => {
    const uid = await requireCaller(request, "uploadGroupAvatar");
    const chatId = String(request.data?.chatId ?? "").trim();
    const contentType = String(request.data?.contentType ?? "image/jpeg").trim();
    const base64 = String(request.data?.data ?? "");
    if (!chatId || chatId.startsWith("support_")) {
        throw new https_1.HttpsError("invalid-argument", "Valid chatId required.");
    }
    const allowedTypes = new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
    ]);
    if (!allowedTypes.has(contentType)) {
        throw new https_1.HttpsError("invalid-argument", "Unsupported image type.");
    }
    if (!base64 || base64.length > 7000000) {
        throw new https_1.HttpsError("invalid-argument", "Image too large or empty.");
    }
    const actor = await db.doc(`users/${uid}`).get();
    const actorRole = (0, shared_1.parseRole)(actor.data()?.role);
    const chatSnap = await rtdb.ref(`chats/${chatId}`).get();
    const chat = (chatSnap.val() ?? null);
    if (!chat || chat.isGroup !== true) {
        throw new https_1.HttpsError("not-found", "Group not found.");
    }
    if (chat.isSupportChat === true) {
        throw new https_1.HttpsError("failed-precondition", "Support chats cannot have avatars.");
    }
    const isStaff = actorRole === "admin" || actorRole === "manager";
    const isCreator = String(chat.createdBy ?? "") === uid;
    const isMember = Boolean(chat.members?.[uid]);
    if (!isStaff && !(isCreator && isMember)) {
        throw new https_1.HttpsError("permission-denied", "Not allowed to edit this group.");
    }
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
        throw new https_1.HttpsError("invalid-argument", "Image must be under 5MB.");
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
    const photoUrl = typeof meta.mediaLink === "string" && meta.mediaLink
        ? meta.mediaLink
        : `https://storage.googleapis.com/${storage.bucket().name}/${path}`;
    await rtdb.ref(`chats/${chatId}/photoUrl`).set(photoUrl);
    return { photoUrl };
});
/** Members set/clear their own emoji reaction on a non-support message. */
exports.setChatReaction = (0, https_1.onCall)(callableOpts, async (request) => {
    const uid = await requireCaller(request, "setChatReaction");
    const chatId = String(request.data?.chatId ?? "").trim();
    const messageId = String(request.data?.messageId ?? "").trim();
    const emojiRaw = request.data?.emoji;
    const emoji = emojiRaw == null || emojiRaw === ""
        ? null
        : String(emojiRaw).trim();
    if (!chatId || !messageId) {
        throw new https_1.HttpsError("invalid-argument", "chatId and messageId required.");
    }
    if (chatId.startsWith("support_")) {
        throw new https_1.HttpsError("failed-precondition", "Reactions are not allowed in support chats.");
    }
    const allowed = new Set(["👍", "❤️", "😂", "😮", "😢", "🙏"]);
    if (emoji != null && !allowed.has(emoji)) {
        throw new https_1.HttpsError("invalid-argument", "Invalid reaction.");
    }
    const chatSnap = await rtdb.ref(`chats/${chatId}`).get();
    const chat = (chatSnap.val() ?? null);
    if (!chat) {
        throw new https_1.HttpsError("not-found", "Chat not found.");
    }
    if (chat.isSupportChat === true) {
        throw new https_1.HttpsError("failed-precondition", "Reactions are not allowed in support chats.");
    }
    const members = (chat.members ?? {});
    if (members[uid] !== true) {
        throw new https_1.HttpsError("permission-denied", "Not a member of this chat.");
    }
    const messageRef = rtdb.ref(`messages/${chatId}/${messageId}`);
    const messageSnap = await messageRef.get();
    if (!messageSnap.exists()) {
        throw new https_1.HttpsError("not-found", "Message not found.");
    }
    const reactionRef = messageRef.child(`reactions/${uid}`);
    if (emoji == null) {
        await reactionRef.remove();
    }
    else {
        await reactionRef.set(emoji);
    }
    return { ok: true };
});
exports.markNotificationRead = (0, https_1.onCall)(callableOpts, async (request) => {
    const uid = await requireCaller(request, "markNotificationRead");
    const ids = Array.isArray(request.data?.notificationIds)
        ? request.data.notificationIds.map(String).filter(Boolean)
        : [];
    const notificationId = String(request.data?.notificationId ?? "");
    const all = ids.length
        ? ids
        : notificationId
            ? [notificationId]
            : [];
    if (!all.length) {
        throw new https_1.HttpsError("invalid-argument", "notificationId required");
    }
    return (0, notifications_1.markNotificationsRead)(uid, all);
});
exports.markAllNotificationsRead = (0, https_1.onCall)(callableOpts, async (request) => {
    const uid = await requireCaller(request, "markAllNotificationsRead");
    return (0, notifications_1.markNotificationsRead)(uid, "all");
});
/** When a course flips to published, notify enrolled learners. */
exports.onCoursePublished = (0, firestore_2.onDocumentWritten)({ document: "courses/{courseId}", region: "us-central1" }, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after || after.status !== "published")
        return;
    if (before?.status === "published")
        return;
    const courseId = event.params.courseId;
    const title = String(after.title ?? "Course");
    const enrollments = await db
        .collectionGroup("enrollments")
        .where("courseId", "==", courseId)
        .limit(200)
        .get();
    const uids = new Set();
    for (const doc of enrollments.docs) {
        const parent = doc.ref.parent.parent;
        if (parent)
            uids.add(parent.id);
    }
    const uidList = [...uids];
    const CHUNK = 50;
    for (let i = 0; i < uidList.length; i += CHUNK) {
        const chunk = uidList.slice(i, i + CHUNK);
        await Promise.all(chunk.map((uid) => (0, notifications_1.notifyUser)(uid, {
            type: "course_published",
            title: "Course published",
            body: title.slice(0, 120),
            href: `/academy/${courseId}`,
            deepLink: `pulse://academy/${courseId}`,
            ref: { courseId },
        })));
    }
});
// ---------------------------------------------------------------------------
// Account lifecycle
//
// Deactivation is user-reversible (sign in again and reactivate). Deletion
// starts a 90-day grace period: shared content is anonymized immediately,
// personal data is purged by the daily cron once the grace period ends.
// ---------------------------------------------------------------------------
const ACCOUNT_DELETION_GRACE_DAYS = 90;
async function clearFcmTokens(uid) {
    const tokens = await db.collection(`users/${uid}/fcmTokens`).limit(50).get();
    await Promise.all(tokens.docs.map((doc) => doc.ref.delete()));
}
/** Sequential anonimo1 / anonimo2 / … labels, allocated transactionally. */
async function nextAnonymousLabel() {
    const ref = db.doc("system/anonCounter");
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const count = Number(snap.data()?.count ?? 0) + 1;
        tx.set(ref, { count }, { merge: true });
        return `anonimo${count}`;
    });
}
/** Rewrites author identity on the user's forum threads and replies. */
async function renameForumContent(uid, authorName, authorPhotoUrl) {
    const [threads, replies] = await Promise.all([
        db.collection("threads").where("authorId", "==", uid).limit(500).get(),
        db.collectionGroup("replies").where("authorId", "==", uid).limit(500).get(),
    ]);
    const docs = [...threads.docs, ...replies.docs];
    for (let i = 0; i < docs.length; i += 400) {
        const batch = db.batch();
        for (const doc of docs.slice(i, i + 400)) {
            batch.update(doc.ref, { authorName, authorPhotoUrl });
        }
        await batch.commit();
    }
}
/** Rewrites the user's display name inside their RTDB chats. */
async function renameChatMemberships(uid, name) {
    const index = await rtdb.ref(`userChats/${uid}`).get();
    const chatIds = Object.keys((index.val() ?? {}));
    const updates = {};
    for (const chatId of chatIds.slice(0, 200)) {
        updates[`chats/${chatId}/memberNames/${uid}`] = name;
    }
    if (Object.keys(updates).length)
        await rtdb.ref().update(updates);
}
exports.deactivateAccount = (0, https_1.onCall)(callableOpts, async (request) => {
    const uid = await requireCaller(request, "deactivateAccount", {
        allowInactive: true,
    });
    const userRef = db.doc(`users/${uid}`);
    const snap = await userRef.get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "User not found.");
    if (snap.data()?.accountStatus === "pendingDeletion") {
        throw new https_1.HttpsError("failed-precondition", "Deletion already requested.");
    }
    await userRef.update({
        accountStatus: "deactivated",
        deactivatedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await clearFcmTokens(uid);
    return { ok: true };
});
exports.reactivateAccount = (0, https_1.onCall)(callableOpts, async (request) => {
    const uid = await requireCaller(request, "reactivateAccount", {
        allowInactive: true,
    });
    const userRef = db.doc(`users/${uid}`);
    const snap = await userRef.get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "User not found.");
    if (snap.data()?.accountStatus !== "deactivated") {
        throw new https_1.HttpsError("failed-precondition", "Account is not deactivated.");
    }
    await userRef.update({
        accountStatus: "active",
        deactivatedAt: firestore_1.FieldValue.delete(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { ok: true };
});
exports.requestAccountDeletion = (0, https_1.onCall)(callableOpts, async (request) => {
    const uid = await requireCaller(request, "requestAccountDeletion", {
        allowInactive: true,
    });
    const userRef = db.doc(`users/${uid}`);
    const snap = await userRef.get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "User not found.");
    const data = snap.data() ?? {};
    if (data.accountStatus === "pendingDeletion") {
        throw new https_1.HttpsError("failed-precondition", "Deletion already requested.");
    }
    const label = await nextAnonymousLabel();
    const scheduledMs = Date.now() + ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;
    // Snapshot the identity so a cancel inside the grace period can restore it.
    await userRef.update({
        accountStatus: "pendingDeletion",
        deletionRequestedAt: firestore_1.FieldValue.serverTimestamp(),
        deletionScheduledAt: firestore_1.Timestamp.fromMillis(scheduledMs),
        anonymousLabel: label,
        deletionSnapshot: {
            displayName: typeof data.displayName === "string" ? data.displayName : null,
            photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
        },
        displayName: label,
        photoUrl: null,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    // Shared content stays but under the anonymous identity, effective now.
    await renameForumContent(uid, label, null);
    await renameChatMemberships(uid, label);
    await clearFcmTokens(uid);
    return { deletionScheduledAt: scheduledMs };
});
exports.cancelAccountDeletion = (0, https_1.onCall)(callableOpts, async (request) => {
    const uid = await requireCaller(request, "cancelAccountDeletion", {
        allowInactive: true,
    });
    const userRef = db.doc(`users/${uid}`);
    const snap = await userRef.get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "User not found.");
    const data = snap.data() ?? {};
    if (data.accountStatus !== "pendingDeletion") {
        throw new https_1.HttpsError("failed-precondition", "No pending deletion.");
    }
    const snapshot = (data.deletionSnapshot ?? {});
    const displayName = typeof snapshot.displayName === "string" ? snapshot.displayName : null;
    const photoUrl = typeof snapshot.photoUrl === "string" ? snapshot.photoUrl : null;
    await userRef.update({
        accountStatus: "active",
        deletionRequestedAt: firestore_1.FieldValue.delete(),
        deletionScheduledAt: firestore_1.FieldValue.delete(),
        anonymousLabel: firestore_1.FieldValue.delete(),
        deletionSnapshot: firestore_1.FieldValue.delete(),
        displayName,
        photoUrl,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await renameForumContent(uid, displayName ?? "Usuario", photoUrl);
    await renameChatMemberships(uid, displayName ?? "Usuario");
    return { ok: true };
});
/**
 * Daily purge of accounts whose 90-day grace period expired. Removes personal
 * data (profile + subcollections, avatar, chat index, Auth user); forum and
 * chat content stays under the anonymous label assigned at request time.
 */
exports.purgeDeletedAccounts = (0, scheduler_1.onSchedule)("every 24 hours", async () => {
    const pending = await db
        .collection("users")
        .where("accountStatus", "==", "pendingDeletion")
        .limit(100)
        .get();
    const now = Date.now();
    const due = pending.docs.filter((doc) => {
        const scheduled = doc.data().deletionScheduledAt;
        const ms = scheduled instanceof firestore_1.Timestamp
            ? scheduled.toMillis()
            : Number(scheduled ?? Number.POSITIVE_INFINITY);
        return ms <= now;
    });
    for (const doc of due.slice(0, 20)) {
        const uid = doc.id;
        await db.recursiveDelete(doc.ref);
        await rtdb.ref(`userChats/${uid}`).remove().catch(() => undefined);
        await storage
            .bucket()
            .file(`avatars/${uid}.jpg`)
            .delete()
            .catch(() => undefined);
        await auth.deleteUser(uid).catch(() => undefined);
    }
});
/** Seed thread author as participant when a question is posted. */
exports.onThreadCreated = (0, firestore_2.onDocumentWritten)({ document: "threads/{threadId}", region: "us-central1" }, async (event) => {
    if (!event.data?.after.exists || event.data.before.exists)
        return;
    const threadId = event.params.threadId;
    const authorId = String(event.data.after.data()?.authorId ?? "");
    if (authorId)
        await (0, notifications_1.ensureThreadParticipant)(threadId, authorId);
});
/**
 * Cross-app SSO for Pulse ↔ Studio (different origins / ports).
 *
 * Preferred: createSsoHandoff (authenticated) → opaque code → exchangeSsoToken({ code }).
 * Direct idToken exchange is rejected to avoid JWT-in-URL style misuse of this API.
 */
exports.createSsoHandoff = (0, https_1.onCall)(callableOpts, async (request) => {
    const uid = await requireCaller(request, "createSsoHandoff");
    const code = (0, node_crypto_1.randomBytes)(32).toString("base64url");
    const now = Date.now();
    await db.collection("ssoHandoffs").doc(code).set({
        uid,
        used: false,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        expiresAt: firestore_1.Timestamp.fromMillis(now + 60000),
    });
    return { code };
});
exports.exchangeSsoToken = (0, https_1.onCall)(callableOpts, async (request) => {
    const code = String(request.data?.code ?? "").trim();
    if (code.length < 32) {
        throw new https_1.HttpsError("invalid-argument", "Opaque handoff code required. Use createSsoHandoff first.");
    }
    const ref = db.collection("ssoHandoffs").doc(code);
    const uid = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
            throw new https_1.HttpsError("unauthenticated", "Invalid or expired handoff.");
        }
        const data = snap.data() ?? {};
        if (data.used === true) {
            throw new https_1.HttpsError("unauthenticated", "Invalid or expired handoff.");
        }
        const expiresAt = data.expiresAt;
        if (!expiresAt || expiresAt.toMillis() < Date.now()) {
            tx.delete(ref);
            throw new https_1.HttpsError("unauthenticated", "Invalid or expired handoff.");
        }
        const handoffUid = String(data.uid ?? "");
        if (!handoffUid) {
            tx.delete(ref);
            throw new https_1.HttpsError("unauthenticated", "Invalid or expired handoff.");
        }
        tx.update(ref, {
            used: true,
            usedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return handoffUid;
    });
    await consumeFunctionQuota(uid, "exchangeSsoToken");
    const customToken = await auth.createCustomToken(uid, { sso: true });
    void ref.delete().catch(() => undefined);
    return { customToken, uid };
});
async function getOrCreateOrgRootId() {
    const existing = await db
        .collection("orgNodes")
        .where("type", "==", "organization")
        .limit(1)
        .get();
    if (!existing.empty) {
        const doc = existing.docs[0];
        await doc.ref.set({
            active: true,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        return doc.id;
    }
    const ref = db.collection("orgNodes").doc();
    await ref.set({
        name: shared_1.DEFAULT_ORG_ROOT_NAME,
        type: "organization",
        depth: 1,
        parentId: null,
        path: [ref.id],
        managerUids: [],
        active: true,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return ref.id;
}
/** Agencies hang directly under the Every Benefits organization root. */
exports.createAgency = (0, https_1.onCall)(callableOpts, async (request) => {
    const actorUid = await requireCaller(request, "createAgency");
    const actor = await requireAdminStaff(actorUid);
    if (!(0, shared_1.canManagePlatform)(actor.role)) {
        throw new https_1.HttpsError("permission-denied", "Admins only.");
    }
    const name = String(request.data?.name ?? "").trim().slice(0, 120);
    if (!name)
        throw new https_1.HttpsError("invalid-argument", "name required");
    const rootId = await getOrCreateOrgRootId();
    const ref = db.collection("orgNodes").doc();
    const node = {
        name,
        type: "agency",
        depth: shared_1.ORG_TYPE_DEPTH.agency,
        parentId: rootId,
        path: [rootId, ref.id],
        managerUids: [],
        active: true,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    await ref.set(node);
    return { node: serializeOrgNode(ref.id, node) };
});
/**
 * Flattens legacy layers: agencies → root, sub_agencies kept under agencies,
 * team/unit/division/region deactivated; users reassigned to nearest live ancestor.
 */
exports.repairOrgTree = (0, https_1.onCall)(callableOpts, async (request) => {
    const actorUid = await requireCaller(request, "repairOrgTree");
    const actor = await requireAdminStaff(actorUid);
    if (!(0, shared_1.canManagePlatform)(actor.role)) {
        throw new https_1.HttpsError("permission-denied", "Admins only.");
    }
    const rootId = await getOrCreateOrgRootId();
    const all = await db.collection("orgNodes").limit(1000).get();
    const byId = new Map(all.docs.map((d) => [d.id, d]));
    let moved = 0;
    let deactivatedLegacy = 0;
    let usersReassigned = 0;
    const agencies = [];
    const byParent = new Map();
    const legacyIds = [];
    for (const doc of all.docs) {
        const data = doc.data();
        const type = String(data.type ?? "");
        const parentId = data.parentId == null || data.parentId === ""
            ? null
            : String(data.parentId);
        if (parentId) {
            const list = byParent.get(parentId) ?? [];
            list.push(doc.id);
            byParent.set(parentId, list);
        }
        if (type === "agency")
            agencies.push({ id: doc.id, data });
        const anyType = (0, shared_1.parseAnyOrgNodeType)(type);
        if (anyType === "division" ||
            anyType === "region" ||
            anyType === "team" ||
            anyType === "unit") {
            legacyIds.push(doc.id);
            if (data.active !== false) {
                await doc.ref.update({
                    active: false,
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                });
                deactivatedLegacy += 1;
            }
        }
    }
    for (const agency of agencies) {
        const needsMove = agency.data.parentId !== rootId ||
            Number(agency.data.depth) !== shared_1.ORG_TYPE_DEPTH.agency;
        if (needsMove) {
            await db.doc(`orgNodes/${agency.id}`).update({
                parentId: rootId,
                path: [rootId, agency.id],
                depth: shared_1.ORG_TYPE_DEPTH.agency,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            moved += 1;
        }
        // Fix live descendants (sub_agency only) depth + path under this agency.
        const queue = [
            { id: agency.id, path: [rootId, agency.id] },
        ];
        while (queue.length) {
            const parent = queue.shift();
            for (const childId of byParent.get(parent.id) ?? []) {
                const childSnap = byId.get(childId);
                if (!childSnap)
                    continue;
                const childType = (0, shared_1.parseOrgNodeType)(childSnap.data()?.type);
                if (childType !== "sub_agency")
                    continue;
                const path = [...parent.path, childId];
                const depth = shared_1.ORG_TYPE_DEPTH.sub_agency;
                const parentId = parent.id;
                const data = childSnap.data() ?? {};
                const needsUpdate = Number(data.depth) !== depth ||
                    String(data.parentId ?? "") !== parentId ||
                    JSON.stringify(Array.isArray(data.path) ? data.path : []) !==
                        JSON.stringify(path);
                if (needsUpdate) {
                    await childSnap.ref.update({
                        parentId,
                        depth,
                        path,
                        updatedAt: firestore_1.FieldValue.serverTimestamp(),
                    });
                    moved += 1;
                }
                queue.push({ id: childId, path });
            }
        }
    }
    // Reassign users on legacy nodes to nearest agency / sub_agency ancestor.
    const liveAssignable = new Set(all.docs
        .filter((d) => {
        const t = (0, shared_1.parseOrgNodeType)(d.data()?.type);
        return t === "agency" || t === "sub_agency";
    })
        .map((d) => d.id));
    for (const legacyId of legacyIds) {
        const legacyDoc = byId.get(legacyId);
        if (!legacyDoc)
            continue;
        const path = Array.isArray(legacyDoc.data()?.path)
            ? legacyDoc.data().path.map(String)
            : [];
        let target = null;
        for (let i = path.length - 1; i >= 0; i -= 1) {
            const id = path[i];
            if (id === legacyId)
                continue;
            if (liveAssignable.has(id)) {
                target = id;
                break;
            }
        }
        if (!target) {
            // Fallback: walk parentId chain using in-memory graph.
            let cursor = legacyDoc.data()?.parentId == null || legacyDoc.data()?.parentId === ""
                ? null
                : String(legacyDoc.data()?.parentId);
            while (cursor) {
                if (liveAssignable.has(cursor)) {
                    target = cursor;
                    break;
                }
                const parentDoc = byId.get(cursor);
                if (!parentDoc)
                    break;
                cursor =
                    parentDoc.data()?.parentId == null || parentDoc.data()?.parentId === ""
                        ? null
                        : String(parentDoc.data()?.parentId);
            }
        }
        if (!target)
            continue;
        const userSnap = await db
            .collection("users")
            .where("orgNodeId", "==", legacyId)
            .limit(500)
            .get();
        for (const userDoc of userSnap.docs) {
            await userDoc.ref.update({
                orgNodeId: target,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            usersReassigned += 1;
        }
    }
    return {
        ok: true,
        moved,
        deactivatedLegacy,
        usersReassigned,
        rootId,
    };
});
exports.adminSendNotification = (0, https_1.onCall)(callableWithEmailOpts, async (request) => {
    const actorUid = await requireCaller(request, "adminSendNotification");
    const actor = await requireAdminStaff(actorUid);
    if (!(0, shared_1.canManagePlatform)(actor.role)) {
        throw new https_1.HttpsError("permission-denied", "Admins only.");
    }
    const title = String(request.data?.title ?? "").trim().slice(0, 120);
    const body = String(request.data?.body ?? "").trim().slice(0, 500);
    const href = String(request.data?.href ?? "/notifications").trim().slice(0, 400);
    const audience = String(request.data?.audience ?? "all").trim();
    if (!title || !body) {
        throw new https_1.HttpsError("invalid-argument", "title and body required");
    }
    const targetUids = new Set();
    if (audience === "uids" && Array.isArray(request.data?.uids)) {
        for (const id of request.data.uids.map(String).slice(0, 200)) {
            if (id)
                targetUids.add(id);
        }
    }
    else if (audience === "role") {
        const role = (0, shared_1.parseRole)(request.data?.role);
        const snap = await db
            .collection("users")
            .where("role", "==", role)
            .where("isAnonymous", "==", false)
            .limit(500)
            .get();
        for (const doc of snap.docs) {
            if (String(doc.data()?.approvalStatus ?? "approved") === "approved") {
                targetUids.add(doc.id);
            }
        }
    }
    else if (audience === "org") {
        const orgNodeId = String(request.data?.orgNodeId ?? "").trim();
        if (!orgNodeId) {
            throw new https_1.HttpsError("invalid-argument", "orgNodeId required");
        }
        const snap = await db
            .collection("users")
            .where("orgNodeId", "==", orgNodeId)
            .limit(500)
            .get();
        for (const doc of snap.docs)
            targetUids.add(doc.id);
    }
    else {
        const snap = await db
            .collection("users")
            .where("isAnonymous", "==", false)
            .limit(1000)
            .get();
        for (const doc of snap.docs) {
            const data = doc.data();
            if (String(data.approvalStatus ?? "approved") !== "approved")
                continue;
            if (String(data.accountStatus ?? "active") !== "active")
                continue;
            targetUids.add(doc.id);
        }
    }
    let sent = 0;
    let failed = 0;
    const deepLink = `everybenefits://notifications`;
    const uids = [...targetUids];
    const CHUNK = 50;
    for (let i = 0; i < uids.length; i += CHUNK) {
        const chunk = uids.slice(i, i + CHUNK);
        const results = await Promise.allSettled(chunk.map((uid) => (0, notifications_1.notifyUser)(uid, {
            type: "admin_broadcast",
            title,
            body,
            href: href.startsWith("/") ? href : `/${href}`,
            deepLink,
            ref: { source: "admin", actorId: actorUid },
            actorId: actorUid,
        })));
        for (const result of results) {
            if (result.status === "fulfilled")
                sent += 1;
            else
                failed += 1;
        }
    }
    return { sent, failed, total: targetUids.size };
});
exports.onUserPendingApproval = (0, firestore_2.onDocumentWritten)({
    document: "users/{uid}",
    region: "us-central1",
    ...emailSecretsOpts,
}, async (event) => {
    const after = event.data?.after;
    if (!after?.exists)
        return;
    const before = event.data?.before;
    const afterStatus = String(after.data()?.approvalStatus ?? "");
    const beforeStatus = before?.exists
        ? String(before.data()?.approvalStatus ?? "")
        : "";
    if (afterStatus !== "pending" || beforeStatus === "pending")
        return;
    const uid = event.params.uid;
    const data = after.data() ?? {};
    const displayName = typeof data.displayName === "string" && data.displayName.trim()
        ? data.displayName.trim()
        : typeof data.email === "string"
            ? data.email
            : uid;
    const email = typeof data.email === "string" ? data.email : "";
    const admins = await db
        .collection("users")
        .where("role", "==", "admin")
        .where("isAnonymous", "==", false)
        .limit(100)
        .get();
    const approvalsUrl = `${email_1.ADMIN_WEB_URL}/en/approvals`;
    for (const adminDoc of admins.docs) {
        if (adminDoc.id === uid)
            continue;
        await (0, notifications_1.notifyUser)(adminDoc.id, {
            type: "registration_pending",
            title: "New registration pending",
            body: `${displayName} is waiting for approval`,
            href: approvalsUrl,
            deepLink: "everybenefits://admin/approvals",
            ref: { userId: uid },
            actorId: uid,
            actorName: displayName,
            force: true,
        }).catch(() => undefined);
        const adminEmail = typeof adminDoc.data()?.email === "string"
            ? String(adminDoc.data().email)
            : "";
        if (adminEmail) {
            await (0, email_1.sendTransactionalEmail)({
                to: adminEmail,
                subject: `Approval needed: ${displayName}`,
                html: `<p><strong>${displayName}</strong>${email ? ` (${email})` : ""} registered and is waiting for approval.</p><p><a href="${approvalsUrl}">Open Approvals</a></p>`,
                text: `${displayName} registered and needs approval. ${approvalsUrl}`,
            }).catch(() => undefined);
        }
    }
});
exports.createUserInvite = (0, https_1.onCall)(callableWithEmailOpts, async (request) => {
    const actorUid = await requireCaller(request, "createUserInvite");
    const actor = await requireAdminStaff(actorUid);
    if (!(0, shared_1.canManagePlatform)(actor.role)) {
        throw new https_1.HttpsError("permission-denied", "Admins only.");
    }
    const email = String(request.data?.email ?? "")
        .trim()
        .toLowerCase();
    const role = (0, shared_1.parseRole)(request.data?.role ?? "agent");
    const displayName = String(request.data?.displayName ?? "").trim().slice(0, 80);
    const orgNodeIdRaw = request.data?.orgNodeId;
    const orgNodeId = orgNodeIdRaw == null || orgNodeIdRaw === ""
        ? null
        : String(orgNodeIdRaw);
    const locale = String(request.data?.locale ?? "en").trim() === "es" ? "es" : "en";
    if (!email || !email.includes("@")) {
        throw new https_1.HttpsError("invalid-argument", "Valid email required.");
    }
    if (role === "guest") {
        throw new https_1.HttpsError("invalid-argument", "Cannot invite as guest.");
    }
    let userRecord;
    try {
        userRecord = await auth.createUser({
            email,
            emailVerified: false,
            displayName: displayName || undefined,
            disabled: false,
        });
    }
    catch (error) {
        const code = error && typeof error === "object" && "code" in error
            ? String(error.code)
            : "";
        if (code === "auth/email-already-exists") {
            throw new https_1.HttpsError("already-exists", "A user with this email already exists.");
        }
        throw error;
    }
    let agencyName = null;
    if (orgNodeId) {
        const node = await db.doc(`orgNodes/${orgNodeId}`).get();
        if (!node.exists) {
            await auth.deleteUser(userRecord.uid).catch(() => undefined);
            throw new https_1.HttpsError("not-found", "Org node not found.");
        }
        agencyName =
            typeof node.data()?.name === "string" ? String(node.data().name) : null;
    }
    await db.doc(`users/${userRecord.uid}`).set({
        email,
        displayName: displayName || null,
        photoUrl: null,
        role,
        isAnonymous: false,
        profileCompleted: false,
        approvalStatus: "approved",
        accountStatus: "active",
        inviteStatus: "pending",
        orgNodeId,
        agency: agencyName,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        invitedBy: actorUid,
    }, { merge: true });
    const token = (0, node_crypto_1.randomBytes)(32).toString("base64url");
    const expiresAt = firestore_1.Timestamp.fromMillis(Date.now() + INVITE_TTL_MS);
    await db.doc(`userInvites/${token}`).set({
        uid: userRecord.uid,
        email,
        role,
        orgNodeId,
        createdBy: actorUid,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        expiresAt,
        used: false,
    });
    const inviteUrl = `${email_1.PULSE_WEB_URL}/${locale}/invite/${token}`;
    await (0, email_1.sendTransactionalEmail)({
        to: email,
        subject: "You're invited to Every Benefits Pulse",
        html: `<p>You've been invited to Pulse${displayName ? `, ${displayName}` : ""}.</p><p><a href="${inviteUrl}">Complete your account</a></p><p>This link expires in 7 days.</p>`,
        text: `Complete your Pulse account: ${inviteUrl}`,
    });
    return { uid: userRecord.uid, inviteUrl, email };
});
exports.getInvite = (0, https_1.onCall)(callableOpts, async (request) => {
    const token = String(request.data?.token ?? "").trim();
    if (token.length < 20) {
        throw new https_1.HttpsError("invalid-argument", "Invalid invite token.");
    }
    const snap = await db.doc(`userInvites/${token}`).get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "Invite not found.");
    const data = snap.data() ?? {};
    if (data.used === true) {
        throw new https_1.HttpsError("failed-precondition", "Invite already used.");
    }
    const expiresAt = data.expiresAt;
    if (!expiresAt || expiresAt.toMillis() < Date.now()) {
        throw new https_1.HttpsError("failed-precondition", "Invite expired.");
    }
    return {
        email: String(data.email ?? ""),
        role: (0, shared_1.parseRole)(data.role),
        displayNameHint: null,
        requiresNpn: (0, shared_1.parseRole)(data.role) === "agent",
    };
});
exports.completeInvite = (0, https_1.onCall)(callableOpts, async (request) => {
    const token = String(request.data?.token ?? "").trim();
    const password = String(request.data?.password ?? "");
    const displayName = String(request.data?.displayName ?? "").trim().slice(0, 80);
    const phoneCountryCode = String(request.data?.phoneCountryCode ?? "").trim();
    const phoneNumber = String(request.data?.phoneNumber ?? "").trim();
    const npn = String(request.data?.npn ?? "").trim().slice(0, 40);
    if (token.length < 20) {
        throw new https_1.HttpsError("invalid-argument", "Invalid invite token.");
    }
    if (password.length < 8) {
        throw new https_1.HttpsError("invalid-argument", "Password must be at least 8 characters.");
    }
    if (!displayName) {
        throw new https_1.HttpsError("invalid-argument", "Display name required.");
    }
    const inviteRef = db.doc(`userInvites/${token}`);
    const inviteSnap = await inviteRef.get();
    if (!inviteSnap.exists)
        throw new https_1.HttpsError("not-found", "Invite not found.");
    const invite = inviteSnap.data() ?? {};
    if (invite.used === true) {
        throw new https_1.HttpsError("failed-precondition", "Invite already used.");
    }
    const expiresAt = invite.expiresAt;
    if (!expiresAt || expiresAt.toMillis() < Date.now()) {
        throw new https_1.HttpsError("failed-precondition", "Invite expired.");
    }
    const uid = String(invite.uid ?? "");
    if (!uid)
        throw new https_1.HttpsError("failed-precondition", "Invite is incomplete.");
    const role = (0, shared_1.parseRole)(invite.role);
    if (role === "agent" && !npn) {
        throw new https_1.HttpsError("invalid-argument", "NPN required for agents.");
    }
    await auth.updateUser(uid, {
        password,
        displayName,
        emailVerified: true,
    });
    await db.doc(`users/${uid}`).set({
        displayName,
        phoneCountryCode: phoneCountryCode || null,
        phoneNumber: phoneNumber || null,
        npn: npn || null,
        profileCompleted: true,
        inviteStatus: "completed",
        approvalStatus: "approved",
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    await inviteRef.update({
        used: true,
        usedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    const customToken = await auth.createCustomToken(uid, {
        invite: true,
    });
    return { ok: true, uid, customToken };
});
//# sourceMappingURL=index.js.map