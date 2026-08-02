import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { aiConfig, USAGE_SUBCOLLECTION } from "./config";
import { adminDb } from "./firebase-admin";
import { PulseHttpError } from "./auth";

function dayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function minuteKey(now: Date): string {
  return now.toISOString().slice(0, 16);
}

/**
 * Per-user quota, enforced in one transaction so parallel tabs cannot race
 * past the limit. Counters live under the user document and are read by the
 * owner only, so a member can see their own remaining allowance.
 */
export async function consumeQuota(uid: string): Promise<{ remainingToday: number }> {
  const now = new Date();
  const ref = adminDb()
    .collection("users")
    .doc(uid)
    .collection(USAGE_SUBCOLLECTION)
    .doc(dayKey(now));

  return adminDb().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const data = snapshot.data() ?? {};
    const used = Number(data.messages ?? 0);
    const currentMinute = minuteKey(now);
    const minuteUsed =
      data.minute === currentMinute ? Number(data.minuteMessages ?? 0) : 0;

    if (used >= aiConfig.dailyMessageLimit) {
      throw new PulseHttpError(
        429,
        "daily-limit",
        "You have reached today's Pulse AI limit. It resets at midnight UTC.",
      );
    }
    if (minuteUsed >= aiConfig.perMinuteMessageLimit) {
      throw new PulseHttpError(
        429,
        "rate-limit",
        "Too many messages at once. Wait a moment and try again.",
      );
    }

    tx.set(
      ref,
      {
        messages: used + 1,
        minute: currentMinute,
        minuteMessages: minuteUsed + 1,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { remainingToday: aiConfig.dailyMessageLimit - used - 1 };
  });
}
