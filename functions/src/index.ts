import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
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
    /https:\/\/.*\.vercel\.app$/,
    /https:\/\/.*\.web\.app$/,
    /https:\/\/.*\.firebaseapp\.com$/,
  ],
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

/**
 * Trusted vote path: updates vote doc + score increment under Admin SDK.
 */
export const castForumVote = onCall(callableOpts, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const uid = request.auth.uid;
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
    } else {
      tx.set(
        voteRef,
        {
          value: next,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    tx.update(targetRef, {
      score: FieldValue.increment(delta),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true };
});

/**
 * Admin-only role assignment.
 * Staff roles (agent / instructor / manager / admin) join the default group.
 */
export const setUserRole = onCall(callableOpts, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const actorUid = request.auth.uid;
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
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const actor = await db.doc(`users/${request.auth.uid}`).get();
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
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const uid = request.auth.uid;
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
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const callerUid = request.auth.uid;
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
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const uid = request.auth.uid;
  const chatId = String(request.data?.chatId ?? "");
  const body = String(request.data?.body ?? "").trim();
  const senderName = String(request.data?.senderName ?? "Support").trim();

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
