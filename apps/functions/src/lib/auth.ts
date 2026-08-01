import "./bootstrap";
import {
  FieldValue,
  Timestamp,
  getFirestore,
  type DocumentData,
} from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { isUserApproved, parseRole } from "@pulse/shared";

const db = getFirestore();

const MAX_FUNCTION_CALLS_PER_MINUTE = 30;

/** Gen2 callables need explicit CORS for browser (e.g. localhost webapp). */
export const usingFunctionsEmulator = process.env.FUNCTIONS_EMULATOR === "true";
/** Production: set FUNCTIONS_ENFORCE_APP_CHECK=true in .env.every-benefits-us once web App Check site keys are live. */
export const enforceAppCheck =
  !usingFunctionsEmulator &&
  process.env.FUNCTIONS_ENFORCE_APP_CHECK === "true";
export const callableOpts = {
  // Emulator Gen2 often drops Access-Control headers on preflight when cors is
  // an allow-list; open it fully locally. Production keeps an explicit list.
  cors: usingFunctionsEmulator
    ? true
    : [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "https://every-insurance.web.app",
        "https://every-insurance.firebaseapp.com",
        "https://pulse.everybenefits.us",
        "https://studio.everybenefits.us",
        "https://admin.everybenefits.us",
        "https://pulse-web-app--every-benefits-us.us-central1.hosted.app",
        "https://studio-web-app--every-benefits-us.us-central1.hosted.app",
        "https://admin-web-app--every-benefits-us.us-central1.hosted.app",
        ...(process.env.FUNCTIONS_ALLOWED_ORIGINS ?? "")
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean),
      ],
  // Emulator clients skip App Check. Production enforces when
  // FUNCTIONS_ENFORCE_APP_CHECK=true (see .env.every-benefits-us).
  enforceAppCheck,
  // Auth is enforced inside the handler; Cloud Run must allow the OPTIONS preflight.
  invoker: "public" as const,
};

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

export async function requireActiveAccount(
  uid: string,
): Promise<DocumentData | undefined> {
  const snap = await db.doc(`users/${uid}`).get();
  const data = snap.data();
  const status = String(data?.accountStatus ?? "active");
  if (status === "deactivated" || status === "pendingDeletion") {
    throw new HttpsError(
      "failed-precondition",
      "Account is deactivated or pending deletion.",
    );
  }
  return data;
}

/** Community surfaces require an approved (or legacy unset) profile. */
export async function requireApprovedMember(uid: string): Promise<DocumentData> {
  const data = await requireActiveAccount(uid);
  if (!data || data.isAnonymous === true || parseRole(data.role) === "guest") {
    throw new HttpsError("permission-denied", "Registered members only.");
  }
  if (!isUserApproved(data.approvalStatus)) {
    throw new HttpsError(
      "permission-denied",
      "Account is pending approval.",
    );
  }
  return data;
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
