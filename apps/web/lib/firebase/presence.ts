import {
  onDisconnect,
  onValue,
  ref,
  remove,
  set,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/database";
import { getFirebaseRtdb } from "./client";

/** Mark this uid online and clear on disconnect / tab close. */
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

export function watchOnlineCount(
  onChange: (count: number) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) {
    onChange(0);
    return () => undefined;
  }
  return onValue(
    ref(getFirebaseRtdb(), "presence"),
    (snap) => {
      const val = snap.val();
      if (!val || typeof val !== "object") {
        onChange(0);
        return;
      }
      onChange(Object.keys(val as Record<string, unknown>).length);
    },
    (error) => onError?.(error),
  );
}
