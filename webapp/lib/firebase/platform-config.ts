import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "./client";

export const PULSE_AI_CONFIG_PATH = "platformConfig/pulseAi";

export type PulseAiConfig = {
  enabled: boolean;
  updatedAt: unknown;
  updatedBy: string | null;
};

/** Missing doc ⇒ disabled until an admin enables Pulse AI. */
export function parsePulseAiEnabled(data: Record<string, unknown> | undefined): boolean {
  if (!data || typeof data.enabled !== "boolean") return false;
  return data.enabled;
}

export async function getPulseAiEnabled(): Promise<boolean> {
  const snap = await getDoc(doc(getFirebaseDb(), "platformConfig", "pulseAi"));
  return parsePulseAiEnabled(snap.data() as Record<string, unknown> | undefined);
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
      // Fail closed in the UI — server also enforces when disabled.
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
