import { randomBytes } from "node:crypto";
import "./bootstrap";
import { getAuth, type UserRecord } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import {
  FieldPath,
  FieldValue,
  Timestamp,
  getFirestore,
  type DocumentData,
  type DocumentReference,
  type Query,
  type QuerySnapshot,
} from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onValueWritten } from "firebase-functions/v2/database";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  ALL_ROLES,
  FORUM_ROLES,
  DEFAULT_ORG_ROOT_NAME,
  ORG_TYPE_DEPTH,
  belongsInDefaultAgentGroup,
  canAccessAdmin,
  canAuthorCourses,
  canManagePlatform,
  canParticipateInChats,
  isValidChildType,
  parseAnyOrgNodeType,
  parseOrgNodeType,
  parseRole,
  type UserRole,
} from "@pulse/shared";
import {
  ensureThreadParticipant,
  listThreadNotifyTargets,
  markNotificationsRead,
  notifyUser,
} from "./notifications";
import {
  ADMIN_WEB_URL,
  PULSE_WEB_URL,
  emailSecrets,
  sendTransactionalEmail,
} from "./email";
import {
  callableOpts,
  consumeFunctionQuota,
  requireApprovedMember,
  requireCaller,
} from "./auth";
import {
  addAgentToDefaultGroup,
  ensureAutoJoinMemberships,
} from "./chat-helpers";
import { headlineName, isUserApprovedForJoin } from "./users";

// Insights module is imported lazily inside Studio callables to shrink cold
// starts for chat/forum/admin paths that share this codebase.

const db = getFirestore();
const rtdb = getDatabase();
const auth = getAuth();
const storage = getStorage();

/** Mirrors QUIZ_DEFAULT_PASS_PERCENT / kQuizDefaultPassPercent in the clients. */
const DEFAULT_QUIZ_PASS_PERCENT = 70;
/** Upper bound on option indexes, so a hostile payload can't balloon a set. */
const MAX_QUIZ_OPTIONS = 20;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const emailSecretsOpts =
  emailSecrets.length > 0 ? { secrets: emailSecrets } : {};
const callableWithEmailOpts = { ...callableOpts, ...emailSecretsOpts };

type VoteValue = -1 | 0 | 1;

function parseVote(raw: unknown): VoteValue {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (n === -1 || n === 0 || n === 1) return n as VoteValue;
  throw new HttpsError("invalid-argument", "vote must be -1, 0, or 1");
}

export const syncPublicProfile = onDocumentWritten(
  "users/{uid}",
  async (event) => {
    const uid = event.params.uid;
    const after = event.data?.after;
    const ref = db.doc(`publicProfiles/${uid}`);
    if (!after?.exists) {
      await ref.delete();
      return;
    }
    const data = after.data() ?? {};
    await ref.set({
      uid,
      displayName:
        typeof data.displayName === "string" ? data.displayName.slice(0, 120) : null,
      photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
      role: String(data.role ?? "student"),
      agency: typeof data.agency === "string" ? data.agency.slice(0, 120) : null,
      isAnonymous: data.isAnonymous === true,
      updatedAt: FieldValue.serverTimestamp(),
    });
  },
);

/** Join auto-join groups when role or approvalStatus changes. */
export const syncUserAutoJoinGroups = onDocumentWritten(
  "users/{uid}",
  async (event) => {
    const uid = event.params.uid;
    const before = event.data?.before;
    const after = event.data?.after;
    if (!after?.exists) return;
    const beforeData = before?.exists ? before.data() : undefined;
    const afterData = after.data() ?? {};
    const beforeRole = beforeData ? parseRole(beforeData.role) : null;
    const afterRole = parseRole(afterData.role);
    const beforeApproval = String(beforeData?.approvalStatus ?? "approved");
    const afterApproval = String(afterData.approvalStatus ?? "approved");
    if (
      before?.exists &&
      beforeRole === afterRole &&
      beforeApproval === afterApproval
    ) {
      return;
    }
    await ensureAutoJoinMemberships(
      uid,
      afterRole,
      afterApproval,
      headlineName(afterData),
      afterData.isAnonymous === true,
    );
  },
);

/**
 * Maintain presenceStats/onlineCount when clients set/clear presence/{uid}.
 * Clients cannot write the counter directly (rules write:false).
 */
export const onPresenceWritten = onValueWritten(
  { ref: "/presence/{uid}", region: "us-central1" },
  async (event) => {
    const before = event.data.before.exists();
    const after = event.data.after.exists();
    let delta = 0;
    if (!before && after) delta = 1;
    else if (before && !after) delta = -1;
    else return;

    const countRef = rtdb.ref("presenceStats/onlineCount");
    await countRef.transaction((current) => {
      const n = typeof current === "number" ? current : 0;
      return Math.max(0, n + delta);
    });
  },
);

export const enrollInCourse = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "enrollInCourse");
  const user = await requireApprovedMember(uid);
  const courseId = String(request.data?.courseId ?? "");
  if (!courseId) throw new HttpsError("invalid-argument", "courseId required");

  if (parseRole(user.role) === "guest") {
    throw new HttpsError("permission-denied", "Sign in required.");
  }

  const courseRef = db.doc(`courses/${courseId}`);
  const enrollmentRef = db.doc(`users/${uid}/enrollments/${courseId}`);
  await db.runTransaction(async (tx) => {
    const [course, enrollment] = await Promise.all([
      tx.get(courseRef),
      tx.get(enrollmentRef),
    ]);
    if (!course.exists || course.data()?.status !== "published") {
      throw new HttpsError("not-found", "Published course not found.");
    }
    if (enrollment.exists) return;
    tx.set(enrollmentRef, {
      courseId,
      completedLessonIds: [],
      lastLessonId: null,
      lastPositionSeconds: 0,
      quizAttempts: {},
      enrolledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      completedAt: null,
    });
    tx.update(courseRef, {
      studentCount: FieldValue.increment(1),
      activeStudentCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(
      courseRef.collection("stats").doc("summary"),
      {
        enrolled: FieldValue.increment(1),
        completed: FieldValue.increment(0),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
  return { ok: true };
});

export const saveCourseProgress = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "saveCourseProgress");
  const courseId = String(request.data?.courseId ?? "");
  const lessonId = String(request.data?.lessonId ?? "");
  const positionSeconds = Math.max(
    0,
    Math.min(86_400, Math.round(Number(request.data?.positionSeconds ?? 0))),
  );
  const completed = request.data?.completed === true;
  if (!courseId || !lessonId || !Number.isFinite(positionSeconds)) {
    throw new HttpsError("invalid-argument", "Invalid course progress.");
  }
  const courseRef = db.doc(`courses/${courseId}`);
  const lessonRef = courseRef.collection("lessons").doc(lessonId);
  const enrollmentRef = db.doc(`users/${uid}/enrollments/${courseId}`);
  await db.runTransaction(async (tx) => {
    const [course, lesson, enrollment] = await Promise.all([
      tx.get(courseRef),
      tx.get(lessonRef),
      tx.get(enrollmentRef),
    ]);
    if (!course.exists || !lesson.exists || !enrollment.exists) {
      throw new HttpsError("failed-precondition", "Enrollment or lesson missing.");
    }
    if (completed && lesson.data()?.type === "quiz") {
      throw new HttpsError("failed-precondition", "Submit quizzes for grading.");
    }
    const data = enrollment.data() ?? {};
    const completedLessonIds = Array.isArray(data.completedLessonIds)
      ? data.completedLessonIds.map(String)
      : [];
    if (completed && !completedLessonIds.includes(lessonId)) {
      completedLessonIds.push(lessonId);
    }
    const lessonCount = Number(course.data()?.lessonCount ?? 0);
    const allDone =
      lessonCount > 0 && completedLessonIds.length >= lessonCount;
    const wasComplete = data.completedAt != null;
    tx.set(
      enrollmentRef,
      {
        completedLessonIds,
        lastLessonId: lessonId,
        lastPositionSeconds: positionSeconds,
        completedAt: allDone
          ? (data.completedAt ?? FieldValue.serverTimestamp())
          : null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    if (allDone && !wasComplete) {
      tx.update(courseRef, {
        activeStudentCount: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.set(
        courseRef.collection("stats").doc("summary"),
        {
          completed: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  });
  return { ok: true };
});

/**
 * Trusted vote path: updates vote doc + score increment under Admin SDK.
 */
export const castForumVote = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "castForumVote");
  const user = await requireApprovedMember(uid);
  const threadId = String(request.data?.threadId ?? "");
  const replyId =
    request.data?.replyId == null ? null : String(request.data.replyId);
  const next = parseVote(request.data?.vote);

  if (!threadId) {
    throw new HttpsError("invalid-argument", "threadId required");
  }

  if (!(FORUM_ROLES as readonly string[]).includes(parseRole(user.role))) {
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
  const profile = await requireApprovedMember(uid);
  const threadId = String(request.data?.threadId ?? "");
  const body = String(request.data?.body ?? "").trim();
  if (!threadId || !body || body.length > 20_000) {
    throw new HttpsError("invalid-argument", "Valid reply required.");
  }
  if (!(FORUM_ROLES as readonly string[]).includes(parseRole(profile.role))) {
    throw new HttpsError("permission-denied", "Forum participants only.");
  }
  const thread = await db.doc(`threads/${threadId}`).get();
  if (!thread.exists) {
    throw new HttpsError("permission-denied", "Forum participants only.");
  }
  if (thread.data()?.closed === true) {
    throw new HttpsError(
      "failed-precondition",
      "This thread is closed to new replies.",
    );
  }
  const replyRef = db.collection(`threads/${threadId}/replies`).doc();
  const batch = db.batch();
  batch.set(replyRef, {
    body,
    authorId: uid,
    authorName: headlineName(profile),
    authorPhotoUrl:
      typeof profile.photoUrl === "string" ? profile.photoUrl : null,
    authorRole: parseRole(profile.role),
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

/**
 * Admin-only role assignment.
 * Staff roles (agent / instructor / manager / admin) join the default group.
 */
export const setUserRole = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "setUserRole");
  const targetUid = String(request.data?.uid ?? "");
  const role = String(request.data?.role ?? "");
  if (!targetUid || !(ALL_ROLES as readonly string[]).includes(role)) {
    throw new HttpsError("invalid-argument", "uid and valid role required");
  }

  const actor = await db.doc(`users/${actorUid}`).get();
  if (actor.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admins only.");
  }

  const target = await db.doc(`users/${targetUid}`).get();
  if (!target.exists) {
    throw new HttpsError("not-found", "User not found.");
  }
  const currentRole = String(target.data()?.role ?? "");
  if (currentRole === "agent" && (role === "student" || role === "guest")) {
    throw new HttpsError(
      "failed-precondition",
      "Cannot downgrade an agent to student or guest.",
    );
  }

  await db.doc(`users/${targetUid}`).update({
    role,
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (belongsInDefaultAgentGroup(parseRole(role))) {
    await addAgentToDefaultGroup(targetUid, headlineName(target.data()));
  }

  const approvalStatus = String(target.data()?.approvalStatus ?? "approved");
  await ensureAutoJoinMemberships(
    targetUid,
    parseRole(role),
    approvalStatus,
    headlineName({ ...target.data(), role }),
    target.data()?.isAnonymous === true,
  );

  return { ok: true, uid: targetUid, role };
});

/**
 * Admin or manager: approve / reject newly registered accounts.
 * Legacy users without approvalStatus are already treated as approved.
 */
export const setUserApproval = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "setUserApproval");
  const targetUid = String(request.data?.uid ?? "");
  const status = String(request.data?.status ?? "");
  if (!targetUid || (status !== "approved" && status !== "rejected")) {
    throw new HttpsError("invalid-argument", "uid and status required");
  }
  const actor = await db.doc(`users/${actorUid}`).get();
  const actorRole = parseRole(actor.data()?.role);
  if (actorRole !== "admin" && actorRole !== "manager") {
    throw new HttpsError("permission-denied", "Admins and managers only.");
  }
  const target = await db.doc(`users/${targetUid}`).get();
  if (!target.exists) {
    throw new HttpsError("not-found", "User not found.");
  }
  await db.doc(`users/${targetUid}`).update({
    approvalStatus: status,
    approvedBy: actorUid,
    approvedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  if (status === "approved") {
    const data = target.data();
    await ensureAutoJoinMemberships(
      targetUid,
      parseRole(data?.role),
      "approved",
      headlineName(data),
      data?.isAnonymous === true,
    );
  }
  return { ok: true, uid: targetUid, status };
});

/** Admin/manager directory of users awaiting approval. */
export const listPendingApprovals = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "listPendingApprovals");
  const actor = await db.doc(`users/${actorUid}`).get();
  const actorRole = parseRole(actor.data()?.role);
  if (actorRole !== "admin" && actorRole !== "manager") {
    throw new HttpsError("permission-denied", "Admins and managers only.");
  }
  const snap = await db
    .collection("users")
    .where("approvalStatus", "==", "pending")
    .limit(100)
    .get();
  const users = snap.docs
    .filter((doc) => doc.id !== actorUid && doc.data()?.isAnonymous !== true)
    .map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: typeof data.email === "string" ? data.email : null,
        displayName:
          typeof data.displayName === "string" ? data.displayName : null,
        photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
        role: String(data.role ?? "student"),
        profileCompleted: data.profileCompleted !== false,
        agency: typeof data.agency === "string" ? data.agency : null,
        approvalStatus: "pending",
      };
    });
  return { users };
});

/**
 * Admin-only directory of students awaiting promotion.
 * Uses Admin SDK so the client does not need a fragile users list rule.
 */
export const listStudentsForPromotion = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "listStudentsForPromotion");

  const actor = await db.doc(`users/${actorUid}`).get();
  if (actor.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admins only.");
  }

  const snap = await db
    .collection("users")
    .where("role", "==", "student")
    .limit(120)
    .get();

  const students = snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: typeof data.email === "string" ? data.email : null,
        displayName:
          typeof data.displayName === "string" ? data.displayName : null,
        photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
        role: "student",
        isAnonymous: data.isAnonymous === true,
        profileCompleted: data.profileCompleted !== false,
      };
    })
    .filter((row) => row.isAnonymous !== true);

  return { students };
});

function serializeOrgNode(
  id: string,
  data: DocumentData | undefined,
) {
  return {
    id,
    name: typeof data?.name === "string" ? data.name : "",
    type: String(data?.type ?? ""),
    depth: Number(data?.depth ?? 0),
    parentId: typeof data?.parentId === "string" ? data.parentId : null,
    path: Array.isArray(data?.path) ? data.path.map(String) : [],
    managerUids: Array.isArray(data?.managerUids)
      ? data.managerUids.map(String)
      : [],
    active: data?.active !== false,
  };
}

function serializeAdminUser(
  id: string,
  data: DocumentData,
) {
  return {
    uid: id,
    email: typeof data.email === "string" ? data.email : null,
    displayName: typeof data.displayName === "string" ? data.displayName : null,
    photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
    role: String(data.role ?? "student"),
    isAnonymous: data.isAnonymous === true,
    profileCompleted: data.profileCompleted !== false,
    npn: typeof data.npn === "string" ? data.npn : null,
    agency: typeof data.agency === "string" ? data.agency : null,
    orgNodeId: typeof data.orgNodeId === "string" ? data.orgNodeId : null,
    accountStatus: String(data.accountStatus ?? "active"),
    approvalStatus:
      data.approvalStatus === "pending" ||
      data.approvalStatus === "approved" ||
      data.approvalStatus === "rejected"
        ? data.approvalStatus
        : null,
  };
}

async function requireAdminStaff(actorUid: string): Promise<{
  role: UserRole;
  orgNodeId: string | null;
}> {
  const actor = await db.doc(`users/${actorUid}`).get();
  const role = parseRole(actor.data()?.role);
  if (!canAccessAdmin(role)) {
    throw new HttpsError("permission-denied", "Admins and managers only.");
  }
  const orgNodeId =
    typeof actor.data()?.orgNodeId === "string" ? actor.data()!.orgNodeId : null;
  return { role, orgNodeId };
}

async function managerCanAccessNode(
  actor: { role: UserRole; orgNodeId: string | null },
  node: { path?: string[]; managerUids?: string[] },
  actorUid: string,
): Promise<boolean> {
  if (canManagePlatform(actor.role)) return true;
  if (Array.isArray(node.managerUids) && node.managerUids.includes(actorUid)) {
    return true;
  }
  if (!actor.orgNodeId) return false;
  const path = Array.isArray(node.path) ? node.path : [];
  return path.includes(actor.orgNodeId);
}

/** Admin/manager directory with filters for Pulse Admin. */
export const listUsersForAdmin = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "listUsersForAdmin");
  const actor = await requireAdminStaff(actorUid);
  const roleFilter = String(request.data?.role ?? "").trim();
  const approvalFilter = String(request.data?.approvalStatus ?? "").trim();
  const accountFilter = String(request.data?.accountStatus ?? "").trim();
  const orgFilter = String(request.data?.orgNodeId ?? "").trim();
  const queryText = String(request.data?.query ?? "").trim().toLowerCase();
  const max = Math.max(
    1,
    Math.min(200, Math.round(Number(request.data?.limit ?? 150))),
  );
  const cursorUid = String(request.data?.cursor ?? "").trim();

  let base: Query = db.collection("users").where("isAnonymous", "==", false);
  if (roleFilter && (ALL_ROLES as readonly string[]).includes(roleFilter)) {
    base = base.where("role", "==", roleFilter);
  }
  if (
    approvalFilter === "pending" ||
    approvalFilter === "approved" ||
    approvalFilter === "rejected"
  ) {
    base = base.where("approvalStatus", "==", approvalFilter);
  }
  if (
    accountFilter === "active" ||
    accountFilter === "deactivated" ||
    accountFilter === "pendingDeletion"
  ) {
    base = base.where("accountStatus", "==", accountFilter);
  }
  if (orgFilter) {
    base = base.where("orgNodeId", "==", orgFilter);
  }
  base = base.orderBy(FieldPath.documentId());

  // Manager scope: resolve once, filter in memory while scanning.
  let scopedIds: Set<string> | null = null;
  if (!canManagePlatform(actor.role) && actor.orgNodeId) {
    scopedIds = new Set<string>();
    const scopeSnap = await db.doc(`orgNodes/${actor.orgNodeId}`).get();
    const scopePath: string[] = Array.isArray(scopeSnap.data()?.path)
      ? scopeSnap.data()!.path.map(String)
      : [actor.orgNodeId];
    for (const id of scopePath) scopedIds.add(id);
    const subtree = await db
      .collection("orgNodes")
      .where("path", "array-contains", actor.orgNodeId)
      .limit(500)
      .get();
    for (const doc of subtree.docs) scopedIds.add(doc.id);
  }

  const needsInMemoryFilter = Boolean(queryText || scopedIds);
  // Collect max+1 matches so hasMore is the leftover, not "page looks full".
  const collected: ReturnType<typeof serializeAdminUser>[] = [];
  let scanCursor = cursorUid || null;
  const maxRounds = needsInMemoryFilter ? 12 : 3;
  let exhausted = false;
  let hitRoundCap = false;

  for (let round = 0; round < maxRounds && collected.length <= max; round++) {
    let q: Query = base;
    if (scanCursor) q = q.startAfter(scanCursor);
    const remaining = max + 1 - collected.length;
    const batchSize = needsInMemoryFilter
      ? Math.min(200, Math.max(remaining * 3, remaining))
      : remaining;
    const snap = await q.limit(batchSize).get();
    if (snap.empty) {
      exhausted = true;
      break;
    }

    for (const doc of snap.docs) {
      scanCursor = doc.id;
      if (doc.id === actorUid) continue;
      const user = serializeAdminUser(doc.id, doc.data());
      if (scopedIds && (!user.orgNodeId || !scopedIds.has(user.orgNodeId))) {
        continue;
      }
      if (queryText) {
        const hay =
          `${user.displayName ?? ""} ${user.email ?? ""}`.toLowerCase();
        if (!hay.includes(queryText)) continue;
      }
      collected.push(user);
      if (collected.length > max) break;
    }

    if (snap.size < batchSize) {
      exhausted = true;
      break;
    }
    if (round === maxRounds - 1 && collected.length <= max) {
      hitRoundCap = true;
    }
  }

  const hasMore = collected.length > max || (hitRoundCap && !exhausted);
  const users = collected.slice(0, max);
  const nextCursor =
    hasMore && users.length > 0 ? users[users.length - 1]!.uid : null;

  return { users, nextCursor };
});

export const adminDeactivateUser = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "adminDeactivateUser");
  const actor = await requireAdminStaff(actorUid);
  if (!canManagePlatform(actor.role)) {
    throw new HttpsError("permission-denied", "Admins only.");
  }
  const targetUid = String(request.data?.uid ?? "");
  if (!targetUid || targetUid === actorUid) {
    throw new HttpsError("invalid-argument", "uid required");
  }
  const userRef = db.doc(`users/${targetUid}`);
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
  await clearFcmTokens(targetUid);
  return { ok: true, uid: targetUid };
});

export const adminReactivateUser = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "adminReactivateUser");
  const actor = await requireAdminStaff(actorUid);
  if (!canManagePlatform(actor.role)) {
    throw new HttpsError("permission-denied", "Admins only.");
  }
  const targetUid = String(request.data?.uid ?? "");
  if (!targetUid) throw new HttpsError("invalid-argument", "uid required");
  const userRef = db.doc(`users/${targetUid}`);
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
  return { ok: true, uid: targetUid };
});

/** Studio: detailed analytics for one course (author or admin). */
export const getCourseInsights = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "getCourseInsights");
  const courseId = String(request.data?.courseId ?? "").trim();
  if (!courseId) throw new HttpsError("invalid-argument", "courseId required");

  const rangeRaw = request.data?.rangeDays;
  let rangeDays: number | null = null;
  if (rangeRaw != null && rangeRaw !== "" && rangeRaw !== "all") {
    const n = Number(rangeRaw);
    if (![7, 30, 90].includes(n)) {
      throw new HttpsError("invalid-argument", "rangeDays must be 7, 30, 90, or all");
    }
    rangeDays = n;
  }

  const courseSnap = await db.doc(`courses/${courseId}`).get();
  if (!courseSnap.exists) throw new HttpsError("not-found", "Course not found.");
  const course = courseSnap.data() ?? {};
  const actor = await db.doc(`users/${actorUid}`).get();
  const role = parseRole(actor.data()?.role);
  const {
    assertCanViewCourseInsights,
    buildCourseInsights,
  } = await import("./insights");
  const allowed = await assertCanViewCourseInsights(
    actorUid,
    String(course.createdBy ?? ""),
    role,
  );
  if (!allowed) {
    throw new HttpsError("permission-denied", "Not allowed to view this course.");
  }
  if (!canAuthorCourses(role)) {
    throw new HttpsError("permission-denied", "Studio authors only.");
  }

  try {
    const rawCursor = String(request.data?.learnerCursor ?? "").trim();
    const statusRaw = String(request.data?.learnerStatus ?? "all").trim();
    const learnerStatus =
      statusRaw === "inProgress" ||
      statusRaw === "completed" ||
      statusRaw === "atRisk" ||
      statusRaw === "all"
        ? statusRaw
        : "all";
    return await buildCourseInsights({
      courseId,
      rangeDays,
      learnerLimit: Math.min(
        200,
        Math.max(0, Math.round(Number(request.data?.learnerLimit ?? 100))),
      ),
      learnerCursor: rawCursor || null,
      learnerStatus,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "COURSE_NOT_FOUND") {
      throw new HttpsError("not-found", "Course not found.");
    }
    throw error;
  }
});

/** Studio: portfolio rollup across authored/admin courses. */
export const getCatalogInsights = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "getCatalogInsights");
  const actor = await db.doc(`users/${actorUid}`).get();
  const role = parseRole(actor.data()?.role);
  if (!canAuthorCourses(role)) {
    throw new HttpsError("permission-denied", "Studio authors only.");
  }

  const rawCourseIds = Array.isArray(request.data?.courseIds)
    ? (request.data.courseIds as unknown[]).map(String).filter(Boolean)
    : [];
  const rawPaths = Array.isArray(request.data?.paths)
    ? (request.data.paths as Array<Record<string, unknown>>)
    : [];

  // Resolve course set: explicit ids, else authored (or all for admin).
  let courseIds = rawCourseIds.slice(0, 100);
  if (courseIds.length === 0) {
    const q =
      role === "admin"
        ? db.collection("courses").orderBy("updatedAt", "desc").limit(80)
        : db
            .collection("courses")
            .where("createdBy", "==", actorUid)
            .orderBy("updatedAt", "desc")
            .limit(80);
    const snap = await q.get();
    courseIds = snap.docs.map((doc) => doc.id);
  } else if (role !== "admin") {
    // Authors may only request their own courses.
    const snaps = await Promise.all(
      courseIds.map((id: string) => db.doc(`courses/${id}`).get()),
    );
    courseIds = snaps
      .filter(
        (snap) =>
          snap.exists && String(snap.data()?.createdBy ?? "") === actorUid,
      )
      .map((snap) => snap.id);
  }

  const pathSummaries = rawPaths
    .slice(0, 5)
    .map((path) => ({
      pathId: String(path.pathId ?? path.id ?? ""),
      title: String(path.title ?? "Path"),
      courseIds: Array.isArray(path.courseIds)
        ? path.courseIds.map(String)
        : [],
    }))
    .filter((path) => path.pathId);

  const { buildCatalogInsights } = await import("./insights");
  return buildCatalogInsights({ courseIds, pathSummaries });
});

/** Studio workspace: paged learners for one course (no client collectionGroup). */
export const listCourseStudents = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "listCourseStudents");
  const courseId = String(request.data?.courseId ?? "").trim();
  if (!courseId) throw new HttpsError("invalid-argument", "courseId required");

  const courseSnap = await db.doc(`courses/${courseId}`).get();
  if (!courseSnap.exists) throw new HttpsError("not-found", "Course not found.");
  const course = courseSnap.data() ?? {};
  const actor = await db.doc(`users/${actorUid}`).get();
  const role = parseRole(actor.data()?.role);
  if (!canAuthorCourses(role)) {
    throw new HttpsError("permission-denied", "Studio authors only.");
  }
  const {
    assertCanViewCourseInsights,
    listCourseStudentsPage,
  } = await import("./insights");
  const allowed = await assertCanViewCourseInsights(
    actorUid,
    String(course.createdBy ?? ""),
    role,
  );
  if (!allowed) {
    throw new HttpsError("permission-denied", "Not allowed.");
  }

  const limit = Math.min(
    100,
    Math.max(1, Math.round(Number(request.data?.limit ?? 50))),
  );
  const cursor = String(request.data?.cursor ?? "").trim() || null;
  return listCourseStudentsPage({ courseId, limit, cursor });
});

export const getAdminInsights = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "getAdminInsights");
  await requireAdminStaff(actorUid);

  const usersCol = db.collection("users").where("isAnonymous", "==", false);
  const [
    totalSnap,
    pendingSnap,
    activeSnap,
    deactivatedSnap,
    pendingDeletionSnap,
    orgCountSnap,
    recentSnap,
  ] = await Promise.all([
    usersCol.count().get(),
    usersCol.where("approvalStatus", "==", "pending").count().get(),
    usersCol.where("accountStatus", "==", "active").count().get(),
    usersCol.where("accountStatus", "==", "deactivated").count().get(),
    usersCol.where("accountStatus", "==", "pendingDeletion").count().get(),
    db.collection("orgNodes").count().get(),
    usersCol.orderBy("createdAt", "desc").limit(12).get(),
  ]);

  const byRole: Record<string, number> = {};
  await Promise.all(
    (ALL_ROLES as readonly string[]).map(async (role) => {
      const snap = await usersCol.where("role", "==", role).count().get();
      byRole[role] = snap.data().count;
    }),
  );

  const recentRegistrations = recentSnap.docs.map((doc) => {
    const data = doc.data();
    const created = data.createdAt as Timestamp | undefined;
    return {
      uid: doc.id,
      displayName:
        typeof data.displayName === "string" ? data.displayName : null,
      email: typeof data.email === "string" ? data.email : null,
      role: String(data.role ?? "student"),
      createdAt: created?.toMillis?.() ?? null,
    };
  });

  // active count may undercount if accountStatus missing; fall back.
  const totalUsers = totalSnap.data().count;
  const deactivated = deactivatedSnap.data().count;
  const pendingDeletion = pendingDeletionSnap.data().count;
  const activeCounted = activeSnap.data().count;
  const active =
    activeCounted > 0
      ? activeCounted
      : Math.max(0, totalUsers - deactivated - pendingDeletion);

  return {
    totalUsers,
    byRole,
    pendingApprovals: pendingSnap.data().count,
    active,
    deactivated,
    pendingDeletion,
    orgNodeCount: orgCountSnap.data().count,
    recentRegistrations,
  };
});

export const ensureOrgRoot = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "ensureOrgRoot");
  const actor = await requireAdminStaff(actorUid);
  if (!canManagePlatform(actor.role)) {
    throw new HttpsError("permission-denied", "Admins only.");
  }

  const existing = await db
    .collection("orgNodes")
    .where("type", "==", "organization")
    .limit(1)
    .get();
  if (!existing.empty) {
    const doc = existing.docs[0]!;
    // Preserve a custom root name; only ensure the node stays active.
    await doc.ref.set(
      {
        active: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    const next = await doc.ref.get();
    return { node: serializeOrgNode(doc.id, next.data()) };
  }

  const ref = db.collection("orgNodes").doc();
  const node = {
    name: DEFAULT_ORG_ROOT_NAME,
    type: "organization" as const,
    depth: 1,
    parentId: null,
    path: [ref.id],
    managerUids: [] as string[],
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(node);
  return { node: serializeOrgNode(ref.id, { ...node, path: [ref.id] }) };
});

export const listOrgSubtree = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "listOrgSubtree");
  const actor = await requireAdminStaff(actorUid);
  const parentId =
    request.data?.parentId == null || request.data?.parentId === ""
      ? null
      : String(request.data.parentId);

  let snap: QuerySnapshot;
  if (parentId) {
    snap = await db
      .collection("orgNodes")
      .where("path", "array-contains", parentId)
      .get();
  } else if (canManagePlatform(actor.role)) {
    snap = await db.collection("orgNodes").limit(500).get();
  } else if (actor.orgNodeId) {
    snap = await db
      .collection("orgNodes")
      .where("path", "array-contains", actor.orgNodeId)
      .get();
  } else {
    // Managers without org assignment still see nodes they manage.
    snap = await db
      .collection("orgNodes")
      .where("managerUids", "array-contains", actorUid)
      .get();
  }

  const nodes = snap.docs
    .map((doc) => serializeOrgNode(doc.id, doc.data()))
    .filter((n) => n.id);
  return { nodes };
});

export const createOrgNode = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "createOrgNode");
  const actor = await requireAdminStaff(actorUid);
  if (!canManagePlatform(actor.role)) {
    throw new HttpsError("permission-denied", "Admins only.");
  }
  const name = String(request.data?.name ?? "").trim().slice(0, 120);
  const type = parseOrgNodeType(request.data?.type);
  const parentId = String(request.data?.parentId ?? "");
  if (!name || !type || !parentId) {
    throw new HttpsError("invalid-argument", "name, type, parentId required");
  }
  if (type === "organization") {
    throw new HttpsError("invalid-argument", "Use ensureOrgRoot for organizations.");
  }

  const parentSnap = await db.doc(`orgNodes/${parentId}`).get();
  if (!parentSnap.exists) throw new HttpsError("not-found", "Parent not found.");
  const parentType = parseOrgNodeType(parentSnap.data()?.type);
  if (!parentType) {
    throw new HttpsError(
      "failed-precondition",
      "Parent node type is invalid or legacy (division/region). Run repairOrgTree.",
    );
  }
  if (!isValidChildType(parentType, type)) {
    throw new HttpsError(
      "failed-precondition",
      "Child type must be exactly one level below parent.",
    );
  }
  const parentPath: string[] = Array.isArray(parentSnap.data()?.path)
    ? parentSnap.data()!.path.map(String)
    : [parentId];

  const ref = db.collection("orgNodes").doc();
  const depth = ORG_TYPE_DEPTH[type];
  const node = {
    name,
    type,
    depth,
    parentId,
    path: [...parentPath, ref.id],
    managerUids: [] as string[],
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(node);
  return { node: serializeOrgNode(ref.id, node) };
});

export const updateOrgNode = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "updateOrgNode");
  const actor = await requireAdminStaff(actorUid);
  if (!canManagePlatform(actor.role)) {
    throw new HttpsError("permission-denied", "Admins only.");
  }
  const id = String(request.data?.id ?? "");
  if (!id) throw new HttpsError("invalid-argument", "id required");
  const ref = db.doc(`orgNodes/${id}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Org node not found.");

  const nodeType = parseOrgNodeType(snap.data()?.type);
  if (nodeType === "organization" && typeof request.data?.active === "boolean") {
    throw new HttpsError(
      "failed-precondition",
      "Organization root cannot be deactivated.",
    );
  }

  const patch: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (typeof request.data?.name === "string") {
    const name = request.data.name.trim().slice(0, 120);
    if (!name) throw new HttpsError("invalid-argument", "name required");
    patch.name = name;
  }
  if (typeof request.data?.active === "boolean") {
    patch.active = request.data.active;
  }
  if (Array.isArray(request.data?.managerUids)) {
    patch.managerUids = request.data.managerUids.map(String).slice(0, 50);
  }
  await ref.update(patch);
  const next = await ref.get();
  return { node: serializeOrgNode(id, next.data()) };
});

export const moveOrgNode = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "moveOrgNode");
  const actor = await requireAdminStaff(actorUid);
  if (!canManagePlatform(actor.role)) {
    throw new HttpsError("permission-denied", "Admins only.");
  }
  const id = String(request.data?.id ?? "");
  const newParentId = String(request.data?.parentId ?? "");
  if (!id || !newParentId || id === newParentId) {
    throw new HttpsError("invalid-argument", "id and parentId required");
  }
  const ref = db.doc(`orgNodes/${id}`);
  const [snap, parentSnap] = await Promise.all([
    ref.get(),
    db.doc(`orgNodes/${newParentId}`).get(),
  ]);
  if (!snap.exists) throw new HttpsError("not-found", "Org node not found.");
  if (!parentSnap.exists) throw new HttpsError("not-found", "Parent not found.");
  const type = parseOrgNodeType(snap.data()?.type);
  if (type === "organization") {
    throw new HttpsError(
      "failed-precondition",
      "Every Benefits root cannot be moved.",
    );
  }
  const parentType = parseOrgNodeType(parentSnap.data()?.type);
  if (!type || !parentType || !isValidChildType(parentType, type)) {
    throw new HttpsError(
      "failed-precondition",
      "Move must keep depth = parent depth + 1.",
    );
  }
  const parentPath: string[] = Array.isArray(parentSnap.data()?.path)
    ? parentSnap.data()!.path.map(String)
    : [newParentId];
  if (parentPath.includes(id)) {
    throw new HttpsError("failed-precondition", "Cannot move under descendant.");
  }
  const newPath = [...parentPath, id];

  // Update this node + rewrite descendant paths that start with oldPath.
  const descendants = await db
    .collection("orgNodes")
    .where("path", "array-contains", id)
    .get();
  const batch = db.batch();
  batch.update(ref, {
    parentId: newParentId,
    path: newPath,
    updatedAt: FieldValue.serverTimestamp(),
  });
  for (const doc of descendants.docs) {
    if (doc.id === id) continue;
    const childPath: string[] = Array.isArray(doc.data().path)
      ? doc.data().path.map(String)
      : [];
    const idx = childPath.indexOf(id);
    if (idx < 0) continue;
    const rewritten = [...newPath, ...childPath.slice(idx + 1)];
    batch.update(doc.ref, {
      path: rewritten,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  const next = await ref.get();
  return { node: serializeOrgNode(id, next.data()), rewritten: descendants.size };
});

export const assignUserToOrgNode = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "assignUserToOrgNode");
  const actor = await requireAdminStaff(actorUid);
  const targetUid = String(request.data?.uid ?? "");
  const orgNodeId =
    request.data?.orgNodeId == null || request.data?.orgNodeId === ""
      ? null
      : String(request.data.orgNodeId);
  if (!targetUid) throw new HttpsError("invalid-argument", "uid required");

  let agencyName: string | null = null;
  if (orgNodeId) {
    const nodeSnap = await db.doc(`orgNodes/${orgNodeId}`).get();
    if (!nodeSnap.exists) throw new HttpsError("not-found", "Org node not found.");
    const allowed = await managerCanAccessNode(
      actor,
      nodeSnap.data() ?? {},
      actorUid,
    );
    if (!allowed) {
      throw new HttpsError("permission-denied", "Outside your org scope.");
    }
    agencyName =
      typeof nodeSnap.data()?.name === "string" ? nodeSnap.data()!.name : null;
  } else if (!canManagePlatform(actor.role)) {
    throw new HttpsError("permission-denied", "Admins only to clear org.");
  }

  await db.doc(`users/${targetUid}`).update({
    orgNodeId,
    agency: agencyName,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true, uid: targetUid, orgNodeId, agency: agencyName };
});

export const listPublicProfiles = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "listPublicProfiles");
  await requireApprovedMember(uid);
  const requestedLimit = Math.round(Number(request.data?.limit ?? 80));
  const max = Math.max(1, Math.min(100, requestedLimit));
  const snap = await db
    .collection("users")
    .where("isAnonymous", "==", false)
    .limit(max + 1)
    .get();
  const profiles = snap.docs
    .filter((profile) => profile.id !== uid)
    .slice(0, max)
    .map((profile) => {
      const data = profile.data();
      return {
        uid: profile.id,
        displayName:
          typeof data.displayName === "string" ? data.displayName : null,
        photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
        role: String(data.role ?? "student"),
        agency: typeof data.agency === "string" ? data.agency : null,
        isAnonymous: false,
        profileCompleted: data.profileCompleted !== false,
      };
    });
  return { profiles };
});

/**
 * Directory search for chats (name, email, NPN). Returns PII for org members
 * who can participate in chats.
 */
export const searchDirectory = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "searchDirectory");
  const callerData = await requireApprovedMember(uid);
  if (
    !canParticipateInChats(
      parseRole(callerData.role),
      callerData.isAnonymous === true,
    )
  ) {
    throw new HttpsError("permission-denied", "Chats not available.");
  }

  const rawQuery = String(request.data?.query ?? "").trim();
  if (rawQuery.length < 2) {
    return { profiles: [] };
  }
  const limit = Math.max(
    1,
    Math.min(40, Math.round(Number(request.data?.limit ?? 40))),
  );
  const q = rawQuery.toLowerCase();
  const npnDigits = rawQuery.replace(/\D/g, "");
  const looksEmail = q.includes("@");
  const looksNpn = npnDigits.length >= 5 && /^\d[\d\s-]*$/.test(rawQuery);

  const matched = new Map<string, Record<string, unknown>>();

  const pushDoc = (doc: {
    id: string;
    data: () => DocumentData;
  }) => {
    if (doc.id === uid || matched.has(doc.id)) return;
    if (matched.size >= limit) return;
    const data = doc.data();
    if (data.isAnonymous === true) return;
    const role = parseRole(data.role);
    if (role === "guest") return;
    if (!isUserApprovedForJoin(data) && String(data.approvalStatus ?? "") === "rejected") {
      return;
    }
    // Allow pending for search so admins can still DM? Plan says approved.
    // Stick to approved (legacy missing = approved).
    if (!isUserApprovedForJoin(data)) return;
    matched.set(doc.id, data);
  };

  if (looksEmail) {
    const exact = await db
      .collection("users")
      .where("email", "==", q)
      .limit(limit)
      .get();
    exact.docs.forEach(pushDoc);
  }

  if (looksNpn && matched.size < limit) {
    const exact = await db
      .collection("users")
      .where("npn", "==", npnDigits)
      .limit(limit)
      .get();
    exact.docs.forEach(pushDoc);
  }

  if (matched.size < limit) {
    // Prefix range on displayName (case-sensitive Firestore limitation —
    // also scan a pool and filter case-insensitively).
    const pool = await db
      .collection("users")
      .where("isAnonymous", "==", false)
      .limit(200)
      .get();
    for (const doc of pool.docs) {
      if (matched.size >= limit) break;
      const data = doc.data();
      const name = String(data.displayName ?? "").toLowerCase();
      const email = String(data.email ?? "").toLowerCase();
      const npn = String(data.npn ?? "").replace(/\D/g, "");
      if (
        name.includes(q) ||
        email.includes(q) ||
        (npnDigits.length >= 2 && npn.includes(npnDigits))
      ) {
        pushDoc(doc);
      }
    }
  }

  const profiles = [...matched.entries()].map(([id, data]) => ({
    uid: id,
    displayName:
      typeof data.displayName === "string" ? data.displayName : null,
    photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
    role: String(data.role ?? "student"),
    agency: typeof data.agency === "string" ? data.agency : null,
    email: typeof data.email === "string" ? data.email : null,
    npn: typeof data.npn === "string" ? data.npn : null,
    isAnonymous: false,
    profileCompleted: data.profileCompleted !== false,
  }));

  return { profiles };
});

/** Normalizes a submitted answer into a sorted, deduped list of option indexes. */
function parseSelectedOptions(raw: unknown): number[] {
  const list = Array.isArray(raw) ? raw : [raw];
  const indexes = new Set<number>();
  for (const entry of list) {
    const n = typeof entry === "number" ? entry : Number(entry);
    if (Number.isInteger(n) && n >= 0 && n < MAX_QUIZ_OPTIONS) {
      indexes.add(n);
    }
  }
  return [...indexes].sort((a, b) => a - b);
}

function sameOptionSet(expected: number[], given: number[]): boolean {
  if (expected.length !== given.length) return false;
  return expected.every((value, index) => value === given[index]);
}

/**
 * Grades a quiz lesson server-side.
 *
 * The answer key lives in `courses/{id}/lessons/{id}/secure/answerKey`, which
 * learners cannot read, and this callable is the only writer of
 * `quizAttempts` / quiz completion on an enrollment.
 */
export const submitQuizAttempt = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "submitQuizAttempt");
  const courseId = String(request.data?.courseId ?? "");
  const lessonId = String(request.data?.lessonId ?? "");
  const rawAnswers = request.data?.answers;

  if (!courseId || !lessonId) {
    throw new HttpsError("invalid-argument", "courseId and lessonId required");
  }
  if (typeof rawAnswers !== "object" || rawAnswers === null) {
    throw new HttpsError("invalid-argument", "answers must be an object");
  }

  const courseRef = db.doc(`courses/${courseId}`);
  const lessonRef = courseRef.collection("lessons").doc(lessonId);
  const [courseSnap, lessonSnap, keySnap] = await Promise.all([
    courseRef.get(),
    lessonRef.get(),
    lessonRef.collection("secure").doc("answerKey").get(),
  ]);

  if (!courseSnap.exists || !lessonSnap.exists) {
    throw new HttpsError("not-found", "Lesson not found.");
  }

  const course = courseSnap.data() ?? {};
  const lesson = lessonSnap.data() ?? {};
  if (lesson.type !== "quiz") {
    throw new HttpsError("failed-precondition", "Lesson is not a quiz.");
  }

  // Drafts are only answerable by their author or an admin (Studio preview).
  if (course.status !== "published") {
    const actor = await db.doc(`users/${uid}`).get();
    const role = parseRole(actor.data()?.role);
    const owns = String(course.createdBy ?? "") === uid;
    if (role !== "admin" && !(owns && canAuthorCourses(role))) {
      throw new HttpsError("permission-denied", "Course is not published.");
    }
  }

  const questions = Array.isArray(lesson.questions) ? lesson.questions : [];
  if (questions.length === 0) {
    throw new HttpsError("failed-precondition", "Quiz has no questions.");
  }
  const key = keySnap.exists
    ? ((keySnap.data()?.answers ?? {}) as Record<string, unknown>)
    : {};
  if (Object.keys(key).length === 0) {
    throw new HttpsError("failed-precondition", "Quiz has no answer key.");
  }

  const correctByQuestion: Record<string, boolean> = {};
  for (const raw of questions) {
    if (typeof raw !== "object" || raw === null) continue;
    const question = raw as Record<string, unknown>;
    const questionId = String(question.id ?? "");
    if (!questionId) continue;
    const expected = parseSelectedOptions(key[questionId]);
    const given = parseSelectedOptions(
      (rawAnswers as Record<string, unknown>)[questionId],
    );
    correctByQuestion[questionId] =
      expected.length > 0 && sameOptionSet(expected, given);
  }

  const total = Object.keys(correctByQuestion).length;
  if (total === 0) {
    throw new HttpsError("failed-precondition", "Quiz has no gradable questions.");
  }
  const correct = Object.values(correctByQuestion).filter(Boolean).length;
  const score = Math.round((correct / total) * 100);
  const rawPass = Number(lesson.passPercent);
  const passPercent = Number.isFinite(rawPass)
    ? Math.min(100, Math.max(0, Math.round(rawPass)))
    : DEFAULT_QUIZ_PASS_PERCENT;
  const passed = score >= passPercent;

  const enrollmentRef = db.doc(`users/${uid}/enrollments/${courseId}`);
  await db.runTransaction(async (tx) => {
    const [snap, courseSnap] = await Promise.all([
      tx.get(enrollmentRef),
      tx.get(courseRef),
    ]);
    if (!snap.exists) {
      throw new HttpsError("failed-precondition", "Enroll in the course first.");
    }
    if (!courseSnap.exists) {
      throw new HttpsError("not-found", "Course not found.");
    }
    const data = snap.data() ?? {};
    const completed: string[] = Array.isArray(data.completedLessonIds)
      ? data.completedLessonIds.map(String)
      : [];
    if (passed && !completed.includes(lessonId)) {
      completed.push(lessonId);
    }
    const lessonCount = Number(course.lessonCount ?? 0);
    const allDone = lessonCount > 0 && completed.length >= lessonCount;
    const wasComplete = data.completedAt != null;

    tx.set(
      enrollmentRef,
      {
        completedLessonIds: completed,
        lastLessonId: lessonId,
        // Nested map + merge keeps attempts for the other lessons intact.
        quizAttempts: {
          [lessonId]: {
            score,
            passed,
            at: FieldValue.serverTimestamp(),
          },
        },
        updatedAt: FieldValue.serverTimestamp(),
        completedAt: allDone
          ? (data.completedAt ?? FieldValue.serverTimestamp())
          : null,
      },
      { merge: true },
    );
    if (allDone && !wasComplete) {
      tx.update(courseRef, {
        activeStudentCount: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.set(
        courseRef.collection("stats").doc("summary"),
        {
          completed: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  });

  return { score, passed, passPercent, correctByQuestion };
});

/**
 * Ensures the caller (staff) is a member of the default community RTDB chat.
 */
export const markNotificationRead = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "markNotificationRead");
  const ids = Array.isArray(request.data?.notificationIds)
    ? request.data.notificationIds.map(String).filter(Boolean)
    : [];
  const notificationId = String(request.data?.notificationId ?? "");
  const all = ids.length
    ? ids
    : notificationId
      ? [notificationId]
      : [];
  if (!all.length) {
    throw new HttpsError("invalid-argument", "notificationId required");
  }
  return markNotificationsRead(uid, all);
});

export const markAllNotificationsRead = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "markAllNotificationsRead");
  return markNotificationsRead(uid, "all");
});

/** When a course flips to published, notify enrolled learners. */
export const onCoursePublished = onDocumentWritten(
  { document: "courses/{courseId}", region: "us-central1" },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after || after.status !== "published") return;
    if (before?.status === "published") return;
    const courseId = event.params.courseId;
    const title = String(after.title ?? "Course");
    const enrollments = await db
      .collectionGroup("enrollments")
      .where("courseId", "==", courseId)
      .limit(200)
      .get();

    const uids = new Set<string>();
    for (const doc of enrollments.docs) {
      const parent = doc.ref.parent.parent;
      if (parent) uids.add(parent.id);
    }

    const uidList = [...uids];
    const CHUNK = 50;
    for (let i = 0; i < uidList.length; i += CHUNK) {
      const chunk = uidList.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map((uid) =>
          notifyUser(uid, {
            type: "course_published",
            title: "Course published",
            body: title.slice(0, 120),
            href: `/academy/${courseId}`,
            deepLink: `pulse://academy/${courseId}`,
            ref: { courseId },
          }),
        ),
      );
    }
  },
);

// ---------------------------------------------------------------------------
// Account lifecycle
//
// Deactivation is user-reversible (sign in again and reactivate). Deletion
// starts a 90-day grace period: shared content is anonymized immediately,
// personal data is purged by the daily cron once the grace period ends.
// ---------------------------------------------------------------------------

const ACCOUNT_DELETION_GRACE_DAYS = 90;

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

  // Snapshot the identity so a cancel inside the grace period can restore it.
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

  // Shared content stays but under the anonymous identity, effective now.
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
    await storage
      .bucket()
      .file(`avatars/${uid}.jpg`)
      .delete()
      .catch(() => undefined);
    await auth.deleteUser(uid).catch(() => undefined);
  }
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
  const customToken = await auth.createCustomToken(uid, { sso: true });
  void ref.delete().catch(() => undefined);
  return { customToken, uid };
});

async function getOrCreateOrgRootId(): Promise<string> {
  const existing = await db
    .collection("orgNodes")
    .where("type", "==", "organization")
    .limit(1)
    .get();
  if (!existing.empty) {
    const doc = existing.docs[0]!;
    await doc.ref.set(
      {
        active: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return doc.id;
  }
  const ref = db.collection("orgNodes").doc();
  await ref.set({
    name: DEFAULT_ORG_ROOT_NAME,
    type: "organization",
    depth: 1,
    parentId: null,
    path: [ref.id],
    managerUids: [],
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

/** Agencies hang directly under the Every Benefits organization root. */
export const createAgency = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "createAgency");
  const actor = await requireAdminStaff(actorUid);
  if (!canManagePlatform(actor.role)) {
    throw new HttpsError("permission-denied", "Admins only.");
  }
  const name = String(request.data?.name ?? "").trim().slice(0, 120);
  if (!name) throw new HttpsError("invalid-argument", "name required");

  const rootId = await getOrCreateOrgRootId();
  const ref = db.collection("orgNodes").doc();
  const node = {
    name,
    type: "agency" as const,
    depth: ORG_TYPE_DEPTH.agency,
    parentId: rootId,
    path: [rootId, ref.id],
    managerUids: [] as string[],
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(node);
  return { node: serializeOrgNode(ref.id, node) };
});

/**
 * Flattens legacy layers: agencies → root, sub_agencies kept under agencies,
 * team/unit/division/region deactivated; users reassigned to nearest live ancestor.
 */
export const repairOrgTree = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "repairOrgTree");
  const actor = await requireAdminStaff(actorUid);
  if (!canManagePlatform(actor.role)) {
    throw new HttpsError("permission-denied", "Admins only.");
  }
  const rootId = await getOrCreateOrgRootId();
  const all = await db.collection("orgNodes").limit(1000).get();
  const byId = new Map(all.docs.map((d) => [d.id, d]));

  let moved = 0;
  let deactivatedLegacy = 0;
  let usersReassigned = 0;
  const agencies: Array<{ id: string; data: DocumentData }> =
    [];
  const byParent = new Map<string, string[]>();
  const legacyIds: string[] = [];

  for (const doc of all.docs) {
    const data = doc.data();
    const type = String(data.type ?? "");
    const parentId =
      data.parentId == null || data.parentId === ""
        ? null
        : String(data.parentId);
    if (parentId) {
      const list = byParent.get(parentId) ?? [];
      list.push(doc.id);
      byParent.set(parentId, list);
    }
    if (type === "agency") agencies.push({ id: doc.id, data });
    const anyType = parseAnyOrgNodeType(type);
    if (
      anyType === "division" ||
      anyType === "region" ||
      anyType === "team" ||
      anyType === "unit"
    ) {
      legacyIds.push(doc.id);
      if (data.active !== false) {
        await doc.ref.update({
          active: false,
          updatedAt: FieldValue.serverTimestamp(),
        });
        deactivatedLegacy += 1;
      }
    }
  }

  for (const agency of agencies) {
    const needsMove =
      agency.data.parentId !== rootId ||
      Number(agency.data.depth) !== ORG_TYPE_DEPTH.agency;
    if (needsMove) {
      await db.doc(`orgNodes/${agency.id}`).update({
        parentId: rootId,
        path: [rootId, agency.id],
        depth: ORG_TYPE_DEPTH.agency,
        updatedAt: FieldValue.serverTimestamp(),
      });
      moved += 1;
    }

    // Fix live descendants (sub_agency only) depth + path under this agency.
    const queue: Array<{ id: string; path: string[] }> = [
      { id: agency.id, path: [rootId, agency.id] },
    ];
    while (queue.length) {
      const parent = queue.shift()!;
      for (const childId of byParent.get(parent.id) ?? []) {
        const childSnap = byId.get(childId);
        if (!childSnap) continue;
        const childType = parseOrgNodeType(childSnap.data()?.type);
        if (childType !== "sub_agency") continue;
        const path = [...parent.path, childId];
        const depth = ORG_TYPE_DEPTH.sub_agency;
        const parentId = parent.id;
        const data = childSnap.data() ?? {};
        const needsUpdate =
          Number(data.depth) !== depth ||
          String(data.parentId ?? "") !== parentId ||
          JSON.stringify(Array.isArray(data.path) ? data.path : []) !==
            JSON.stringify(path);
        if (needsUpdate) {
          await childSnap.ref.update({
            parentId,
            depth,
            path,
            updatedAt: FieldValue.serverTimestamp(),
          });
          moved += 1;
        }
        queue.push({ id: childId, path });
      }
    }
  }

  // Reassign users on legacy nodes to nearest agency / sub_agency ancestor.
  const liveAssignable = new Set(
    all.docs
      .filter((d) => {
        const t = parseOrgNodeType(d.data()?.type);
        return t === "agency" || t === "sub_agency";
      })
      .map((d) => d.id),
  );

  for (const legacyId of legacyIds) {
    const legacyDoc = byId.get(legacyId);
    if (!legacyDoc) continue;
    const path: string[] = Array.isArray(legacyDoc.data()?.path)
      ? legacyDoc.data()!.path.map(String)
      : [];
    let target: string | null = null;
    for (let i = path.length - 1; i >= 0; i -= 1) {
      const id = path[i]!;
      if (id === legacyId) continue;
      if (liveAssignable.has(id)) {
        target = id;
        break;
      }
    }
    if (!target) {
      // Fallback: walk parentId chain using in-memory graph.
      let cursor =
        legacyDoc.data()?.parentId == null || legacyDoc.data()?.parentId === ""
          ? null
          : String(legacyDoc.data()?.parentId);
      while (cursor) {
        if (liveAssignable.has(cursor)) {
          target = cursor;
          break;
        }
        const parentDoc = byId.get(cursor);
        if (!parentDoc) break;
        cursor =
          parentDoc.data()?.parentId == null || parentDoc.data()?.parentId === ""
            ? null
            : String(parentDoc.data()?.parentId);
      }
    }
    if (!target) continue;

    const userSnap = await db
      .collection("users")
      .where("orgNodeId", "==", legacyId)
      .limit(500)
      .get();
    for (const userDoc of userSnap.docs) {
      await userDoc.ref.update({
        orgNodeId: target,
        updatedAt: FieldValue.serverTimestamp(),
      });
      usersReassigned += 1;
    }
  }

  return {
    ok: true,
    moved,
    deactivatedLegacy,
    usersReassigned,
    rootId,
  };
});

export const adminSendNotification = onCall(
  callableWithEmailOpts,
  async (request) => {
    const actorUid = await requireCaller(request, "adminSendNotification");
    const actor = await requireAdminStaff(actorUid);
    if (!canManagePlatform(actor.role)) {
      throw new HttpsError("permission-denied", "Admins only.");
    }

    const title = String(request.data?.title ?? "").trim().slice(0, 120);
    const body = String(request.data?.body ?? "").trim().slice(0, 500);
    const href = String(request.data?.href ?? "/notifications").trim().slice(0, 400);
    const audience = String(request.data?.audience ?? "all").trim();
    if (!title || !body) {
      throw new HttpsError("invalid-argument", "title and body required");
    }

    const targetUids = new Set<string>();
    if (audience === "uids" && Array.isArray(request.data?.uids)) {
      for (const id of request.data.uids.map(String).slice(0, 200)) {
        if (id) targetUids.add(id);
      }
    } else if (audience === "role") {
      const role = parseRole(request.data?.role);
      const snap = await db
        .collection("users")
        .where("role", "==", role)
        .where("isAnonymous", "==", false)
        .limit(500)
        .get();
      for (const doc of snap.docs) {
        if (String(doc.data()?.approvalStatus ?? "approved") === "approved") {
          targetUids.add(doc.id);
        }
      }
    } else if (audience === "org") {
      const orgNodeId = String(request.data?.orgNodeId ?? "").trim();
      if (!orgNodeId) {
        throw new HttpsError("invalid-argument", "orgNodeId required");
      }
      const snap = await db
        .collection("users")
        .where("orgNodeId", "==", orgNodeId)
        .limit(500)
        .get();
      for (const doc of snap.docs) targetUids.add(doc.id);
    } else {
      const snap = await db
        .collection("users")
        .where("isAnonymous", "==", false)
        .limit(1000)
        .get();
      for (const doc of snap.docs) {
        const data = doc.data();
        if (String(data.approvalStatus ?? "approved") !== "approved") continue;
        if (String(data.accountStatus ?? "active") !== "active") continue;
        targetUids.add(doc.id);
      }
    }

    let sent = 0;
    let failed = 0;
    const deepLink = `everybenefits://notifications`;
    const uids = [...targetUids];
    const CHUNK = 50;
    for (let i = 0; i < uids.length; i += CHUNK) {
      const chunk = uids.slice(i, i + CHUNK);
      const results = await Promise.allSettled(
        chunk.map((uid) =>
          notifyUser(uid, {
            type: "admin_broadcast",
            title,
            body,
            href: href.startsWith("/") ? href : `/${href}`,
            deepLink,
            ref: { source: "admin", actorId: actorUid },
            actorId: actorUid,
          }),
        ),
      );
      for (const result of results) {
        if (result.status === "fulfilled") sent += 1;
        else failed += 1;
      }
    }
    return { sent, failed, total: targetUids.size };
  },
);

export const onUserPendingApproval = onDocumentWritten(
  {
    document: "users/{uid}",
    region: "us-central1",
    ...emailSecretsOpts,
  },
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;
    const before = event.data?.before;
    const afterStatus = String(after.data()?.approvalStatus ?? "");
    const beforeStatus = before?.exists
      ? String(before.data()?.approvalStatus ?? "")
      : "";
    if (afterStatus !== "pending" || beforeStatus === "pending") return;

    const uid = event.params.uid;
    const data = after.data() ?? {};
    const displayName =
      typeof data.displayName === "string" && data.displayName.trim()
        ? data.displayName.trim()
        : typeof data.email === "string"
          ? data.email
          : uid;
    const email = typeof data.email === "string" ? data.email : "";

    const admins = await db
      .collection("users")
      .where("role", "==", "admin")
      .where("isAnonymous", "==", false)
      .limit(100)
      .get();

    const approvalsUrl = `${ADMIN_WEB_URL}/en/approvals`;
    for (const adminDoc of admins.docs) {
      if (adminDoc.id === uid) continue;
      await notifyUser(
        adminDoc.id,
        {
          type: "registration_pending",
          title: "New registration pending",
          body: `${displayName} is waiting for approval`,
          href: approvalsUrl,
          deepLink: "everybenefits://admin/approvals",
          ref: { userId: uid },
          actorId: uid,
          actorName: displayName,
          force: true,
        },
      ).catch(() => undefined);

      const adminEmail =
        typeof adminDoc.data()?.email === "string"
          ? String(adminDoc.data()!.email)
          : "";
      if (adminEmail) {
        await sendTransactionalEmail({
          to: adminEmail,
          subject: `Approval needed: ${displayName}`,
          html: `<p><strong>${displayName}</strong>${
            email ? ` (${email})` : ""
          } registered and is waiting for approval.</p><p><a href="${approvalsUrl}">Open Approvals</a></p>`,
          text: `${displayName} registered and needs approval. ${approvalsUrl}`,
        }).catch(() => undefined);
      }
    }
  },
);

export const createUserInvite = onCall(
  callableWithEmailOpts,
  async (request) => {
    const actorUid = await requireCaller(request, "createUserInvite");
    const actor = await requireAdminStaff(actorUid);
    if (!canManagePlatform(actor.role)) {
      throw new HttpsError("permission-denied", "Admins only.");
    }

    const email = String(request.data?.email ?? "")
      .trim()
      .toLowerCase();
    const role = parseRole(request.data?.role ?? "agent");
    const displayName = String(request.data?.displayName ?? "").trim().slice(0, 80);
    const orgNodeIdRaw = request.data?.orgNodeId;
    const orgNodeId =
      orgNodeIdRaw == null || orgNodeIdRaw === ""
        ? null
        : String(orgNodeIdRaw);
    const locale = String(request.data?.locale ?? "en").trim() === "es" ? "es" : "en";

    if (!email || !email.includes("@")) {
      throw new HttpsError("invalid-argument", "Valid email required.");
    }
    if (role === "guest") {
      throw new HttpsError("invalid-argument", "Cannot invite as guest.");
    }

    let userRecord: UserRecord;
    try {
      userRecord = await auth.createUser({
        email,
        emailVerified: false,
        displayName: displayName || undefined,
        disabled: false,
      });
    } catch (error: unknown) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code: unknown }).code)
          : "";
      if (code === "auth/email-already-exists") {
        throw new HttpsError(
          "already-exists",
          "A user with this email already exists.",
        );
      }
      throw error;
    }

    let agencyName: string | null = null;
    if (orgNodeId) {
      const node = await db.doc(`orgNodes/${orgNodeId}`).get();
      if (!node.exists) {
        await auth.deleteUser(userRecord.uid).catch(() => undefined);
        throw new HttpsError("not-found", "Org node not found.");
      }
      agencyName =
        typeof node.data()?.name === "string" ? String(node.data()!.name) : null;
    }

    await db.doc(`users/${userRecord.uid}`).set(
      {
        email,
        displayName: displayName || null,
        photoUrl: null,
        role,
        isAnonymous: false,
        profileCompleted: false,
        approvalStatus: "approved",
        accountStatus: "active",
        inviteStatus: "pending",
        orgNodeId,
        agency: agencyName,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        invitedBy: actorUid,
      },
      { merge: true },
    );

    const token = randomBytes(32).toString("base64url");
    const expiresAt = Timestamp.fromMillis(Date.now() + INVITE_TTL_MS);
    await db.doc(`userInvites/${token}`).set({
      uid: userRecord.uid,
      email,
      role,
      orgNodeId,
      createdBy: actorUid,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
      used: false,
    });

    const inviteUrl = `${PULSE_WEB_URL}/${locale}/invite/${token}`;
    await sendTransactionalEmail({
      to: email,
      subject: "You're invited to Every Benefits Pulse",
      html: `<p>You've been invited to Pulse${
        displayName ? `, ${displayName}` : ""
      }.</p><p><a href="${inviteUrl}">Complete your account</a></p><p>This link expires in 7 days.</p>`,
      text: `Complete your Pulse account: ${inviteUrl}`,
    });

    return { uid: userRecord.uid, inviteUrl, email };
  },
);

export const getInvite = onCall(callableOpts, async (request) => {
  const token = String(request.data?.token ?? "").trim();
  if (token.length < 20) {
    throw new HttpsError("invalid-argument", "Invalid invite token.");
  }
  const snap = await db.doc(`userInvites/${token}`).get();
  if (!snap.exists) throw new HttpsError("not-found", "Invite not found.");
  const data = snap.data() ?? {};
  if (data.used === true) {
    throw new HttpsError("failed-precondition", "Invite already used.");
  }
  const expiresAt = data.expiresAt as Timestamp | undefined;
  if (!expiresAt || expiresAt.toMillis() < Date.now()) {
    throw new HttpsError("failed-precondition", "Invite expired.");
  }
  return {
    email: String(data.email ?? ""),
    role: parseRole(data.role),
    displayNameHint: null as string | null,
    requiresNpn: parseRole(data.role) === "agent",
  };
});

export const completeInvite = onCall(callableOpts, async (request) => {
  const token = String(request.data?.token ?? "").trim();
  const password = String(request.data?.password ?? "");
  const displayName = String(request.data?.displayName ?? "").trim().slice(0, 80);
  const phoneCountryCode = String(request.data?.phoneCountryCode ?? "").trim();
  const phoneNumber = String(request.data?.phoneNumber ?? "").trim();
  const npn = String(request.data?.npn ?? "").trim().slice(0, 40);

  if (token.length < 20) {
    throw new HttpsError("invalid-argument", "Invalid invite token.");
  }
  if (password.length < 8) {
    throw new HttpsError("invalid-argument", "Password must be at least 8 characters.");
  }
  if (!displayName) {
    throw new HttpsError("invalid-argument", "Display name required.");
  }

  const inviteRef = db.doc(`userInvites/${token}`);
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists) throw new HttpsError("not-found", "Invite not found.");
  const invite = inviteSnap.data() ?? {};
  if (invite.used === true) {
    throw new HttpsError("failed-precondition", "Invite already used.");
  }
  const expiresAt = invite.expiresAt as Timestamp | undefined;
  if (!expiresAt || expiresAt.toMillis() < Date.now()) {
    throw new HttpsError("failed-precondition", "Invite expired.");
  }

  const uid = String(invite.uid ?? "");
  if (!uid) throw new HttpsError("failed-precondition", "Invite is incomplete.");

  const role = parseRole(invite.role);
  if (role === "agent" && !npn) {
    throw new HttpsError("invalid-argument", "NPN required for agents.");
  }

  await auth.updateUser(uid, {
    password,
    displayName,
    emailVerified: true,
  });

  await db.doc(`users/${uid}`).set(
    {
      displayName,
      phoneCountryCode: phoneCountryCode || null,
      phoneNumber: phoneNumber || null,
      npn: npn || null,
      profileCompleted: true,
      inviteStatus: "completed",
      approvalStatus: "approved",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await inviteRef.update({
    used: true,
    usedAt: FieldValue.serverTimestamp(),
  });

  const customToken = await auth.createCustomToken(uid, {
    invite: true,
  });
  return { ok: true, uid, customToken };
});
