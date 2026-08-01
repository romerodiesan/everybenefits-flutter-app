import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@pulse/firebase-client";

export function parsePulseAiEnabled(
  data: Record<string, unknown> | undefined,
): boolean {
  if (!data || typeof data.enabled !== "boolean") return false;
  return data.enabled;
}

export function watchPulseAiEnabled(
  onNext: (enabled: boolean) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), "platformConfig", "pulseAi"),
    (snap) => {
      onNext(
        parsePulseAiEnabled(snap.data() as Record<string, unknown> | undefined),
      );
    },
    (error) => {
      onError?.(error);
      onNext(false);
    },
  );
}

export async function setPulseAiEnabled(
  enabled: boolean,
  adminUid: string,
): Promise<void> {
  await setDoc(
    doc(getFirebaseDb(), "platformConfig", "pulseAi"),
    {
      enabled,
      updatedAt: serverTimestamp(),
      updatedBy: adminUid,
    },
    { merge: true },
  );
}
