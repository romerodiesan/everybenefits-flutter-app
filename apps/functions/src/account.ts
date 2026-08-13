import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { admin, db, rtdb, callableOpts, storageBucket } from "./init";
import { ACCOUNT_DELETION_GRACE_DAYS } from "./constants";
import { requireCaller } from "./auth";

async function clearFcmTokens(uid: string): Promise<void> {
  const tokens = await db.collection(`users/${uid}/fcmTokens`).limit(50).get();
  await Promise.all(tokens.docs.map((doc) => doc.ref.delete()));
}

/** Sequential anonimo1 / anonimo2 / … labels, allocated transactionally. */
async function nextAnonymousLabel(): Promise<string> {
  const ref = db.doc("system/anonCounter");
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = Number(snap.data()?.count ?? 0) + 1;
    tx.set(ref, { count }, { merge: true });
    return `anonimo${count}`;
  });
}

/** Rewrites author identity on the user's forum threads and replies. */
async function renameForumContent(
  uid: string,
  authorName: string,
  authorPhotoUrl: string | null,
): Promise<void> {
  const [threads, replies] = await Promise.all([
    db.collection("threads").where("authorId", "==", uid).limit(500).get(),
    db.collectionGroup("replies").where("authorId", "==", uid).limit(500).get(),
  ]);
  const docs = [...threads.docs, ...replies.docs];
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    for (const doc of docs.slice(i, i + 400)) {
      batch.update(doc.ref, { authorName, authorPhotoUrl });
    }
    await batch.commit();
  }
}

/** Rewrites the user's display name inside their RTDB chats. */
async function renameChatMemberships(
  uid: string,
  name: string,
): Promise<void> {
  const index = await rtdb.ref(`userChats/${uid}`).get();
  const chatIds = Object.keys((index.val() ?? {}) as Record<string, unknown>);
  const updates: Record<string, unknown> = {};
  for (const chatId of chatIds.slice(0, 200)) {
    updates[`chats/${chatId}/memberNames/${uid}`] = name;
  }
  if (Object.keys(updates).length) await rtdb.ref().update(updates);
}

export const deactivateAccount = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "deactivateAccount", {
    allowInactive: true,
  });
  const userRef = db.doc(`users/${uid}`);
  const snap = await userRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "User not found.");
  if (snap.data()?.accountStatus === "pendingDeletion") {
    throw new HttpsError("failed-precondition", "Deletion already requested.");
  }
  await userRef.update({
    accountStatus: "deactivated",
    deactivatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await clearFcmTokens(uid);
  return { ok: true };
});

export const reactivateAccount = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "reactivateAccount", {
    allowInactive: true,
  });
  const userRef = db.doc(`users/${uid}`);
  const snap = await userRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "User not found.");
  if (snap.data()?.accountStatus !== "deactivated") {
    throw new HttpsError("failed-precondition", "Account is not deactivated.");
  }
  await userRef.update({
    accountStatus: "active",
    deactivatedAt: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

export const requestAccountDeletion = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "requestAccountDeletion", {
    allowInactive: true,
  });
  const userRef = db.doc(`users/${uid}`);
  const snap = await userRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "User not found.");
  const data = snap.data() ?? {};
  if (data.accountStatus === "pendingDeletion") {
    throw new HttpsError("failed-precondition", "Deletion already requested.");
  }

  const label = await nextAnonymousLabel();
  const scheduledMs =
    Date.now() + ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;

  await userRef.update({
    accountStatus: "pendingDeletion",
    deletionRequestedAt: FieldValue.serverTimestamp(),
    deletionScheduledAt: Timestamp.fromMillis(scheduledMs),
    anonymousLabel: label,
    deletionSnapshot: {
      displayName: typeof data.displayName === "string" ? data.displayName : null,
      photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
    },
    displayName: label,
    photoUrl: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await renameForumContent(uid, label, null);
  await renameChatMemberships(uid, label);
  await clearFcmTokens(uid);

  return { deletionScheduledAt: scheduledMs };
});

export const cancelAccountDeletion = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "cancelAccountDeletion", {
    allowInactive: true,
  });
  const userRef = db.doc(`users/${uid}`);
  const snap = await userRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "User not found.");
  const data = snap.data() ?? {};
  if (data.accountStatus !== "pendingDeletion") {
    throw new HttpsError("failed-precondition", "No pending deletion.");
  }

  const snapshot = (data.deletionSnapshot ?? {}) as Record<string, unknown>;
  const displayName =
    typeof snapshot.displayName === "string" ? snapshot.displayName : null;
  const photoUrl =
    typeof snapshot.photoUrl === "string" ? snapshot.photoUrl : null;

  await userRef.update({
    accountStatus: "active",
    deletionRequestedAt: FieldValue.delete(),
    deletionScheduledAt: FieldValue.delete(),
    anonymousLabel: FieldValue.delete(),
    deletionSnapshot: FieldValue.delete(),
    displayName,
    photoUrl,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await renameForumContent(uid, displayName ?? "Usuario", photoUrl);
  await renameChatMemberships(uid, displayName ?? "Usuario");

  return { ok: true };
});

/**
 * Daily purge of accounts whose 90-day grace period expired. Removes personal
 * data (profile + subcollections, avatar, chat index, Auth user); forum and
 * chat content stays under the anonymous label assigned at request time.
 */
export const purgeDeletedAccounts = onSchedule("every 24 hours", async () => {
  const pending = await db
    .collection("users")
    .where("accountStatus", "==", "pendingDeletion")
    .limit(100)
    .get();
  const now = Date.now();
  const due = pending.docs.filter((doc) => {
    const scheduled = doc.data().deletionScheduledAt;
    const ms =
      scheduled instanceof Timestamp
        ? scheduled.toMillis()
        : Number(scheduled ?? Number.POSITIVE_INFINITY);
    return ms <= now;
  });

  for (const doc of due.slice(0, 20)) {
    const uid = doc.id;
    await db.recursiveDelete(doc.ref);
    await rtdb.ref(`userChats/${uid}`).remove().catch(() => undefined);
    await storageBucket()
      .file(`avatars/${uid}.jpg`)
      .delete()
      .catch(() => undefined);
    await admin.auth().deleteUser(uid).catch(() => undefined);
  }
});
