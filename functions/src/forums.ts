import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { FORUM_ROLES, parseRole } from "@pulse/shared";
import { db, callableOpts } from "./init";
import type { VoteValue } from "./constants";
import { headlineName, requireCaller } from "./auth";
import {
  ensureThreadParticipant,
  listThreadNotifyTargets,
  notifyUser,
} from "./notifications";

export function parseVote(raw: unknown): VoteValue {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (n === -1 || n === 0 || n === 1) return n as VoteValue;
  throw new HttpsError("invalid-argument", "vote must be -1, 0, or 1");
}

/**
 * Trusted vote path: updates vote doc + score increment under Admin SDK.
 */
export const castForumVote = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "castForumVote");
  const threadId = String(request.data?.threadId ?? "");
  const replyId =
    request.data?.replyId == null ? null : String(request.data.replyId);
  const next = parseVote(request.data?.vote);

  if (!threadId) {
    throw new HttpsError("invalid-argument", "threadId required");
  }

  const userSnap = await db.doc(`users/${uid}`).get();
  const user = userSnap.data();
  if (!user || user.isAnonymous === true) {
    throw new HttpsError("permission-denied", "Forum participants only.");
  }
  if (!(FORUM_ROLES as readonly string[]).includes(String(user.role))) {
    throw new HttpsError("permission-denied", "Forum participants only.");
  }

  const targetRef = replyId
    ? db.doc(`threads/${threadId}/replies/${replyId}`)
    : db.doc(`threads/${threadId}`);
  const voteRef = replyId
    ? db.doc(`threads/${threadId}/replies/${replyId}/votes/${uid}`)
    : db.doc(`threads/${threadId}/votes/${uid}`);
  const inboxVoteRef = db.doc(
    `users/${uid}/forumVotes/${replyId ? `${threadId}_${replyId}` : threadId}`,
  );

  await db.runTransaction(async (tx) => {
    const target = await tx.get(targetRef);
    if (!target.exists) {
      throw new HttpsError("not-found", "Target not found.");
    }
    if (target.data()?.authorId === uid) {
      throw new HttpsError("failed-precondition", "Cannot vote on own content.");
    }

    const voteSnap = await tx.get(voteRef);
    const previous = (voteSnap.data()?.value as number | undefined) ?? 0;
    const delta = next - previous;
    if (delta === 0) return;

    if (next === 0) {
      tx.delete(voteRef);
      tx.delete(inboxVoteRef);
    } else {
      tx.set(
        voteRef,
        {
          value: next,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      tx.set(inboxVoteRef, {
        threadId,
        replyId,
        value: next,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    tx.update(targetRef, {
      score: FieldValue.increment(delta),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  // Notify content author on upvote (not clear / downvote). Never fail the
  // vote itself if the inbox/push side effect errors.
  if (next === 1) {
    try {
      const target = await (
        replyId
          ? db.doc(`threads/${threadId}/replies/${replyId}`)
          : db.doc(`threads/${threadId}`)
      ).get();
      const authorId = String(target.data()?.authorId ?? "");
      if (authorId && authorId !== uid) {
        const voterName = headlineName(user);
        await notifyUser(authorId, {
          type: "forum_vote",
          title: "New upvote",
          body: `${voterName} upvoted your ${replyId ? "reply" : "question"}`,
          href: `/home/${threadId}`,
          deepLink: `pulse://forums/${threadId}`,
          ref: { threadId, ...(replyId ? { replyId } : {}) },
          actorId: uid,
          actorName: voterName,
        });
      }
    } catch (error) {
      console.error("castForumVote notify failed", error);
    }
  }

  return { ok: true };
});

export const addForumReply = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "addForumReply");
  const threadId = String(request.data?.threadId ?? "");
  const body = String(request.data?.body ?? "").trim();
  if (!threadId || !body || body.length > 20_000) {
    throw new HttpsError("invalid-argument", "Valid reply required.");
  }
  const [user, thread] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.doc(`threads/${threadId}`).get(),
  ]);
  const profile = user.data();
  if (
    !thread.exists ||
    !profile ||
    profile.isAnonymous === true ||
    !(FORUM_ROLES as readonly string[]).includes(String(profile.role))
  ) {
    throw new HttpsError("permission-denied", "Forum participants only.");
  }
  const replyRef = db.collection(`threads/${threadId}/replies`).doc();
  const batch = db.batch();
  batch.set(replyRef, {
    body,
    authorId: uid,
    authorName: headlineName(profile),
    authorPhotoUrl:
      typeof profile.photoUrl === "string" ? profile.photoUrl : null,
    authorRole: String(profile.role),
    score: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.update(thread.ref, {
    replyCount: FieldValue.increment(1),
    lastReplyAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  await ensureThreadParticipant(threadId, uid);
  const authorId = String(thread.data()?.authorId ?? "");
  if (authorId && authorId !== uid) {
    await ensureThreadParticipant(threadId, authorId);
  }
  const targets = await listThreadNotifyTargets(threadId, uid);
  const actorName = headlineName(profile);
  await Promise.all(
    targets.map((targetUid) =>
      notifyUser(targetUid, {
        type: "forum_reply",
        title: "New reply",
        body: `${actorName}: ${body.slice(0, 100)}`,
        href: `/home/${threadId}`,
        deepLink: `pulse://forums/${threadId}`,
        ref: { threadId, replyId: replyRef.id },
        actorId: uid,
        actorName: actorName,
      }),
    ),
  );

  return { replyId: replyRef.id };
});

export const deleteForumReply = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "deleteForumReply");
  const threadId = String(request.data?.threadId ?? "");
  const replyId = String(request.data?.replyId ?? "");
  const threadRef = db.doc(`threads/${threadId}`);
  const replyRef = db.doc(`threads/${threadId}/replies/${replyId}`);
  const [actor, thread, reply] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    threadRef.get(),
    replyRef.get(),
  ]);
  if (!thread.exists || !reply.exists) {
    throw new HttpsError("not-found", "Reply not found.");
  }
  if (parseRole(actor.data()?.role) !== "admin" && reply.data()?.authorId !== uid) {
    throw new HttpsError("permission-denied", "Not allowed to delete this reply.");
  }
  const remaining = await db
    .collection(`threads/${threadId}/replies`)
    .orderBy("createdAt", "desc")
    .limit(2)
    .get();
  const latest = remaining.docs.find((doc) => doc.id !== replyId);
  const replyVotes = await replyRef.collection("votes").get();
  const batch = db.batch();
  for (const vote of replyVotes.docs) batch.delete(vote.ref);
  batch.delete(replyRef);
  batch.update(threadRef, {
    replyCount: FieldValue.increment(-1),
    lastReplyAt:
      latest?.get("createdAt") ?? thread.get("createdAt") ?? FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    ...(thread.get("acceptedReplyId") === replyId
      ? { acceptedReplyId: null }
      : {}),
  });
  await batch.commit();
  return { ok: true };
});

export const deleteForumThread = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "deleteForumThread");
  const threadId = String(request.data?.threadId ?? "");
  if (!threadId) {
    throw new HttpsError("invalid-argument", "threadId required");
  }
  const threadRef = db.doc(`threads/${threadId}`);
  const [actor, thread] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    threadRef.get(),
  ]);
  if (!thread.exists) {
    throw new HttpsError("not-found", "Thread not found.");
  }
  const isAdmin = parseRole(actor.data()?.role) === "admin";
  if (!isAdmin && thread.data()?.authorId !== uid) {
    throw new HttpsError("permission-denied", "Not allowed to delete this thread.");
  }

  const [repliesSnap, threadVotesSnap, participantsSnap] = await Promise.all([
    threadRef.collection("replies").get(),
    threadRef.collection("votes").get(),
    threadRef.collection("participants").get(),
  ]);

  // Firestore batches cap at 500 ops; chunk if a thread is unusually large.
  const refsToDelete: DocumentReference[] = [];
  for (const reply of repliesSnap.docs) {
    const voteSnap = await reply.ref.collection("votes").get();
    for (const vote of voteSnap.docs) refsToDelete.push(vote.ref);
    refsToDelete.push(reply.ref);
  }
  for (const vote of threadVotesSnap.docs) refsToDelete.push(vote.ref);
  for (const participant of participantsSnap.docs) {
    refsToDelete.push(participant.ref);
  }
  refsToDelete.push(threadRef);

  for (let i = 0; i < refsToDelete.length; i += 450) {
    const batch = db.batch();
    for (const ref of refsToDelete.slice(i, i + 450)) {
      batch.delete(ref);
    }
    await batch.commit();
  }
  return { ok: true };
});

/** Seed thread author as participant when a question is posted. */
export const onThreadCreated = onDocumentWritten(
  { document: "threads/{threadId}", region: "us-central1" },
  async (event) => {
    if (!event.data?.after.exists || event.data.before.exists) return;
    const threadId = event.params.threadId;
    const authorId = String(event.data.after.data()?.authorId ?? "");
    if (authorId) await ensureThreadParticipant(threadId, authorId);
  },
);
