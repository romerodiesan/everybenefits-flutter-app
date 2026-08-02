import * as admin from "firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "./init";
import { MAX_FUNCTION_CALLS_PER_MINUTE } from "./constants";

export function headlineName(data: admin.firestore.DocumentData | undefined): string {
  const display =
    typeof data?.displayName === "string" ? data.displayName.trim() : "";
  if (display) return display;
  const email = typeof data?.email === "string" ? data.email.trim() : "";
  if (email) return email;
  return "Usuario";
}

export async function consumeFunctionQuota(uid: string, operation: string) {
  const minute = Math.floor(Date.now() / 60_000);
  const ref = db.doc(`functionUsage/${uid}_${minute}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = Number(snap.data()?.count ?? 0);
    if (count >= MAX_FUNCTION_CALLS_PER_MINUTE) {
      throw new HttpsError("resource-exhausted", "Too many requests.");
    }
    tx.set(
      ref,
      {
        uid,
        minute,
        count: count + 1,
        operations: FieldValue.arrayUnion(operation),
        expiresAt: Timestamp.fromMillis((minute + 2) * 60_000),
      },
      { merge: true },
    );
  });
}

export async function requireActiveAccount(uid: string): Promise<void> {
  const snap = await db.doc(`users/${uid}`).get();
  const status = String(snap.data()?.accountStatus ?? "active");
  if (status === "deactivated" || status === "pendingDeletion") {
    throw new HttpsError(
      "failed-precondition",
      "Account is deactivated or pending deletion.",
    );
  }
}

export async function requireCaller(
  request: { auth?: { uid: string } },
  operation: string,
  options?: { allowInactive?: boolean },
): Promise<string> {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  await consumeFunctionQuota(uid, operation);
  if (!options?.allowInactive) {
    await requireActiveAccount(uid);
  }
  return uid;
}

export function isUserApprovedForJoin(data: admin.firestore.DocumentData | undefined) {
  if (!data || data.isAnonymous === true) return false;
  const status = String(data.approvalStatus ?? "approved");
  return status === "approved";
}
