import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import { admin, db } from "./init";

export type NotificationType =
  | "chat_message"
  | "contact_request"
  | "forum_reply"
  | "forum_vote"
  | "forum_new_thread"
  | "course_published";

export type NotificationChannel = "chats" | "forums" | "academy";

export type NotifyPayload = {
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  deepLink: string;
  ref?: Record<string, string>;
  /** Skip push; still write inbox doc. */
  silent?: boolean;
  /** Actor who caused the event (for aggregation copy). */
  actorId?: string;
  actorName?: string;
};

const TYPE_CHANNEL: Record<NotificationType, NotificationChannel> = {
  chat_message: "chats",
  contact_request: "chats",
  forum_reply: "forums",
  forum_vote: "forums",
  forum_new_thread: "forums",
  course_published: "academy",
};

const FORUM_TYPES = new Set<NotificationType>([
  "forum_reply",
  "forum_vote",
  "forum_new_thread",
]);

const ACTOR_CAP = 3;
const PUSH_DEBOUNCE_MS = 60_000;

export type NotificationPrefs = {
  pushChats: boolean;
  pushForums: boolean;
  pushAcademy: boolean;
  pushForumVotes: boolean;
  pushForumReplies: boolean;
  pushForumNewThreads: boolean;
  inAppChats: boolean;
  inAppForums: boolean;
  inAppAcademy: boolean;
  emailChats: boolean;
  emailForumReplies: boolean;
  emailForumVotes: boolean;
  emailForumNewThreads: boolean;
  emailAcademy: boolean;
  emailProductUpdates: boolean;
};

export function tokenDocId(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 40);
}

export function readPrefsFromData(
  prefs: Record<string, unknown> | undefined,
): NotificationPrefs {
  const p = prefs ?? {};
  const pushForums = p.pushForums !== false;
  return {
    pushChats: p.pushChats !== false,
    pushForums,
    pushAcademy: p.pushAcademy !== false,
    pushForumVotes: p.pushForumVotes !== false && pushForums,
    pushForumReplies: p.pushForumReplies !== false && pushForums,
    pushForumNewThreads: p.pushForumNewThreads !== false && pushForums,
    inAppChats: p.inAppChats !== false,
    inAppForums: p.inAppForums !== false,
    inAppAcademy: p.inAppAcademy !== false,
    // Email defaults off.
    emailChats: p.emailChats === true,
    emailForumReplies: p.emailForumReplies === true,
    emailForumVotes: p.emailForumVotes === true,
    emailForumNewThreads: p.emailForumNewThreads === true,
    emailAcademy: p.emailAcademy === true,
    emailProductUpdates: p.emailProductUpdates === true,
  };
}

async function readPrefs(uid: string): Promise<NotificationPrefs> {
  const snap = await db.doc(`users/${uid}/notificationState/default`).get();
  return readPrefsFromData(
    (snap.data()?.prefs ?? {}) as Record<string, unknown>,
  );
}

function channelAllowsInApp(
  prefs: NotificationPrefs,
  channel: NotificationChannel,
): boolean {
  switch (channel) {
    case "chats":
      return prefs.inAppChats;
    case "forums":
      return prefs.inAppForums;
    case "academy":
      return prefs.inAppAcademy;
  }
}

function channelAllowsPush(
  prefs: NotificationPrefs,
  type: NotificationType,
): boolean {
  const channel = TYPE_CHANNEL[type];
  if (type === "forum_vote") return prefs.pushForumVotes;
  if (type === "forum_reply") return prefs.pushForumReplies;
  if (type === "forum_new_thread") return prefs.pushForumNewThreads;
  switch (channel) {
    case "chats":
      return prefs.pushChats;
    case "forums":
      return prefs.pushForums;
    case "academy":
      return prefs.pushAcademy;
  }
}

function channelAllowsEmail(
  prefs: NotificationPrefs,
  type: NotificationType,
): boolean {
  if (type === "forum_vote") return prefs.emailForumVotes;
  if (type === "forum_reply") return prefs.emailForumReplies;
  if (type === "forum_new_thread") return prefs.emailForumNewThreads;
  switch (TYPE_CHANNEL[type]) {
    case "chats":
      return prefs.emailChats;
    case "forums":
      return prefs.emailForumReplies;
    case "academy":
      return prefs.emailAcademy;
  }
}

/** Deterministic group key while the notification stays unread. */
export function groupKeyFor(
  type: NotificationType,
  ref: Record<string, string>,
): string | null {
  if (type === "forum_vote") {
    const threadId = ref.threadId ?? "";
    const target = ref.replyId ? `reply:${ref.replyId}` : "thread";
    return threadId ? `forum_vote:${threadId}:${target}` : null;
  }
  if (type === "forum_reply") {
    return ref.threadId ? `forum_reply:${ref.threadId}` : null;
  }
  if (type === "chat_message") {
    return ref.chatId ? `${type}:${ref.chatId}` : null;
  }
  return null;
}

function formatActors(actors: string[], count: number): string {
  const names = actors.filter(Boolean).slice(0, ACTOR_CAP);
  if (!names.length) return count > 1 ? `${count} people` : "Someone";
  if (count <= 1 || names.length === 1) return names[0];
  if (count === 2 && names.length >= 2) return `${names[0]} and ${names[1]}`;
  const extra = Math.max(0, count - names.length);
  if (extra <= 0) {
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }
  return `${names.join(", ")} and ${extra} other${extra === 1 ? "" : "s"}`;
}

function aggregatedCopy(
  type: NotificationType,
  actors: string[],
  count: number,
  fallbackTitle: string,
  fallbackBody: string,
  preview?: string,
): { title: string; body: string } {
  const who = formatActors(actors, count);
  if (type === "forum_vote") {
    return {
      title: count > 1 ? `${count} upvotes` : "New upvote",
      body:
        count > 1
          ? `${who} upvoted your post`
          : `${who} upvoted your post`,
    };
  }
  if (type === "forum_reply") {
    return {
      title: count > 1 ? `${count} new replies` : "New reply",
      body:
        count > 1
          ? `${who} replied to a thread you follow`
          : `${who} replied to a thread you follow`,
    };
  }
  if (type === "chat_message") {
    return {
      title: count > 1 ? `Chat · ${count} messages` : "Chat",
      body: preview?.trim() || fallbackBody || "You have a new message",
    };
  }
  return { title: fallbackTitle, body: fallbackBody };
}

async function shouldDebouncePush(
  uid: string,
  groupKey: string,
): Promise<boolean> {
  const ref = db.doc(`notificationDebounce/${uid}_${groupKey.replace(/[/]/g, "_")}`);
  const now = Date.now();
  const snap = await ref.get();
  const last = Number(snap.data()?.lastSentAt ?? 0);
  if (now - last < PUSH_DEBOUNCE_MS) return true;
  await ref.set({ lastSentAt: now, uid, groupKey }, { merge: true });
  return false;
}

export async function notifyUser(
  uid: string,
  payload: NotifyPayload,
  options?: { chatIdForDebounce?: string },
): Promise<void> {
  if (!uid) return;

  const channel = TYPE_CHANNEL[payload.type];
  const prefs = await readPrefs(uid);
  if (!channelAllowsInApp(prefs, channel)) return;

  const ref = payload.ref ?? {};
  const groupKey =
    groupKeyFor(payload.type, ref) ??
    (options?.chatIdForDebounce
      ? groupKeyFor(payload.type, { chatId: options.chatIdForDebounce })
      : null);

  const actorName = (payload.actorName ?? "").trim().slice(0, 60);
  const actorId = (payload.actorId ?? "").trim();
  const col = db.collection(`users/${uid}/notifications`);
  const stateRef = db.doc(`users/${uid}/notificationState/default`);
  const isForum = FORUM_TYPES.has(payload.type);

  let notifId = "";
  let isNew = true;
  let pushTitle = payload.title;
  let pushBody = payload.body;

  await db.runTransaction(async (tx) => {
    const stateSnap = await tx.get(stateRef);
    const stateData = stateSnap.data() ?? {};
    const unread = Number(stateData.unreadCount ?? 0);
    const forumUnread = Number(stateData.unreadForumCount ?? 0);
    const openGroups = {
      ...((stateData.openGroups ?? {}) as Record<string, string>),
    };

    let existingRef: DocumentReference | null = null;
    if (groupKey && openGroups[groupKey]) {
      existingRef = col.doc(openGroups[groupKey]);
    }
    const existingSnap = existingRef ? await tx.get(existingRef) : null;

    if (
      existingSnap?.exists &&
      existingSnap.data()?.read !== true &&
      existingSnap.data()?.groupKey === groupKey
    ) {
      isNew = false;
      notifId = existingSnap.id;
      const data = existingSnap.data()!;
      const prevActors = Array.isArray(data.actors)
        ? (data.actors as unknown[]).map(String)
        : [];
      const actors = [...prevActors];
      if (actorName && !actors.includes(actorName)) {
        actors.unshift(actorName);
      }
      const trimmedActors = actors.slice(0, ACTOR_CAP);
      const count = Number(data.count ?? 1) + 1;
      const copy = aggregatedCopy(
        payload.type,
        trimmedActors,
        count,
        payload.title,
        payload.body,
        payload.body,
      );
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
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    const notifRef = col.doc();
    notifId = notifRef.id;
    const actors = actorName ? [actorName] : [];
    const copy = aggregatedCopy(
      payload.type,
      actors,
      1,
      payload.title,
      payload.body,
      payload.body,
    );
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
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const nextOpen = { ...openGroups };
    if (groupKey) nextOpen[groupKey] = notifId;

    tx.set(
      stateRef,
      {
        unreadCount: unread + 1,
        unreadForumCount: isForum ? forumUnread + 1 : forumUnread,
        openGroups: nextOpen,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  const pushAllowed =
    channelAllowsPush(prefs, payload.type) && !payload.silent;

  // Debounce noisy chat pushes (inbox already updated).
  const debounceKey =
    groupKey ??
    (options?.chatIdForDebounce
      ? `chat:${options.chatIdForDebounce}`
      : null);
  const shouldSkipPush =
    !pushAllowed ||
    (Boolean(debounceKey) &&
      payload.type === "chat_message" &&
      (await shouldDebouncePush(uid, debounceKey!)));

  if (!shouldSkipPush) {
    const tokensSnap = await db
      .collection(`users/${uid}/fcmTokens`)
      .limit(20)
      .get();
    if (!tokensSnap.empty) {
      const stateSnap = await stateRef.get();
      const badge = Number(stateSnap.data()?.unreadCount ?? 1);

      const response = await admin.messaging().sendEachForMulticast({
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

      const stale: string[] = [];
      response.responses.forEach((result, index) => {
        if (!result.success) {
          const code = result.error?.code ?? "";
          if (
            code.includes("registration-token-not-registered") ||
            code.includes("invalid-registration-token") ||
            code.includes("invalid-argument")
          ) {
            stale.push(tokensSnap.docs[index].id);
          }
        }
      });
      await Promise.all(
        stale.map((id) => db.doc(`users/${uid}/fcmTokens/${id}`).delete()),
      );
    }
  }

  if (channelAllowsEmail(prefs, payload.type) && !payload.silent) {
    await enqueueNotificationEmail(uid, {
      type: payload.type,
      title: pushTitle,
      body: pushBody,
      href: payload.href,
      notificationId: notifId,
    });
  }
}

async function enqueueNotificationEmail(
  uid: string,
  input: {
    type: NotificationType;
    title: string;
    body: string;
    href: string;
    notificationId: string;
  },
): Promise<void> {
  const userSnap = await db.doc(`users/${uid}`).get();
  const email =
    typeof userSnap.data()?.email === "string"
      ? String(userSnap.data()?.email).trim()
      : "";
  if (!email || !email.includes("@")) return;

  const id = `${uid}_${input.notificationId}`.slice(0, 120);
  await db.doc(`mailOutbox/${id}`).set(
    {
      uid,
      to: email,
      type: input.type,
      title: input.title.slice(0, 120),
      body: input.body.slice(0, 500),
      href: input.href.slice(0, 400),
      notificationId: input.notificationId,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function markNotificationsRead(
  uid: string,
  notificationIds: string[] | "all",
): Promise<{ ok: true }> {
  const col = db.collection(`users/${uid}/notifications`);
  const stateRef = db.doc(`users/${uid}/notificationState/default`);

  if (notificationIds === "all") {
    const unread = await col.where("read", "==", false).limit(100).get();
    const batch = db.batch();
    let forumDelta = 0;
    for (const doc of unread.docs) {
      batch.update(doc.ref, { read: true });
      if (FORUM_TYPES.has(doc.data().type as NotificationType)) forumDelta += 1;
    }
    batch.set(
      stateRef,
      {
        unreadCount: 0,
        unreadForumCount: FieldValue.increment(-forumDelta),
        openGroups: {},
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await batch.commit();
    const state = await stateRef.get();
    if (Number(state.data()?.unreadForumCount ?? 0) < 0) {
      await stateRef.set({ unreadForumCount: 0 }, { merge: true });
    }
    return { ok: true };
  }

  const ids = notificationIds.slice(0, 50);
  if (!ids.length) return { ok: true };

  await db.runTransaction(async (tx) => {
    const snaps = await Promise.all(ids.map((id) => tx.get(col.doc(id))));
    const stateSnap = await tx.get(stateRef);

    let unreadDelta = 0;
    let forumDelta = 0;
    const clearKeys: string[] = [];
    for (const snap of snaps) {
      if (!snap.exists || snap.data()?.read === true) continue;
      unreadDelta += 1;
      if (FORUM_TYPES.has(snap.data()?.type as NotificationType)) {
        forumDelta += 1;
      }
      const gk = snap.data()?.groupKey;
      if (typeof gk === "string" && gk) clearKeys.push(gk);
    }
    if (unreadDelta === 0) return;

    for (const snap of snaps) {
      if (!snap.exists || snap.data()?.read === true) continue;
      tx.update(snap.ref, { read: true });
    }

    const openGroups = {
      ...((stateSnap.data()?.openGroups ?? {}) as Record<string, string>),
    };
    for (const key of clearKeys) {
      if (openGroups[key] && ids.includes(openGroups[key])) {
        delete openGroups[key];
      }
    }

    const nextUnread = Math.max(
      0,
      Number(stateSnap.data()?.unreadCount ?? 0) - unreadDelta,
    );
    const nextForum = Math.max(
      0,
      Number(stateSnap.data()?.unreadForumCount ?? 0) - forumDelta,
    );
    tx.set(
      stateRef,
      {
        unreadCount: nextUnread,
        unreadForumCount: nextForum,
        openGroups,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  return { ok: true };
}

export async function ensureThreadParticipant(
  threadId: string,
  uid: string,
): Promise<void> {
  if (!threadId || !uid) return;
  const threadRef = db.doc(`threads/${threadId}`);
  const partRef = db.doc(`threads/${threadId}/participants/${uid}`);
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(partRef);
    if (existing.exists) return;
    const thread = await tx.get(threadRef);
    if (!thread.exists) return;
    tx.set(
      partRef,
      { uid, joinedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    tx.update(threadRef, {
      interactorCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function listThreadNotifyTargets(
  threadId: string,
  excludeUid: string,
): Promise<string[]> {
  const thread = await db.doc(`threads/${threadId}`).get();
  const authorId = String(thread.data()?.authorId ?? "");
  const parts = await db
    .collection(`threads/${threadId}/participants`)
    .limit(50)
    .get();
  const set = new Set<string>();
  if (authorId && authorId !== excludeUid) set.add(authorId);
  for (const doc of parts.docs) {
    if (doc.id !== excludeUid) set.add(doc.id);
  }
  return [...set];
}
