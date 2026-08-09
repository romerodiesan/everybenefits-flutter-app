import { createHash, randomBytes } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { admin, db, callableOpts } from "./init";
import { consumeFunctionQuota, requireCaller } from "./auth";

/**
 * Cross-app SSO for Pulse ↔ Studio ↔ Admin (different origins).
 *
 * Preferred client path is Next `/api/auth/*` via `@pulse/sso`.
 * These callables mirror the same Firestore protocol (60s TTL, single-use,
 * account gate, rate-limit before consume).
 */
export const createSsoHandoff = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "createSsoHandoff");
  const code = randomBytes(32).toString("base64url");
  const now = Date.now();
  await db.collection("ssoHandoffs").doc(code).set({
    uid,
    used: false,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromMillis(now + 60_000),
  });
  return { code };
});

export const exchangeSsoToken = onCall(callableOpts, async (request) => {
  const code = String(request.data?.code ?? "").trim();
  if (code.length < 32) {
    throw new HttpsError(
      "invalid-argument",
      "Opaque handoff code required. Use createSsoHandoff first.",
    );
  }

  // Rate-limit before consume so failed quota never burns the code.
  const codeKey = createHash("sha256").update(code).digest("hex").slice(0, 32);
  await consumeFunctionQuota(codeKey, "exchangeSsoToken");

  const ref = db.collection("ssoHandoffs").doc(code);
  const uid = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new HttpsError("unauthenticated", "Invalid or expired handoff.");
    }
    const data = snap.data() ?? {};
    if (data.used === true) {
      throw new HttpsError("unauthenticated", "Invalid or expired handoff.");
    }
    const expiresAt = data.expiresAt as Timestamp | undefined;
    if (!expiresAt || expiresAt.toMillis() < Date.now()) {
      tx.delete(ref);
      throw new HttpsError("unauthenticated", "Invalid or expired handoff.");
    }
    const handoffUid = String(data.uid ?? "");
    if (!handoffUid) {
      tx.delete(ref);
      throw new HttpsError("unauthenticated", "Invalid or expired handoff.");
    }
    tx.update(ref, {
      used: true,
      usedAt: FieldValue.serverTimestamp(),
    });
    return handoffUid;
  });

  const userSnap = await db.doc(`users/${uid}`).get();
  const status = String(userSnap.data()?.accountStatus ?? "active");
  if (status === "deactivated" || status === "pendingDeletion") {
    throw new HttpsError(
      "failed-precondition",
      "Account is deactivated or pending deletion.",
    );
  }

  await consumeFunctionQuota(uid, "exchangeSsoTokenUid");
  const customToken = await admin.auth().createCustomToken(uid, { sso: true });
  void ref.delete().catch(() => undefined);
  return { customToken, uid };
});
