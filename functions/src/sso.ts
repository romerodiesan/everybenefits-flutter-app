import { randomBytes } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { admin, db, callableOpts } from "./init";
import { consumeFunctionQuota, requireCaller } from "./auth";

/**
 * Cross-app SSO for Pulse ↔ Studio (different origins / ports).
 *
 * Preferred: createSsoHandoff (authenticated) → opaque code → exchangeSsoToken({ code }).
 * Direct idToken exchange is rejected to avoid JWT-in-URL style misuse of this API.
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

  await consumeFunctionQuota(uid, "exchangeSsoToken");
  const customToken = await admin.auth().createCustomToken(uid, { sso: true });
  void ref.delete().catch(() => undefined);
  return { customToken, uid };
});
