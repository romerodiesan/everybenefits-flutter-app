"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenDocId = tokenDocId;
exports.readPrefsFromData = readPrefsFromData;
exports.groupKeyFor = groupKeyFor;
exports.notifyUser = notifyUser;
exports.markNotificationsRead = markNotificationsRead;
exports.ensureThreadParticipant = ensureThreadParticipant;
exports.listThreadNotifyTargets = listThreadNotifyTargets;
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const node_crypto_1 = require("node:crypto");
/** Lazy — module may load before index.ts calls initializeApp(). */
function db() {
    return (0, firestore_1.getFirestore)();
}
const TYPE_CHANNEL = {
    chat_message: "chats",
    forum_reply: "forums",
    forum_vote: "forums",
    forum_new_thread: "forums",
    course_published: "academy",
    support_message: "support",
    admin_broadcast: "system",
    registration_pending: "system",
};
const FORUM_TYPES = new Set([
    "forum_reply",
    "forum_vote",
    "forum_new_thread",
]);
const ACTOR_CAP = 3;
const PUSH_DEBOUNCE_MS = 60000;
function tokenDocId(token) {
    return (0, node_crypto_1.createHash)("sha256").update(token).digest("hex").slice(0, 40);
}
function readPrefsFromData(prefs) {
    const p = prefs ?? {};
    const pushForums = p.pushForums !== false;
    return {
        pushChats: p.pushChats !== false,
        pushForums,
        pushAcademy: p.pushAcademy !== false,
        pushSupport: p.pushSupport !== false,
        // Inherit channel default when finer keys are missing.
        pushForumVotes: p.pushForumVotes !== false && pushForums,
        pushForumReplies: p.pushForumReplies !== false && pushForums,
        pushAdmin: p.pushAdmin !== false,
        inAppChats: p.inAppChats !== false,
        inAppForums: p.inAppForums !== false,
        inAppAcademy: p.inAppAcademy !== false,
        inAppSupport: p.inAppSupport !== false,
        inAppAdmin: p.inAppAdmin !== false,
    };
}
async function readPrefs(uid) {
    const snap = await db().doc(`users/${uid}/notificationState/default`).get();
    return readPrefsFromData((snap.data()?.prefs ?? {}));
}
function channelAllowsInApp(prefs, channel) {
    switch (channel) {
        case "chats":
            return prefs.inAppChats;
        case "forums":
            return prefs.inAppForums;
        case "academy":
            return prefs.inAppAcademy;
        case "support":
            return prefs.inAppSupport;
        case "system":
            return prefs.inAppAdmin;
    }
}
function channelAllowsPush(prefs, type) {
    const channel = TYPE_CHANNEL[type];
    if (type === "forum_vote")
        return prefs.pushForumVotes;
    if (type === "forum_reply" || type === "forum_new_thread") {
        return prefs.pushForumReplies;
    }
    switch (channel) {
        case "chats":
            return prefs.pushChats;
        case "forums":
            return prefs.pushForums;
        case "academy":
            return prefs.pushAcademy;
        case "support":
            return prefs.pushSupport;
        case "system":
            return prefs.pushAdmin;
    }
}
/** Deterministic group key while the notification stays unread. */
function groupKeyFor(type, ref) {
    if (type === "forum_vote") {
        const threadId = ref.threadId ?? "";
        const target = ref.replyId ? `reply:${ref.replyId}` : "thread";
        return threadId ? `forum_vote:${threadId}:${target}` : null;
    }
    if (type === "forum_reply") {
        return ref.threadId ? `forum_reply:${ref.threadId}` : null;
    }
    if (type === "chat_message" || type === "support_message") {
        return ref.chatId ? `${type}:${ref.chatId}` : null;
    }
    return null;
}
function formatActors(actors, count) {
    const names = actors.filter(Boolean).slice(0, ACTOR_CAP);
    if (!names.length)
        return count > 1 ? `${count} people` : "Someone";
    if (count <= 1 || names.length === 1)
        return names[0];
    if (count === 2 && names.length >= 2)
        return `${names[0]} and ${names[1]}`;
    const extra = Math.max(0, count - names.length);
    if (extra <= 0) {
        return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    }
    return `${names.join(", ")} and ${extra} other${extra === 1 ? "" : "s"}`;
}
function aggregatedCopy(type, actors, count, fallbackTitle, fallbackBody, preview) {
    const who = formatActors(actors, count);
    if (type === "forum_vote") {
        return {
            title: count > 1 ? `${count} upvotes` : "New upvote",
            body: count > 1
                ? `${who} upvoted your post`
                : `${who} upvoted your post`,
        };
    }
    if (type === "forum_reply") {
        return {
            title: count > 1 ? `${count} new replies` : "New reply",
            body: count > 1
                ? `${who} replied to a thread you follow`
                : `${who} replied to a thread you follow`,
        };
    }
    if (type === "chat_message" || type === "support_message") {
        const label = type === "support_message" ? "Support" : "Chat";
        return {
            title: count > 1 ? `${label} · ${count} messages` : label,
            body: preview?.trim() || fallbackBody || "You have a new message",
        };
    }
    return { title: fallbackTitle, body: fallbackBody };
}
async function shouldDebouncePush(uid, groupKey) {
    const ref = db().doc(`notificationDebounce/${uid}_${groupKey.replace(/[/]/g, "_")}`);
    const now = Date.now();
    const snap = await ref.get();
    const last = Number(snap.data()?.lastSentAt ?? 0);
    if (now - last < PUSH_DEBOUNCE_MS)
        return true;
    await ref.set({ lastSentAt: now, uid, groupKey }, { merge: true });
    return false;
}
async function notifyUser(uid, payload, options) {
    if (!uid || uid === "support-ai")
        return;
    const channel = TYPE_CHANNEL[payload.type];
    const prefs = await readPrefs(uid);
    if (!payload.force && !channelAllowsInApp(prefs, channel))
        return;
    const ref = payload.ref ?? {};
    const groupKey = groupKeyFor(payload.type, ref) ??
        (options?.chatIdForDebounce
            ? groupKeyFor(payload.type, { chatId: options.chatIdForDebounce })
            : null);
    const actorName = (payload.actorName ?? "").trim().slice(0, 60);
    const actorId = (payload.actorId ?? "").trim();
    const col = db().collection(`users/${uid}/notifications`);
    const stateRef = db().doc(`users/${uid}/notificationState/default`);
    const isForum = FORUM_TYPES.has(payload.type);
    let notifId = "";
    let isNew = true;
    let pushTitle = payload.title;
    let pushBody = payload.body;
    await db().runTransaction(async (tx) => {
        const stateSnap = await tx.get(stateRef);
        const stateData = stateSnap.data() ?? {};
        const unread = Number(stateData.unreadCount ?? 0);
        const forumUnread = Number(stateData.unreadForumCount ?? 0);
        const openGroups = {
            ...(stateData.openGroups ?? {}),
        };
        let existingRef = null;
        if (groupKey && openGroups[groupKey]) {
            existingRef = col.doc(openGroups[groupKey]);
        }
        const existingSnap = existingRef ? await tx.get(existingRef) : null;
        if (existingSnap?.exists &&
            existingSnap.data()?.read !== true &&
            existingSnap.data()?.groupKey === groupKey) {
            isNew = false;
            notifId = existingSnap.id;
            const data = existingSnap.data();
            const prevActors = Array.isArray(data.actors)
                ? data.actors.map(String)
                : [];
            const actors = [...prevActors];
            if (actorName && !actors.includes(actorName)) {
                actors.unshift(actorName);
            }
            const trimmedActors = actors.slice(0, ACTOR_CAP);
            const count = Number(data.count ?? 1) + 1;
            const copy = aggregatedCopy(payload.type, trimmedActors, count, payload.title, payload.body, payload.body);
            pushTitle = copy.title;
            pushBody = copy.body;
            tx.update(existingSnap.ref, {
                title: copy.title.slice(0, 120),
                body: copy.body.slice(0, 500),
                href: payload.href.slice(0, 400),
                deepLink: payload.deepLink.slice(0, 400),
                ref,
                count,
                actors: trimmedActors,
                ...(actorId ? { lastActorId: actorId } : {}),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
                createdAt: firestore_1.FieldValue.serverTimestamp(),
            });
            return;
        }
        const notifRef = col.doc();
        notifId = notifRef.id;
        const actors = actorName ? [actorName] : [];
        const copy = aggregatedCopy(payload.type, actors, 1, payload.title, payload.body, payload.body);
        pushTitle = copy.title;
        pushBody = copy.body;
        tx.set(notifRef, {
            type: payload.type,
            title: copy.title.slice(0, 120),
            body: copy.body.slice(0, 500),
            href: payload.href.slice(0, 400),
            deepLink: payload.deepLink.slice(0, 400),
            ref,
            read: false,
            groupKey: groupKey ?? null,
            count: 1,
            actors,
            ...(actorId ? { lastActorId: actorId } : {}),
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        const nextOpen = { ...openGroups };
        if (groupKey)
            nextOpen[groupKey] = notifId;
        tx.set(stateRef, {
            unreadCount: unread + 1,
            unreadForumCount: isForum ? forumUnread + 1 : forumUnread,
            openGroups: nextOpen,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    const pushAllowed = (payload.force || channelAllowsPush(prefs, payload.type)) &&
        !payload.silent;
    if (!pushAllowed)
        return;
    // Debounce push for grouped chat/support (inbox already updated).
    const debounceKey = groupKey ??
        (options?.chatIdForDebounce
            ? `chat:${options.chatIdForDebounce}`
            : null);
    if (debounceKey &&
        (payload.type === "chat_message" || payload.type === "support_message") &&
        (await shouldDebouncePush(uid, debounceKey))) {
        return;
    }
    const tokensSnap = await db().collection(`users/${uid}/fcmTokens`).limit(20).get();
    if (tokensSnap.empty)
        return;
    const stateSnap = await stateRef.get();
    const badge = Number(stateSnap.data()?.unreadCount ?? 1);
    const response = await (0, messaging_1.getMessaging)().sendEachForMulticast({
        tokens: tokensSnap.docs.map((doc) => String(doc.data().token)),
        notification: {
            title: pushTitle.slice(0, 120),
            body: pushBody.slice(0, 200),
        },
        data: {
            type: payload.type,
            href: payload.href,
            deepLink: payload.deepLink,
            notificationId: notifId,
            isNew: isNew ? "1" : "0",
        },
        apns: {
            payload: {
                aps: {
                    badge,
                    sound: "default",
                },
            },
        },
        webpush: {
            fcmOptions: {
                link: payload.href.startsWith("http") ? payload.href : undefined,
            },
        },
    });
    const stale = [];
    response.responses.forEach((result, index) => {
        if (!result.success) {
            const code = result.error?.code ?? "";
            if (code.includes("registration-token-not-registered") ||
                code.includes("invalid-registration-token") ||
                code.includes("invalid-argument")) {
                stale.push(tokensSnap.docs[index].id);
            }
        }
    });
    await Promise.all(stale.map((id) => db().doc(`users/${uid}/fcmTokens/${id}`).delete()));
}
async function markNotificationsRead(uid, notificationIds) {
    const col = db().collection(`users/${uid}/notifications`);
    const stateRef = db().doc(`users/${uid}/notificationState/default`);
    if (notificationIds === "all") {
        const unread = await col.where("read", "==", false).limit(100).get();
        const batch = db().batch();
        let forumDelta = 0;
        for (const doc of unread.docs) {
            batch.update(doc.ref, { read: true });
            if (FORUM_TYPES.has(doc.data().type))
                forumDelta += 1;
        }
        batch.set(stateRef, {
            unreadCount: 0,
            unreadForumCount: firestore_1.FieldValue.increment(-forumDelta),
            openGroups: {},
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        await batch.commit();
        const state = await stateRef.get();
        if (Number(state.data()?.unreadForumCount ?? 0) < 0) {
            await stateRef.set({ unreadForumCount: 0 }, { merge: true });
        }
        return { ok: true };
    }
    const ids = notificationIds.slice(0, 50);
    if (!ids.length)
        return { ok: true };
    await db().runTransaction(async (tx) => {
        const snaps = await Promise.all(ids.map((id) => tx.get(col.doc(id))));
        const stateSnap = await tx.get(stateRef);
        let unreadDelta = 0;
        let forumDelta = 0;
        const clearKeys = [];
        for (const snap of snaps) {
            if (!snap.exists || snap.data()?.read === true)
                continue;
            unreadDelta += 1;
            if (FORUM_TYPES.has(snap.data()?.type)) {
                forumDelta += 1;
            }
            const gk = snap.data()?.groupKey;
            if (typeof gk === "string" && gk)
                clearKeys.push(gk);
        }
        if (unreadDelta === 0)
            return;
        for (const snap of snaps) {
            if (!snap.exists || snap.data()?.read === true)
                continue;
            tx.update(snap.ref, { read: true });
        }
        const openGroups = {
            ...(stateSnap.data()?.openGroups ?? {}),
        };
        for (const key of clearKeys) {
            if (openGroups[key] && ids.includes(openGroups[key])) {
                delete openGroups[key];
            }
        }
        const nextUnread = Math.max(0, Number(stateSnap.data()?.unreadCount ?? 0) - unreadDelta);
        const nextForum = Math.max(0, Number(stateSnap.data()?.unreadForumCount ?? 0) - forumDelta);
        tx.set(stateRef, {
            unreadCount: nextUnread,
            unreadForumCount: nextForum,
            openGroups,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    return { ok: true };
}
async function ensureThreadParticipant(threadId, uid) {
    if (!threadId || !uid)
        return;
    await db().doc(`threads/${threadId}/participants/${uid}`).set({ uid, joinedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
}
async function listThreadNotifyTargets(threadId, excludeUid) {
    const thread = await db().doc(`threads/${threadId}`).get();
    const authorId = String(thread.data()?.authorId ?? "");
    const parts = await db()
        .collection(`threads/${threadId}/participants`)
        .limit(50)
        .get();
    const set = new Set();
    if (authorId && authorId !== excludeUid)
        set.add(authorId);
    for (const doc of parts.docs) {
        if (doc.id !== excludeUid)
            set.add(doc.id);
    }
    return [...set];
}
//# sourceMappingURL=notifications.js.map