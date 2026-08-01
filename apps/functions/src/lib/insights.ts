/** Academy insights aggregations for Studio (Admin SDK). */
import { FieldPath, Timestamp, getFirestore } from "firebase-admin/firestore";
import {
  buildLessonFunnel,
  buildPortfolioStudents,
  buildProgressBuckets,
  buildQuizStats,
  computeCourseKpis,
  filterByLearnerStatus,
  filterByRange,
  isStalled,
  progressPercent,
  stuckOnQuiz,
  topDropOffs,
  type InsightsEnrollment,
  type InsightsLesson,
  type LearnerStatusFilter,
} from "@pulse/insights-metrics";

function db() {
  return getFirestore();
}

function tsMillis(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis: unknown }).toMillis === "function"
  ) {
    return (value as Timestamp).toMillis();
  }
  return null;
}

function parseEnrollment(
  uid: string,
  data: Record<string, unknown>,
): InsightsEnrollment {
  const quizRaw =
    data.quizAttempts && typeof data.quizAttempts === "object"
      ? (data.quizAttempts as Record<string, unknown>)
      : {};
  const quizAttempts: InsightsEnrollment["quizAttempts"] = {};
  for (const [lessonId, raw] of Object.entries(quizRaw)) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    quizAttempts[lessonId] = {
      score: Number(row.score ?? 0),
      passed: row.passed === true,
      atMs: tsMillis(row.at),
    };
  }
  return {
    uid,
    completedLessonIds: Array.isArray(data.completedLessonIds)
      ? data.completedLessonIds.map(String)
      : [],
    lastLessonId:
      typeof data.lastLessonId === "string" ? data.lastLessonId : null,
    enrolledAtMs: tsMillis(data.enrolledAt),
    updatedAtMs: tsMillis(data.updatedAt),
    completedAtMs: tsMillis(data.completedAt),
    quizAttempts,
  };
}

async function loadCourseEnrollments(
  courseId: string,
  limit = 500,
): Promise<InsightsEnrollment[]> {
  const snap = await db()
    .collectionGroup("enrollments")
    .where("courseId", "==", courseId)
    .limit(limit)
    .get();

  const rows: InsightsEnrollment[] = [];
  for (const doc of snap.docs) {
    const uid = doc.ref.parent.parent?.id;
    if (!uid) continue;
    rows.push(parseEnrollment(uid, doc.data() as Record<string, unknown>));
  }
  console.info(
    JSON.stringify({
      scale: "loadCourseEnrollments",
      courseId,
      docsRead: snap.size,
      limit,
    }),
  );
  return rows;
}

export async function listCourseStudentsPage(opts: {
  courseId: string;
  limit?: number;
  cursor?: string | null;
}): Promise<{
  students: Array<{
    uid: string;
    enrollment: {
      courseId: string;
      completedLessonIds: string[];
      lastLessonId: string | null;
      lastPositionSeconds: number;
      enrolledAtMs: number | null;
      updatedAtMs: number | null;
      completedAtMs: number | null;
    };
  }>;
  nextCursor: string | null;
}> {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
  let q = db()
    .collectionGroup("enrollments")
    .where("courseId", "==", opts.courseId)
    .orderBy(FieldPath.documentId())
    .limit(limit + 1);

  // Cursor is enrollment doc path users/{uid}/enrollments/{courseId}
  if (opts.cursor) {
    const cursorSnap = await db().doc(opts.cursor).get();
    if (cursorSnap.exists) {
      q = q.startAfter(cursorSnap);
    }
  }

  const snap = await q.get();
  const docs = snap.docs.slice(0, limit);
  const students = docs.map((doc) => {
    const uid = doc.ref.parent.parent?.id ?? "";
    const data = doc.data() as Record<string, unknown>;
    return {
      uid,
      enrollment: {
        courseId: String(data.courseId ?? opts.courseId),
        completedLessonIds: Array.isArray(data.completedLessonIds)
          ? data.completedLessonIds.map(String)
          : [],
        lastLessonId:
          typeof data.lastLessonId === "string" ? data.lastLessonId : null,
        lastPositionSeconds: Number(data.lastPositionSeconds ?? 0),
        enrolledAtMs: tsMillis(data.enrolledAt),
        updatedAtMs: tsMillis(data.updatedAt),
        completedAtMs: tsMillis(data.completedAt),
      },
    };
  });
  const nextCursor =
    snap.docs.length > limit ? docs[docs.length - 1]?.ref.path ?? null : null;
  return { students, nextCursor };
}

async function loadCourseLessons(courseId: string): Promise<InsightsLesson[]> {
  const lessonsSnap = await db()
    .collection(`courses/${courseId}/lessons`)
    .orderBy("order", "asc")
    .get();

  return lessonsSnap.docs.map((lesson, index) => {
    const data = lesson.data();
    const typeRaw = String(data.type ?? "video");
    const type =
      typeRaw === "quiz" || typeRaw === "reading" || typeRaw === "video"
        ? typeRaw
        : "video";
    return {
      id: lesson.id,
      title: String(data.title ?? "Lesson"),
      moduleId: String(data.moduleId ?? ""),
      order: Number(data.order ?? index),
      type,
    };
  });
}

async function loadProfiles(
  uids: string[],
): Promise<
  Record<
    string,
    {
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
      role: string;
    }
  >
> {
  const out: Record<
    string,
    {
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
      role: string;
    }
  > = {};
  const unique = [...new Set(uids)].slice(0, 500);
  const chunkSize = 100;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const refs = chunk.map((uid) => db().doc(`users/${uid}`));
    const snaps = await db().getAll(...refs);
    for (const snap of snaps) {
      if (!snap.exists) {
        out[snap.id] = {
          displayName: null,
          email: null,
          photoUrl: null,
          role: "guest",
        };
        continue;
      }
      const data = snap.data() ?? {};
      out[snap.id] = {
        displayName:
          typeof data.displayName === "string" ? data.displayName : null,
        email: typeof data.email === "string" ? data.email : null,
        photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
        role: String(data.role ?? "student"),
      };
    }
  }
  return out;
}

export type CourseInsightsPayload = {
  courseId: string;
  title: string;
  status: string;
  lessonCount: number;
  rangeDays: number | null;
  kpis: ReturnType<typeof computeCourseKpis>;
  progressBuckets: ReturnType<typeof buildProgressBuckets>;
  lessonFunnel: ReturnType<typeof buildLessonFunnel>;
  dropOffs: ReturnType<typeof topDropOffs>;
  quizStats: ReturnType<typeof buildQuizStats>;
  stuckOnQuiz: Array<{
    uid: string;
    displayName: string | null;
    lessonId: string;
    lessonTitle: string;
    score: number;
  }>;
  learners: Array<{
    uid: string;
    displayName: string | null;
    email: string | null;
    photoUrl: string | null;
    role: string;
    progress: number;
    completedLessonCount: number;
    lastLessonId: string | null;
    enrolledAtMs: number | null;
    updatedAtMs: number | null;
    completedAtMs: number | null;
    stalled: boolean;
  }>;
  /** Offset cursor into range-scoped learners; null when no further page. */
  nextLearnerCursor: string | null;
  generatedAt: number;
};

export async function buildCourseInsights(opts: {
  courseId: string;
  rangeDays: number | null;
  nowMs?: number;
  learnerLimit?: number;
  /** Offset into range-scoped learners (stringified number). */
  learnerCursor?: string | null;
  learnerStatus?: LearnerStatusFilter;
}): Promise<CourseInsightsPayload> {
  const { courseId, rangeDays } = opts;
  const nowMs = opts.nowMs ?? Date.now();
  // 0 = KPI/charts only (learners table fetches its own pages).
  const learnerLimit = Math.min(200, Math.max(0, opts.learnerLimit ?? 100));
  const learnerOffset = Math.max(
    0,
    Math.round(Number(opts.learnerCursor ?? 0)) || 0,
  );
  const learnerStatus: LearnerStatusFilter = opts.learnerStatus ?? "all";

  const courseSnap = await db().doc(`courses/${courseId}`).get();
  if (!courseSnap.exists) {
    throw new Error("COURSE_NOT_FOUND");
  }
  const course = courseSnap.data() ?? {};
  const lessonCount = Number(course.lessonCount ?? 0);

  const [allEnrollments, lessons] = await Promise.all([
    loadCourseEnrollments(courseId, 500),
    loadCourseLessons(courseId),
  ]);

  const resolvedLessonCount = lessonCount || lessons.length;

  // Range filters enrollments for KPIs / charts; learners table uses same scope.
  const scoped = filterByRange(allEnrollments, rangeDays, nowMs);
  const kpis = computeCourseKpis(
    allEnrollments,
    rangeDays,
    nowMs,
    resolvedLessonCount,
  );
  const funnel = buildLessonFunnel(lessons, scoped);
  const quizStats = buildQuizStats(lessons, scoped);
  const stuckRaw = stuckOnQuiz(lessons, scoped).slice(0, 50);
  const learnersScoped = filterByLearnerStatus(
    scoped,
    learnerStatus,
    nowMs,
  );
  const learnersSlice =
    learnerLimit > 0
      ? learnersScoped.slice(learnerOffset, learnerOffset + learnerLimit)
      : [];
  const nextLearnerCursor =
    learnerLimit > 0 && learnerOffset + learnerLimit < learnersScoped.length
      ? String(learnerOffset + learnerLimit)
      : null;
  const profiles = await loadProfiles([
    ...learnersSlice.map((row) => row.uid),
    ...stuckRaw.map((row) => row.uid),
  ]);
  const stuck = stuckRaw.map((row) => ({
    ...row,
    displayName: profiles[row.uid]?.displayName ?? null,
  }));

  const learners = learnersSlice.map((row) => {
    const profile = profiles[row.uid];
    return {
      uid: row.uid,
      displayName: profile?.displayName ?? null,
      email: profile?.email ?? null,
      photoUrl: profile?.photoUrl ?? null,
      role: profile?.role ?? "student",
      progress: progressPercent(row.completedLessonIds, resolvedLessonCount),
      completedLessonCount: row.completedLessonIds.length,
      lastLessonId: row.lastLessonId,
      enrolledAtMs: row.enrolledAtMs,
      updatedAtMs: row.updatedAtMs,
      completedAtMs: row.completedAtMs,
      stalled: isStalled(row, 14, nowMs),
    };
  });

  return {
    courseId,
    title: String(course.title ?? "Course"),
    status: String(course.status ?? "draft"),
    lessonCount: resolvedLessonCount,
    rangeDays,
    kpis,
    progressBuckets: buildProgressBuckets(scoped, resolvedLessonCount),
    lessonFunnel: funnel,
    dropOffs: topDropOffs(funnel, 5),
    quizStats,
    stuckOnQuiz: stuck,
    learners,
    nextLearnerCursor,
    generatedAt: nowMs,
  };
}

export type CatalogCourseRow = {
  courseId: string;
  title: string;
  status: string;
  enrolled: number;
  inProgress: number;
  completed: number;
  completionRate: number;
  quizAvgPassRate: number | null;
  stalled: number;
  studentCount: number;
  activeStudentCount: number;
  avgProgress: number;
};

export type CatalogStudentRow = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoUrl: string | null;
  coursesInProgress: number;
  avgProgress: number;
  updatedAtMs: number | null;
  atRisk: boolean;
  courses: Array<{
    courseId: string;
    title: string;
    progress: number;
    stalled: boolean;
    completedAtMs: number | null;
  }>;
};

export type CatalogInsightsPayload = {
  kpis: {
    activeStudents: number;
    avgCompletionRate: number;
    avgProgress: number;
    atRiskLearners: number;
    /** Lifetime enrollments across courses (not unique people). */
    totalEnrollments: number;
    coursesWithLearners: number;
  };
  courses: CatalogCourseRow[];
  students: CatalogStudentRow[];
  attention: {
    dropOffs: Array<{
      courseId: string;
      courseTitle: string;
      lessonId: string;
      lessonTitle: string;
      dropFromPrev: number;
    }>;
    weakQuizzes: Array<{
      courseId: string;
      courseTitle: string;
      lessonId: string;
      lessonTitle: string;
      passRate: number;
      attempts: number;
    }>;
  };
  paths: Array<{
    pathId: string;
    title: string;
    courseIds: string[];
    learnersCompletedAll: number;
    learnersStartedAny: number;
    completionRate: number;
  }>;
  generatedAt: number;
};

export async function buildCatalogInsights(opts: {
  courseIds: string[];
  pathSummaries?: Array<{
    pathId: string;
    title: string;
    courseIds: string[];
  }>;
  nowMs?: number;
}): Promise<CatalogInsightsPayload> {
  const nowMs = opts.nowMs ?? Date.now();
  const courseIds = [...new Set(opts.courseIds)].slice(0, 100);
  const courses: CatalogCourseRow[] = [];
  const dropOffs: CatalogInsightsPayload["attention"]["dropOffs"] = [];
  const weakQuizzes: CatalogInsightsPayload["attention"]["weakQuizzes"] = [];
  const portfolioRows: Array<{
    enrollment: InsightsEnrollment;
    courseId: string;
    title: string;
    lessonCount: number;
  }> = [];

  let totalEnrollments = 0;
  let completionSum = 0;
  let coursesWithLearners = 0;
  let atRiskLearners = 0;
  let progressSum = 0;
  let progressCount = 0;
  const activeUids = new Set<string>();

  for (const courseId of courseIds) {
    const courseSnap = await db().doc(`courses/${courseId}`).get();
    if (!courseSnap.exists) continue;
    const course = courseSnap.data() ?? {};
    const title = String(course.title ?? "Course");
    const status = String(course.status ?? "draft");
    const studentCount = Number(course.studentCount ?? 0);
    const lessonCount = Number(course.lessonCount ?? 0);

    const statsSnap = await db()
      .doc(`courses/${courseId}/stats/summary`)
      .get();
    const stats = statsSnap.data() ?? {};
    const statsEnrolled = Number(stats.enrolled ?? 0);
    const statsCompleted = Number(stats.completed ?? 0);

    const [enrollments, lessons] = await Promise.all([
      loadCourseEnrollments(courseId, 200),
      loadCourseLessons(courseId),
    ]);
    const resolvedLessonCount = lessonCount || lessons.length;
    const kpis = computeCourseKpis(
      enrollments,
      null,
      nowMs,
      resolvedLessonCount,
    );
    const enrolled = statsEnrolled || kpis.enrolled || studentCount;
    const completed = statsCompleted || kpis.completed;
    const inProgress =
      course.activeStudentCount != null
        ? Number(course.activeStudentCount)
        : kpis.inProgress;
    const completionRate = enrolled > 0 ? completed / enrolled : 0;
    const quizStats = buildQuizStats(lessons, enrollments);
    const funnel = buildLessonFunnel(lessons, enrollments);
    const quizAvg =
      quizStats.length > 0
        ? quizStats.reduce((sum, q) => sum + q.passRate, 0) / quizStats.length
        : null;

    for (const row of enrollments) {
      portfolioRows.push({
        enrollment: row,
        courseId,
        title,
        lessonCount: resolvedLessonCount,
      });
      if (row.completedAtMs == null) {
        activeUids.add(row.uid);
        progressSum += progressPercent(
          row.completedLessonIds,
          resolvedLessonCount,
        );
        progressCount += 1;
      }
    }

    courses.push({
      courseId,
      title,
      status,
      enrolled,
      inProgress,
      completed,
      completionRate,
      quizAvgPassRate: quizAvg,
      stalled: kpis.stalled,
      studentCount: studentCount || enrolled,
      activeStudentCount: inProgress,
      avgProgress: kpis.avgProgress,
    });

    totalEnrollments += enrolled;
    if (enrolled > 0) {
      coursesWithLearners += 1;
      completionSum += completionRate;
    }
    atRiskLearners += kpis.stalled;

    for (const row of topDropOffs(funnel, 2)) {
      if (row.dropFromPrev == null || row.dropFromPrev < 0.15) continue;
      dropOffs.push({
        courseId,
        courseTitle: title,
        lessonId: row.lessonId,
        lessonTitle: row.title,
        dropFromPrev: row.dropFromPrev,
      });
    }
    for (const quiz of quizStats) {
      if (quiz.attempts < 2 || quiz.passRate >= 0.6) continue;
      weakQuizzes.push({
        courseId,
        courseTitle: title,
        lessonId: quiz.lessonId,
        lessonTitle: quiz.title,
        passRate: quiz.passRate,
        attempts: quiz.attempts,
      });
    }
  }

  dropOffs.sort((a, b) => b.dropFromPrev - a.dropFromPrev);
  weakQuizzes.sort((a, b) => a.passRate - b.passRate);

  const portfolio = buildPortfolioStudents(portfolioRows, nowMs);
  const profiles = await loadProfiles(portfolio.map((row) => row.uid));
  const students: CatalogStudentRow[] = portfolio.map((row) => {
    const profile = profiles[row.uid];
    return {
      uid: row.uid,
      displayName: profile?.displayName ?? null,
      email: profile?.email ?? null,
      photoUrl: profile?.photoUrl ?? null,
      coursesInProgress: row.coursesInProgress,
      avgProgress: row.avgProgress,
      updatedAtMs: row.updatedAtMs,
      atRisk: row.atRisk,
      courses: row.courses,
    };
  });

  const pathSummaries = (opts.pathSummaries ?? []).slice(0, 5);
  const paths: CatalogInsightsPayload["paths"] = [];

  for (const path of pathSummaries) {
    const ids = path.courseIds.filter(Boolean).slice(0, 20);
    if (ids.length === 0) {
      paths.push({
        pathId: path.pathId,
        title: path.title,
        courseIds: ids,
        learnersCompletedAll: 0,
        learnersStartedAny: 0,
        completionRate: 0,
      });
      continue;
    }

    const completedByCourse: Array<Set<string>> = [];
    const started = new Set<string>();
    for (const courseId of ids) {
      const enrollments = await loadCourseEnrollments(courseId, 150);
      const completed = new Set<string>();
      for (const row of enrollments) {
        started.add(row.uid);
        if (row.completedAtMs != null) completed.add(row.uid);
      }
      completedByCourse.push(completed);
    }

    let completedAll = 0;
    if (completedByCourse.length > 0) {
      const [first, ...rest] = completedByCourse;
      for (const uid of first!) {
        if (rest.every((set) => set.has(uid))) completedAll += 1;
      }
    }

    paths.push({
      pathId: path.pathId,
      title: path.title,
      courseIds: ids,
      learnersCompletedAll: completedAll,
      learnersStartedAny: started.size,
      completionRate: started.size > 0 ? completedAll / started.size : 0,
    });
  }

  return {
    kpis: {
      activeStudents: activeUids.size,
      avgCompletionRate:
        coursesWithLearners > 0 ? completionSum / coursesWithLearners : 0,
      avgProgress: progressCount > 0 ? progressSum / progressCount : 0,
      atRiskLearners,
      totalEnrollments,
      coursesWithLearners,
    },
    courses,
    students,
    attention: {
      dropOffs: dropOffs.slice(0, 8),
      weakQuizzes: weakQuizzes.slice(0, 8),
    },
    paths,
    generatedAt: nowMs,
  };
}

export async function assertCanViewCourseInsights(
  actorUid: string,
  courseCreatedBy: string,
  actorRole: string,
): Promise<boolean> {
  if (actorRole === "admin") return true;
  return courseCreatedBy === actorUid;
}
