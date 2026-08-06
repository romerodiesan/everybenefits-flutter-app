import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { canAuthorCourses, parseRole } from "@pulse/shared";
import { db, callableOpts } from "./init";
import { DEFAULT_QUIZ_PASS_PERCENT, MAX_QUIZ_OPTIONS } from "./constants";
import { requireCaller } from "./auth";
import { notifyUser } from "./notifications";

/** Normalizes a submitted answer into a sorted, deduped list of option indexes. */
export function parseSelectedOptions(raw: unknown): number[] {
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

export function sameOptionSet(expected: number[], given: number[]): boolean {
  if (expected.length !== given.length) return false;
  return expected.every((value, index) => value === given[index]);
}

export const enrollInCourse = onCall(callableOpts, async (request) => {
  const uid = await requireCaller(request, "enrollInCourse");
  const courseId = String(request.data?.courseId ?? "");
  if (!courseId) throw new HttpsError("invalid-argument", "courseId required");

  const userSnap = await db.doc(`users/${uid}`).get();
  const user = userSnap.data();
  if (!user || user.isAnonymous === true || user.role === "guest") {
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
      maxPositionSeconds: 0,
      watchSeconds: 0,
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
  // Best-effort rollup bump for Studio dashboards.
  await db
    .doc(`courses/${courseId}/analytics/summary`)
    .set(
      {
        schemaVersion: 1,
        enrolled: FieldValue.increment(1),
        "window28d.enrolled": FieldValue.increment(1),
        "window7d.enrolled": FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    .catch(() => undefined);
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
    const prevMax = Math.max(0, Number(data.maxPositionSeconds ?? 0));
    const maxPositionSeconds = Math.max(prevMax, positionSeconds);
    // Approximate incremental watch when the playhead advances forward.
    const prevPos =
      data.lastLessonId === lessonId
        ? Math.max(0, Number(data.lastPositionSeconds ?? 0))
        : 0;
    const delta =
      positionSeconds > prevPos
        ? Math.min(120, positionSeconds - prevPos)
        : 0;
    const watchSeconds =
      Math.max(0, Number(data.watchSeconds ?? 0)) + delta;
    tx.set(
      enrollmentRef,
      {
        completedLessonIds,
        lastLessonId: lessonId,
        lastPositionSeconds: positionSeconds,
        maxPositionSeconds,
        watchSeconds,
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

    await Promise.all(
      [...uids].map((uid) =>
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
  },
);
