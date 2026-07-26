import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onValueWritten } from "firebase-functions/v2/database";
import { setGlobalOptions } from "firebase-functions/v2";

admin.initializeApp({
  databaseURL: "https://every-insurance-default-rtdb.firebaseio.com",
});
setGlobalOptions({ region: "us-central1", maxInstances: 20 });

/** Gen2 callables need explicit CORS for browser (e.g. localhost webapp). */
const callableOpts = {
  cors: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://every-insurance.web.app",
    "https://every-insurance.firebaseapp.com",
    ...(process.env.FUNCTIONS_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ],
  enforceAppCheck: true,
  // Auth is enforced inside the handler; Cloud Run must allow the OPTIONS preflight.
  invoker: "public" as const,
};

const db = admin.firestore();
const rtdb = admin.database();

const DEFAULT_AGENT_GROUP_ID = "agents-default";
/** Synthetic sender for automated support replies; never a real account. */
const SUPPORT_AI_UID = "support-ai";
const MAX_SUPPORT_MESSAGE_CHARS = 2000;
const FORUM_ROLES = ["student", "agent", "instructor", "manager", "admin"];
/** Mirrors QUIZ_DEFAULT_PASS_PERCENT / kQuizDefaultPassPercent in the clients. */
const DEFAULT_QUIZ_PASS_PERCENT = 70;
/** Upper bound on option indexes, so a hostile payload can't balloon a set. */
const MAX_QUIZ_OPTIONS = 20;
/** Roles that belong in the default staff community chat. */
const DEFAULT_GROUP_ROLES = ["agent", "instructor", "manager", "admin"];
const GROUP_CREATOR_ROLES = ["instructor", "manager", "admin"];
const MAX_GROUP_MEMBERS = 20;
const MAX_FUNCTION_CALLS_PER_MINUTE = 30;

type VoteValue = -1 | 0 | 1;

function parseVote(raw: unknown): VoteValue {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (n === -1 || n === 0 || n === 1) return n as VoteValue;
  throw new HttpsError("invalid-argument", "vote must be -1, 0, or 1");
}

function headlineName(data: admin.firestore.DocumentData | undefined): string {
  const display =
    typeof data?.displayName === "string" ? data.displayName.trim() : "";
  if (display) return display;
  const email = typeof data?.email === "string" ? data.email.trim() : "";
  if (email) return email;
  return "Usuario";
}

function belongsInDefaultGroup(role: string): boolean {
  return DEFAULT_GROUP_ROLES.includes(role);
}

async function consumeFunctionQuota(uid: string, operation: string) {
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
        expiresAt: admin.firestore.Timestamp.fromMillis(
          (minute + 2) * 60_000,
        ),
      },
      { merge: true },
    );
  });
}

async function requireCaller(
  request: { auth?: { uid: string } },
  operation: string,
): Promise<string> {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  await consumeFunctionQuota(uid, operation);
  return uid;
}

function chatInboxRow(
  chatId: string,
  chat: Record<string, unknown>,
  uid: string,
) {
  const members = Object.keys((chat.members ?? {}) as Record<string, unknown>)
    .filter((memberId) => memberId !== SUPPORT_AI_UID);
  const unreadCounts =
    (chat.unreadCounts ?? {}) as Record<string, unknown>;
  const pinnedBy = (chat.pinnedBy ?? {}) as Record<string, unknown>;
  return {
    chatId,
    memberIds: members,
    memberNames: (chat.memberNames ?? {}) as Record<string, unknown>,
    isGroup: chat.isGroup === true,
    title: chat.title ?? null,
    dmKey: chat.dmKey ?? null,
    lastMessage: String(chat.lastMessage ?? "").slice(0, 4000),
    lastMessageAt: Number(chat.lastMessageAt ?? 0),
    lastMessageSenderId: chat.lastMessageSenderId ?? null,
    unreadCount: Number(unreadCounts[uid] ?? 0),
    pinned: pinnedBy[uid] === true,
    createdAt: Number(chat.createdAt ?? 0),
    createdBy: String(chat.createdBy ?? ""),
    isDefaultAgentGroup: chat.isDefaultAgentGroup === true,
    isSupportChat: chat.isSupportChat === true,
  };
}

async function addAgentToDefaultGroup(uid: string, displayName: string) {
  const chatRef = rtdb.ref(`chats/${DEFAULT_AGENT_GROUP_ID}`);
  const now = Date.now();

  await chatRef.transaction((current) => {
    if (current === null) {
      return {
        members: { [uid]: true },
        memberNames: { [uid]: displayName },
        isGroup: true,
        isDefaultAgentGroup: true,
        title: "Team",
        dmKey: null,
        lastMessage: "",
        lastMessageAt: now,
        lastMessageSenderId: null,
        unreadCounts: { [uid]: 0 },
        pinnedBy: {},
        createdAt: now,
        createdBy: "system",
      };
    }

    const members =
      current.members && typeof current.members === "object"
        ? { ...current.members }
        : {};
    if (members[uid] === true) {
      return; // abort — already a member
    }
    members[uid] = true;
    const memberNames =
      current.memberNames && typeof current.memberNames === "object"
        ? { ...current.memberNames, [uid]: displayName }
        : { [uid]: displayName };
    const unreadCounts =
      current.unreadCounts && typeof current.unreadCounts === "object"
        ? { ...current.unreadCounts, [uid]: 0 }
        : { [uid]: 0 };

    return {
      ...current,
      members,
      memberNames,
      unreadCounts,
      isGroup: true,
      isDefaultAgentGroup: true,
      // Keep existing custom title; migrate legacy "Agents" label.
      title:
        current.title === "Agents" || current.title == null
          ? "Team"
          : current.title,
      createdBy: current.createdBy ?? "system",
    };
  });

  await rtdb.ref(`userChats/${uid}/${DEFAULT_AGENT_GROUP_ID}`).set({
    lastMessageAt: now,
  });
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

export const syncChatInbox = onValueWritten(
  { ref: "/chats/{chatId}", region: "us-central1" },
  async (event) => {
    const chatId = event.params.chatId;
    const before = (event.data.before.val() ?? {}) as Record<string, unknown>;
    const after = (event.data.after.val() ?? {}) as Record<string, unknown>;
    const beforeMembers = Object.keys(
      (before.members ?? {}) as Record<string, unknown>,
    );
    const members = Object.keys((after.members ?? {}) as Record<string, unknown>)
      .filter((uid) => uid !== SUPPORT_AI_UID);
    const removed = beforeMembers.filter(
      (uid) => uid !== SUPPORT_AI_UID && !members.includes(uid),
    );
    const updates: Record<string, unknown> = {};

    for (const uid of removed) updates[`userChats/${uid}/${chatId}`] = null;
    if (event.data.after.exists()) {
      for (const uid of members) {
        updates[`userChats/${uid}/${chatId}`] = chatInboxRow(chatId, after, uid);
      }
    }
    if (Object.keys(updates).length) await rtdb.ref().update(updates);
  },
);

export const rebuildChatInbox = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "rebuildChatInbox");
  const index = await rtdb.ref(`userChats/${uid}`).get();
  const chatIds = Object.keys((index.val() ?? {}) as Record<string, unknown>);
  const updates: Record<string, unknown> = {};
  await Promise.all(
    chatIds.slice(0, 100).map(async (chatId) => {
      const chat = await rtdb.ref(`chats/${chatId}`).get();
      const value = chat.val() as Record<string, unknown> | null;
      if (value?.members &&
          (value.members as Record<string, unknown>)[uid] === true) {
        updates[`userChats/${uid}/${chatId}`] = chatInboxRow(chatId, value, uid);
      }
    }),
  );
  if (Object.keys(updates).length) await rtdb.ref().update(updates);
  return { ok: true };
});

export const createGroupChat = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "createGroupChat");
  const title = String(request.data?.title ?? "").trim();
  const requested = Array.isArray(request.data?.memberIds)
    ? request.data.memberIds.map(String)
    : [];
  const memberIds = [...new Set([uid, ...requested])]
    .filter((id) => id && id !== SUPPORT_AI_UID);
  if (!title || title.length > 120) {
    throw new HttpsError("invalid-argument", "Valid group title required.");
  }
  if (memberIds.length < 2 || memberIds.length > MAX_GROUP_MEMBERS) {
    throw new HttpsError("invalid-argument", "Group must have 2–20 members.");
  }
  const creator = await db.doc(`users/${uid}`).get();
  if (!GROUP_CREATOR_ROLES.includes(String(creator.data()?.role ?? ""))) {
    throw new HttpsError("permission-denied", "Not allowed to create groups.");
  }
  const profiles = await db.getAll(
    ...memberIds.map((memberId) => db.doc(`users/${memberId}`)),
  );
  if (profiles.some((profile) => !profile.exists)) {
    throw new HttpsError("failed-precondition", "Unknown group member.");
  }
  const memberNames = Object.fromEntries(
    profiles.map((profile) => [profile.id, headlineName(profile.data())]),
  );
  const now = Date.now();
  const chatRef = rtdb.ref("chats").push();
  const chatId = chatRef.key!;
  await chatRef.set({
    members: Object.fromEntries(memberIds.map((id) => [id, true])),
    memberNames,
    isGroup: true,
    title,
    dmKey: null,
    lastMessage: "",
    lastMessageAt: now,
    lastMessageSenderId: null,
    unreadCounts: Object.fromEntries(memberIds.map((id) => [id, 0])),
    pinnedBy: {},
    createdAt: now,
    createdBy: uid,
    isDefaultAgentGroup: false,
    isSupportChat: false,
  });
  return { chatId, createdAt: now };
});

export const enrollInCourse = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "enrollInCourse");
  const courseId = String(request.data?.courseId ?? "");
  if (!courseId) throw new HttpsError("invalid-argument", "courseId required");
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
      updatedAt: FieldValue.serverTimestamp(),
    });
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
  });
  return { ok: true };
});

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
  if (!FORUM_ROLES.includes(String(user.role))) {
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
    !FORUM_ROLES.includes(String(profile.role))
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
  if (actor.data()?.role !== "admin" && reply.data()?.authorId !== uid) {
    throw new HttpsError("permission-denied", "Not allowed to delete this reply.");
  }
  const remaining = await db
    .collection(`threads/${threadId}/replies`)
    .orderBy("createdAt", "desc")
    .limit(2)
    .get();
  const latest = remaining.docs.find((doc) => doc.id !== replyId);
  const batch = db.batch();
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

/**
 * Admin-only role assignment.
 * Staff roles (agent / instructor / manager / admin) join the default group.
 */
export const setUserRole = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "setUserRole");
  const targetUid = String(request.data?.uid ?? "");
  const role = String(request.data?.role ?? "");
  const allowed = [
    "guest",
    "student",
    "agent",
    "instructor",
    "manager",
    "admin",
  ];
  if (!targetUid || !allowed.includes(role)) {
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

  if (belongsInDefaultGroup(role)) {
    await addAgentToDefaultGroup(targetUid, headlineName(target.data()));
  }

  return { ok: true, uid: targetUid, role };
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

export const listPublicProfiles = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "listPublicProfiles");
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
    const role = String(actor.data()?.role ?? "");
    const owns = String(course.createdBy ?? "") === uid;
    if (role !== "admin" && !(owns && (role === "manager" || role === "admin"))) {
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
    const snap = await tx.get(enrollmentRef);
    if (!snap.exists) {
      throw new HttpsError("failed-precondition", "Enroll in the course first.");
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
  });

  return { score, passed, passPercent, correctByQuestion };
});

/**
 * Ensures the caller (staff) is a member of the default community RTDB chat.
 */
export const ensureDefaultAgentGroup = onCall(callableOpts, async (request) => {
  const callerUid = await requireCaller(request, "ensureDefaultAgentGroup");
  const targetUid = String(request.data?.uid ?? callerUid);

  const caller = await db.doc(`users/${callerUid}`).get();
  const callerRole = String(caller.data()?.role ?? "");
  if (targetUid !== callerUid && callerRole !== "admin") {
    throw new HttpsError("permission-denied", "Admins only for other users.");
  }

  const target = await db.doc(`users/${targetUid}`).get();
  if (!target.exists) {
    throw new HttpsError("not-found", "User not found.");
  }
  const targetRole = String(target.data()?.role ?? "");
  if (!belongsInDefaultGroup(targetRole)) {
    throw new HttpsError(
      "failed-precondition",
      "Agents, instructors, managers, and admins only.",
    );
  }

  await addAgentToDefaultGroup(targetUid, headlineName(target.data()));
  return { ok: true, uid: targetUid, chatId: DEFAULT_AGENT_GROUP_ID };
});

/**
 * Writes an automated reply from the support bot.
 *
 * RTDB rules deny clients any write whose `senderId` is not their own uid, so
 * this callable is the only path that can post as `support-ai`. A caller may
 * only trigger it inside their own support thread.
 */
export const postSupportAiMessage = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "postSupportAiMessage");
  const chatId = String(request.data?.chatId ?? "");
  const body = String(request.data?.body ?? "").trim();
  const senderName = "Pulse Support";

  if (chatId !== `support_${uid}`) {
    throw new HttpsError("permission-denied", "Not your support chat.");
  }
  if (!body) {
    throw new HttpsError("invalid-argument", "Message body is required.");
  }
  if (body.length > MAX_SUPPORT_MESSAGE_CHARS) {
    throw new HttpsError("invalid-argument", "Message is too long.");
  }

  const chatRef = rtdb.ref(`chats/${chatId}`);
  const chatSnap = await chatRef.get();
  const chat = chatSnap.val();
  if (!chat || chat.isSupportChat !== true) {
    throw new HttpsError("not-found", "Support chat not found.");
  }
  if (chat.members?.[uid] !== true) {
    throw new HttpsError("permission-denied", "Not a member of this chat.");
  }

  const now = Date.now();
  const messageRef = rtdb.ref(`messages/${chatId}`).push();
  await messageRef.set({
    body,
    senderId: SUPPORT_AI_UID,
    senderName: senderName || "Support",
    createdAt: now,
    sharedPost: null,
    isAi: true,
  });

  const unreadCounts: Record<string, number> = {
    ...(chat.unreadCounts ?? {}),
  };
  for (const memberId of Object.keys(chat.members ?? {})) {
    unreadCounts[memberId] =
      memberId === SUPPORT_AI_UID ? 0 : (unreadCounts[memberId] ?? 0) + 1;
  }

  await rtdb.ref().update({
    [`chats/${chatId}/lastMessage`]: body,
    [`chats/${chatId}/lastMessageAt`]: now,
    [`chats/${chatId}/lastMessageSenderId`]: SUPPORT_AI_UID,
    [`chats/${chatId}/unreadCounts`]: unreadCounts,
    [`chats/${chatId}/memberNames/${SUPPORT_AI_UID}`]: senderName || "Support",
    [`userChats/${uid}/${chatId}/lastMessageAt`]: now,
  });

  return { id: messageRef.key, createdAt: now };
});
