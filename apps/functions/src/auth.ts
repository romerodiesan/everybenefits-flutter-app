import { type DocumentData } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "./init";

export { consumeFunctionQuota, requireActor, requireCaller } from "./guards";

export function headlineName(data: DocumentData | undefined): string {
  const display =
    typeof data?.displayName === "string" ? data.displayName.trim() : "";
  if (display) return display;
  const email = typeof data?.email === "string" ? data.email.trim() : "";
  if (email) return email;
  return "Usuario";
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

export function isUserApprovedForJoin(data: DocumentData | undefined) {
  if (!data || data.isAnonymous === true) return false;
  const status = String(data.approvalStatus ?? "approved");
  return status === "approved";
}
