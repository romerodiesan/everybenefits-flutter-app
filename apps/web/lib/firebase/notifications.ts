import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from "firebase/messaging";
import { getFirebaseApp, getFirebaseDb } from "./client";
import {
  callCloudFunction,
  FunctionsUnavailableError,
} from "./call-function";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string;
  deepLink: string;
  ref: Record<string, string>;
  read: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  groupKey: string | null;
  count: number;
  actors: string[];
};

export type NotificationChannelFilter =
  | "all"
  | "chats"
  | "forums"
  | "academy";

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

export type NotificationState = {
  unreadCount: number;
  unreadForumCount: number;
  lastFeedSeenAt: Date | null;
  prefs: NotificationPrefs;
};

export const DEFAULT_PREFS: NotificationPrefs = {
  pushChats: true,
  pushForums: true,
  pushAcademy: true,
  pushForumVotes: true,
  pushForumReplies: true,
  pushForumNewThreads: true,
  inAppChats: true,
  inAppForums: true,
  inAppAcademy: true,
  emailChats: false,
  emailForumReplies: false,
  emailForumVotes: false,
  emailForumNewThreads: false,
  emailAcademy: false,
  emailProductUpdates: false,
};

export function channelForType(type: string): NotificationChannelFilter {
  if (type === "chat_message") return "chats";
  if (type.startsWith("forum_")) return "forums";
  if (type === "course_published") return "academy";
  return "all";
}

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function stateFrom(
  data: Record<string, unknown> | undefined,
): NotificationState {
  const prefsRaw = (data?.prefs ?? {}) as Record<string, unknown>;
  const pushForums = prefsRaw.pushForums !== false;
  return {
    unreadCount: Number(data?.unreadCount ?? 0),
    unreadForumCount: Number(data?.unreadForumCount ?? 0),
    lastFeedSeenAt: toDate(data?.lastFeedSeenAt),
    prefs: {
      pushChats: prefsRaw.pushChats !== false,
      pushForums,
      pushAcademy: prefsRaw.pushAcademy !== false,
      pushForumVotes: prefsRaw.pushForumVotes !== false && pushForums,
      pushForumReplies: prefsRaw.pushForumReplies !== false && pushForums,
      pushForumNewThreads: prefsRaw.pushForumNewThreads !== false && pushForums,
      inAppChats: prefsRaw.inAppChats !== false,
      inAppForums: prefsRaw.inAppForums !== false,
      inAppAcademy: prefsRaw.inAppAcademy !== false,
      emailChats: prefsRaw.emailChats === true,
      emailForumReplies: prefsRaw.emailForumReplies === true,
      emailForumVotes: prefsRaw.emailForumVotes === true,
      emailForumNewThreads: prefsRaw.emailForumNewThreads === true,
      emailAcademy: prefsRaw.emailAcademy === true,
      emailProductUpdates: prefsRaw.emailProductUpdates === true,
    },
  };
}

async function tokenDocId(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 40);
}

export function watchNotificationState(
  uid: string,
  onChange: (state: NotificationState) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), "users", uid, "notificationState", "default"),
    (snap) =>
      onChange(stateFrom(snap.data() as Record<string, unknown> | undefined)),
    (error) => onError?.(error),
  );
}

export function watchNotifications(
  uid: string,
  onChange: (items: AppNotification[]) => void,
  onError?: (error: Error) => void,
  max = 50,
): Unsubscribe {
  const q = query(
    collection(getFirebaseDb(), "users", uid, "notifications"),
    orderBy("createdAt", "desc"),
    limit(max),
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const actors = Array.isArray(data.actors)
            ? data.actors.map(String)
            : [];
          return {
            id: d.id,
            type: String(data.type ?? ""),
            title: String(data.title ?? ""),
            body: String(data.body ?? ""),
            href: String(data.href ?? "/notifications"),
            deepLink: String(data.deepLink ?? ""),
            ref: (data.ref as Record<string, string>) ?? {},
            read: data.read === true,
            createdAt: toDate(data.updatedAt) ?? toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
            groupKey:
              typeof data.groupKey === "string" ? data.groupKey : null,
            count: Math.max(1, Number(data.count ?? 1)),
            actors,
          };
        }),
      );
    },
    (error) => onError?.(error),
  );
}

export async function markNotificationRead(
  uid: string,
  notification: Pick<AppNotification, "id" | "type" | "read">,
) {
  if (notification.read) return;
  // Prefer the callable (keeps counters authoritative), but fall back to a
  // direct owner write so the inbox stays usable without Functions.
  try {
    await callCloudFunction("markNotificationRead", {
      notificationId: notification.id,
    });
    return;
  } catch (error) {
    if (!(error instanceof FunctionsUnavailableError)) {
      // App Check / auth issues: still try the local path below.
    }
  }

  const db = getFirebaseDb();
  const notifRef = doc(db, "users", uid, "notifications", notification.id);
  const stateRef = doc(db, "users", uid, "notificationState", "default");
  const stateSnap = await getDoc(stateRef);
  const unread = Math.max(0, Number(stateSnap.data()?.unreadCount ?? 1) - 1);
  const forumUnread = Math.max(
    0,
    Number(stateSnap.data()?.unreadForumCount ?? 0) -
      (notification.type.startsWith("forum_") ? 1 : 0),
  );
  await updateDoc(notifRef, { read: true });
  await setDoc(
    stateRef,
    {
      unreadCount: unread,
      unreadForumCount: forumUnread,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function markAllNotificationsRead(uid: string) {
  try {
    await callCloudFunction("markAllNotificationsRead", {});
    return;
  } catch {
    // Fall through to client batch when Functions are down.
  }

  const db = getFirebaseDb();
  const snap = await getDocs(
    query(
      collection(db, "users", uid, "notifications"),
      where("read", "==", false),
      limit(100),
    ),
  );
  if (snap.empty) return;
  const batch = writeBatch(db);
  for (const item of snap.docs) batch.update(item.ref, { read: true });
  batch.set(
    doc(db, "users", uid, "notificationState", "default"),
    {
      unreadCount: 0,
      unreadForumCount: 0,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();
}

export async function saveNotificationPrefs(
  uid: string,
  prefs: NotificationPrefs,
) {
  await setDoc(
    doc(getFirebaseDb(), "users", uid, "notificationState", "default"),
    { prefs, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function markFeedSeen(uid: string) {
  await setDoc(
    doc(getFirebaseDb(), "users", uid, "notificationState", "default"),
    { lastFeedSeenAt: serverTimestamp(), updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/** New forum threads since lastFeedSeenAt (capped). */
export async function countNewFeedThreads(
  lastFeedSeenAt: Date | null,
): Promise<number> {
  try {
    const q = lastFeedSeenAt
      ? query(
          collection(getFirebaseDb(), "threads"),
          where("createdAt", ">", Timestamp.fromDate(lastFeedSeenAt)),
        )
      : query(collection(getFirebaseDb(), "threads"));
    const snap = await getCountFromServer(q);
    return Math.min(99, snap.data().count);
  } catch {
    return 0;
  }
}

let messaging: Messaging | null = null;

async function getWebMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (!(await isSupported())) return null;
  if (!messaging) messaging = getMessaging(getFirebaseApp());
  return messaging;
}

const WEB_PUSH_TOKEN_KEY = "pulse_web_fcm_token";

export async function registerWebPushToken(
  uid: string,
): Promise<string | null> {
  // FCM registration hits production Google APIs — skip while Auth/Firestore
  // are on emulators to avoid noisy 401s with emulator ID tokens.
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") return null;
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  if (!vapidKey || !uid) return null;
  const msg = await getWebMessaging();
  if (!msg) return null;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
  );
  const token = await getToken(msg, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) return null;
  const id = await tokenDocId(token);
  await setDoc(
    doc(getFirebaseDb(), "users", uid, "fcmTokens", id),
    {
      token,
      platform: "web",
      updatedAt: serverTimestamp(),
      userAgent: navigator.userAgent.slice(0, 200),
    },
    { merge: true },
  );
  try {
    sessionStorage.setItem(WEB_PUSH_TOKEN_KEY, token);
  } catch {
    // ignore quota / private mode
  }
  return token;
}

export async function clearWebPushToken(uid: string, token: string | null) {
  if (!uid || !token) return;
  const id = await tokenDocId(token);
  await deleteDoc(
    doc(getFirebaseDb(), "users", uid, "fcmTokens", id),
  ).catch(() => undefined);
}

/** Clear the last registered web push token for this browser session. */
export async function clearStoredWebPushToken(uid: string) {
  if (!uid || typeof window === "undefined") return;
  let token: string | null = null;
  try {
    token = sessionStorage.getItem(WEB_PUSH_TOKEN_KEY);
  } catch {
    token = null;
  }
  await clearWebPushToken(uid, token);
  try {
    sessionStorage.removeItem(WEB_PUSH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export async function listenForegroundMessages(
  onPayload: (title: string, body: string) => void,
): Promise<(() => void) | null> {
  const msg = await getWebMessaging();
  if (!msg) return null;
  return onMessage(msg, (payload) => {
    const title = payload.notification?.title ?? "Pulse";
    const body = payload.notification?.body ?? "";
    onPayload(title, body);
  });
}
