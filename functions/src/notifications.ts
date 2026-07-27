import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { createHash } from "node:crypto";

/** Lazy — module may load before index.ts calls initializeApp(). */
function db() {
  return admin.firestore();
}

export type NotificationType =
  | "chat_message"
  | "forum_reply"
  | "forum_vote"
  | "forum_new_thread"
  | "course_published"
  | "support_message";

export type NotificationChannel = "chats" | "forums" | "academy" | "support";

export type NotifyPayload = {
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  deepLink: string;
  ref?: Record<string, string>;
  /** Skip push; still write inbox doc. */
  silent?: boolean;
};

const TYPE_CHANNEL: Record<NotificationType, NotificationChannel> = {
  chat_message: "chats",
  forum_reply: "forums",
  forum_vote: "forums",
  forum_new_thread: "forums",
  course_published: "academy",
  support_message: "support",
};

const PREF_KEY: Record<NotificationChannel, string> = {
  chats: "pushChats",
  forums: "pushForums",
  academy: "pushAcademy",
  support: "pushSupport",
};

const FORUM_TYPES = new Set<NotificationType>([
  "forum_reply",
  "forum_vote",
  "forum_new_thread",
]);

const CHAT_DEBOUNCE_MS = 60_000;

export function tokenDocId(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 40);
}

async function readPrefs(uid: string): Promise<Record<string, boolean>> {
  const snap = await db().doc(`users/${uid}/notificationState/default`).get();
  const prefs = (snap.data()?.prefs ?? {}) as Record<string, unknown>;
  return {
    pushChats: prefs.pushChats !== false,
    pushForums: prefs.pushForums !== false,
    pushAcademy: prefs.pushAcademy !== false,
    pushSupport: prefs.pushSupport !== false,
  };
}

async function shouldDebounceChat(uid: string, chatId: string): Promise<boolean> {
  const ref = db().doc(`notificationDebounce/${uid}_${chatId}`);
  const now = Date.now();
  const snap = await ref.get();
  const last = Number(snap.data()?.lastSentAt ?? 0);
  if (now - last < CHAT_DEBOUNCE_MS) return true;
  await ref.set({ lastSentAt: now, uid, chatId }, { merge: true });
  return false;
}

export async function notifyUser(
  uid: string,
  payload: NotifyPayload,
  options?: { chatIdForDebounce?: string },
): Promise<void> {
  if (!uid || uid === "support-ai") return;

  if (
    payload.type === "chat_message" &&
    options?.chatIdForDebounce &&
    (await shouldDebounceChat(uid, options.chatIdForDebounce))
  ) {
    return;
  }

  const channel = TYPE_CHANNEL[payload.type];
  const prefs = await readPrefs(uid);
  const pushAllowed = prefs[PREF_KEY[channel]] !== false && !payload.silent;

  const notifRef = db().collection(`users/${uid}/notifications`).doc();
  const stateRef = db().doc(`users/${uid}/notificationState/default`);
  const isForum = FORUM_TYPES.has(payload.type);

  await db().runTransaction(async (tx) => {
    const stateSnap = await tx.get(stateRef);
    const unread = Number(stateSnap.data()?.unreadCount ?? 0);
    const forumUnread = Number(stateSnap.data()?.unreadForumCount ?? 0);
    tx.set(notifRef, {
      type: payload.type,
      title: payload.title.slice(0, 120),
      body: payload.body.slice(0, 500),
      href: payload.href.slice(0, 400),
      deepLink: payload.deepLink.slice(0, 400),
      ref: payload.ref ?? {},
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(
      stateRef,
      {
        unreadCount: unread + 1,
        unreadForumCount: isForum ? forumUnread + 1 : forumUnread,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  if (!pushAllowed) return;

  const tokensSnap = await db().collection(`users/${uid}/fcmTokens`).limit(20).get();
  if (tokensSnap.empty) return;

  const stateSnap = await stateRef.get();
  const badge = Number(stateSnap.data()?.unreadCount ?? 1);

  const response = await admin.messaging().sendEachForMulticast({
    tokens: tokensSnap.docs.map((doc) => String(doc.data().token)),
    notification: {
      title: payload.title.slice(0, 120),
      body: payload.body.slice(0, 200),
    },
    data: {
      type: payload.type,
      href: payload.href,
      deepLink: payload.deepLink,
      notificationId: notifRef.id,
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
        link: payload.href.startsWith("http")
          ? payload.href
          : undefined,
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
    stale.map((id) => db().doc(`users/${uid}/fcmTokens/${id}`).delete()),
  );
}

export async function markNotificationsRead(
  uid: string,
  notificationIds: string[] | "all",
): Promise<{ ok: true }> {
  const col = db().collection(`users/${uid}/notifications`);
  const stateRef = db().doc(`users/${uid}/notificationState/default`);

  if (notificationIds === "all") {
    const unread = await col.where("read", "==", false).limit(100).get();
    const batch = db().batch();
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
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await batch.commit();
    // Clamp forum counter non-negative in a follow-up if needed.
    const state = await stateRef.get();
    if (Number(state.data()?.unreadForumCount ?? 0) < 0) {
      await stateRef.set({ unreadForumCount: 0 }, { merge: true });
    }
    return { ok: true };
  }

  const ids = notificationIds.slice(0, 50);
  if (!ids.length) return { ok: true };

  await db().runTransaction(async (tx) => {
    // Firestore requires all reads before any writes.
    const snaps = await Promise.all(ids.map((id) => tx.get(col.doc(id))));
    const stateSnap = await tx.get(stateRef);

    let unreadDelta = 0;
    let forumDelta = 0;
    for (const snap of snaps) {
      if (!snap.exists || snap.data()?.read === true) continue;
      unreadDelta += 1;
      if (FORUM_TYPES.has(snap.data()?.type as NotificationType)) {
        forumDelta += 1;
      }
    }
    if (unreadDelta === 0) return;

    for (const snap of snaps) {
      if (!snap.exists || snap.data()?.read === true) continue;
      tx.update(snap.ref, { read: true });
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
  await db().doc(`threads/${threadId}/participants/${uid}`).set(
    { uid, joinedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

export async function listThreadNotifyTargets(
  threadId: string,
  excludeUid: string,
): Promise<string[]> {
  const thread = await db().doc(`threads/${threadId}`).get();
  const authorId = String(thread.data()?.authorId ?? "");
  const parts = await db()
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
