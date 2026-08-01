import {
  onDisconnect,
  onValue,
  ref,
  remove,
  set,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/database";
import { getFirebaseRtdb } from "@pulse/firebase-client";

/**
 * Mark this uid online. onlineCount is maintained server-side by
 * onPresenceWritten — clients must not write presenceStats.
 */
export async function startPresence(uid: string): Promise<() => void> {
  if (!uid || !process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) {
    return () => undefined;
  }
  const db = getFirebaseRtdb();
  const statusRef = ref(db, `presence/${uid}`);

  await set(statusRef, {
    online: true,
    at: serverTimestamp(),
  });
  await onDisconnect(statusRef).remove();

  return () => {
    void remove(statusRef);
  };
}

/** Watch the denormalized online counter (O(1) node). */
export function watchOnlineCount(
  onChange: (count: number) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) {
    onChange(0);
    return () => undefined;
  }
  return onValue(
    ref(getFirebaseRtdb(), "presenceStats/onlineCount"),
    (snap) => {
      onChange(Math.max(0, Number(snap.val() ?? 0)));
    },
    (error) => onError?.(error),
  );
}
