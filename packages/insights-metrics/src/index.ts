/**
 * Pure Academy insights metrics — no Firebase imports.
 * Shared by Studio UI and Cloud Functions.
 */

export type InsightsEnrollment = {
  uid: string;
  completedLessonIds: string[];
  lastLessonId: string | null;
  enrolledAtMs: number | null;
  updatedAtMs: number | null;
  completedAtMs: number | null;
  quizAttempts: Record<
    string,
    { score: number; passed: boolean; atMs: number | null }
  >;
};

export type InsightsLesson = {
  id: string;
  title: string;
  moduleId: string;
  order: number;
  type: "video" | "reading" | "quiz";
};

export type ProgressBucketId =
  | "0"
  | "1-25"
  | "26-50"
  | "51-75"
  | "76-99"
  | "100";

export const PROGRESS_BUCKETS: ProgressBucketId[] = [
  "0",
  "1-25",
  "26-50",
  "51-75",
  "76-99",
  "100",
];

export function progressPercent(
  completedLessonIds: string[],
  lessonCount: number,
): number {
  if (lessonCount <= 0) return 0;
  return Math.min(1, completedLessonIds.length / lessonCount);
}

export function progressBucket(
  completedLessonIds: string[],
  lessonCount: number,
): ProgressBucketId {
  const pct = progressPercent(completedLessonIds, lessonCount) * 100;
  if (pct <= 0) return "0";
  if (pct >= 100) return "100";
  if (pct <= 25) return "1-25";
  if (pct <= 50) return "26-50";
  if (pct <= 75) return "51-75";
  return "76-99";
}

export function buildProgressBuckets(
  enrollments: InsightsEnrollment[],
  lessonCount: number,
): Array<{ id: ProgressBucketId; count: number }> {
  const counts: Record<ProgressBucketId, number> = {
    "0": 0,
    "1-25": 0,
    "26-50": 0,
    "51-75": 0,
    "76-99": 0,
    "100": 0,
  };
  for (const row of enrollments) {
    counts[progressBucket(row.completedLessonIds, lessonCount)] += 1;
  }
  return PROGRESS_BUCKETS.map((id) => ({ id, count: counts[id] }));
}

export function filterByRange(
  enrollments: InsightsEnrollment[],
  rangeDays: number | null,
  nowMs = Date.now(),
): InsightsEnrollment[] {
  if (rangeDays == null || rangeDays <= 0) return enrollments;
  const cutoff = nowMs - rangeDays * 24 * 60 * 60 * 1000;
  return enrollments.filter((row) => {
    const ts = row.enrolledAtMs ?? row.updatedAtMs;
    return ts != null && ts >= cutoff;
  });
}

/** Active = touched (updatedAt) within range; if no range, updated in last 30d. */
export function countActive(
  enrollments: InsightsEnrollment[],
  rangeDays: number | null,
  nowMs = Date.now(),
): number {
  const windowDays = rangeDays && rangeDays > 0 ? rangeDays : 30;
  const cutoff = nowMs - windowDays * 24 * 60 * 60 * 1000;
  return enrollments.filter(
    (row) => row.updatedAtMs != null && row.updatedAtMs >= cutoff,
  ).length;
}

export function countCompleted(enrollments: InsightsEnrollment[]): number {
  return enrollments.filter((row) => row.completedAtMs != null).length;
}

/** In progress = enrolled and not yet completed. */
export function countInProgress(enrollments: InsightsEnrollment[]): number {
  return enrollments.filter((row) => row.completedAtMs == null).length;
}

/** Unique UIDs with at least one in-progress enrollment. */
export function countUniqueActiveStudents(
  enrollments: InsightsEnrollment[],
): number {
  const uids = new Set<string>();
  for (const row of enrollments) {
    if (row.completedAtMs == null) uids.add(row.uid);
  }
  return uids.size;
}

/** Mean progress (0–1) across in-progress enrollments only. */
export function avgProgressInProgress(
  enrollments: InsightsEnrollment[],
  lessonCount: number,
): number {
  const open = enrollments.filter((row) => row.completedAtMs == null);
  if (open.length === 0) return 0;
  const sum = open.reduce(
    (acc, row) => acc + progressPercent(row.completedLessonIds, lessonCount),
    0,
  );
  return sum / open.length;
}

export function isStalled(
  row: InsightsEnrollment,
  stalledDays = 14,
  nowMs = Date.now(),
): boolean {
  if (row.completedAtMs != null) return false;
  if (row.updatedAtMs == null) return true;
  return nowMs - row.updatedAtMs > stalledDays * 24 * 60 * 60 * 1000;
}

export function countStalled(
  enrollments: InsightsEnrollment[],
  stalledDays = 14,
  nowMs = Date.now(),
): number {
  return enrollments.filter((row) => isStalled(row, stalledDays, nowMs)).length;
}

export type LearnerStatusFilter =
  | "all"
  | "inProgress"
  | "completed"
  | "atRisk";

export function filterByLearnerStatus(
  enrollments: InsightsEnrollment[],
  status: LearnerStatusFilter,
  nowMs = Date.now(),
  stalledDays = 14,
): InsightsEnrollment[] {
  if (status === "all") return enrollments;
  if (status === "completed") {
    return enrollments.filter((row) => row.completedAtMs != null);
  }
  if (status === "atRisk") {
    return enrollments.filter((row) => isStalled(row, stalledDays, nowMs));
  }
  return enrollments.filter((row) => row.completedAtMs == null);
}

export type PortfolioStudentCourse = {
  courseId: string;
  title: string;
  progress: number;
  stalled: boolean;
  completedAtMs: number | null;
};

export type PortfolioStudentRow = {
  uid: string;
  coursesInProgress: number;
  avgProgress: number;
  updatedAtMs: number | null;
  atRisk: boolean;
  courses: PortfolioStudentCourse[];
};

/**
 * Group enrollments by uid for portfolio student progress.
 * Only students with ≥1 in-progress course are included.
 */
export function buildPortfolioStudents(
  rows: Array<{
    enrollment: InsightsEnrollment;
    courseId: string;
    title: string;
    lessonCount: number;
  }>,
  nowMs = Date.now(),
): PortfolioStudentRow[] {
  const byUid = new Map<
    string,
    {
      courses: PortfolioStudentCourse[];
      progressSum: number;
      inProgressCount: number;
      updatedAtMs: number | null;
      atRisk: boolean;
    }
  >();

  for (const row of rows) {
    const { enrollment, courseId, title, lessonCount } = row;
    const progress = progressPercent(
      enrollment.completedLessonIds,
      lessonCount,
    );
    const stalled = isStalled(enrollment, 14, nowMs);
    const courseRow: PortfolioStudentCourse = {
      courseId,
      title,
      progress,
      stalled,
      completedAtMs: enrollment.completedAtMs,
    };
    let entry = byUid.get(enrollment.uid);
    if (!entry) {
      entry = {
        courses: [],
        progressSum: 0,
        inProgressCount: 0,
        updatedAtMs: null,
        atRisk: false,
      };
      byUid.set(enrollment.uid, entry);
    }
    entry.courses.push(courseRow);
    if (enrollment.completedAtMs == null) {
      entry.inProgressCount += 1;
      entry.progressSum += progress;
      if (stalled) entry.atRisk = true;
    }
    const updated = enrollment.updatedAtMs;
    if (
      updated != null &&
      (entry.updatedAtMs == null || updated > entry.updatedAtMs)
    ) {
      entry.updatedAtMs = updated;
    }
  }

  const out: PortfolioStudentRow[] = [];
  for (const [uid, entry] of byUid) {
    if (entry.inProgressCount === 0) continue;
    out.push({
      uid,
      coursesInProgress: entry.inProgressCount,
      avgProgress: entry.progressSum / entry.inProgressCount,
      updatedAtMs: entry.updatedAtMs,
      atRisk: entry.atRisk,
      courses: entry.courses,
    });
  }
  out.sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0));
  return out;
}

export function medianDaysToComplete(
  enrollments: InsightsEnrollment[],
): number | null {
  const days: number[] = [];
  for (const row of enrollments) {
    if (row.completedAtMs == null || row.enrolledAtMs == null) continue;
    const delta = row.completedAtMs - row.enrolledAtMs;
    if (delta < 0) continue;
    days.push(delta / (24 * 60 * 60 * 1000));
  }
  if (days.length === 0) return null;
  days.sort((a, b) => a - b);
  const mid = Math.floor(days.length / 2);
  if (days.length % 2 === 0) {
    return (days[mid - 1]! + days[mid]!) / 2;
  }
  return days[mid]!;
}

export type LessonFunnelRow = {
  lessonId: string;
  title: string;
  moduleId: string;
  type: InsightsLesson["type"];
  completedCount: number;
  rate: number;
  dropFromPrev: number | null;
};

export function buildLessonFunnel(
  lessons: InsightsLesson[],
  enrollments: InsightsEnrollment[],
): LessonFunnelRow[] {
  const enrolled = enrollments.length;
  const ordered = [...lessons].sort((a, b) => a.order - b.order);
  let prevRate: number | null = null;
  return ordered.map((lesson) => {
    const completedCount = enrollments.filter((row) =>
      row.completedLessonIds.includes(lesson.id),
    ).length;
    const rate = enrolled > 0 ? completedCount / enrolled : 0;
    const dropFromPrev =
      prevRate == null ? null : Math.max(0, prevRate - rate);
    prevRate = rate;
    return {
      lessonId: lesson.id,
      title: lesson.title,
      moduleId: lesson.moduleId,
      type: lesson.type,
      completedCount,
      rate,
      dropFromPrev,
    };
  });
}

export function topDropOffs(
  funnel: LessonFunnelRow[],
  limit = 5,
): LessonFunnelRow[] {
  return [...funnel]
    .filter((row) => row.dropFromPrev != null && row.dropFromPrev > 0)
    .sort((a, b) => (b.dropFromPrev ?? 0) - (a.dropFromPrev ?? 0))
    .slice(0, limit);
}

export type QuizStatRow = {
  lessonId: string;
  title: string;
  attempts: number;
  passed: number;
  passRate: number;
  avgScore: number | null;
};

export function buildQuizStats(
  lessons: InsightsLesson[],
  enrollments: InsightsEnrollment[],
): QuizStatRow[] {
  return lessons
    .filter((lesson) => lesson.type === "quiz")
    .map((lesson) => {
      const attempts = enrollments
        .map((row) => row.quizAttempts[lesson.id])
        .filter(Boolean) as Array<{ score: number; passed: boolean }>;
      const passed = attempts.filter((a) => a.passed).length;
      const avgScore =
        attempts.length > 0
          ? attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length
          : null;
      return {
        lessonId: lesson.id,
        title: lesson.title,
        attempts: attempts.length,
        passed,
        passRate: attempts.length > 0 ? passed / attempts.length : 0,
        avgScore,
      };
    });
}

export function stuckOnQuiz(
  lessons: InsightsLesson[],
  enrollments: InsightsEnrollment[],
): Array<{ uid: string; lessonId: string; lessonTitle: string; score: number }> {
  const quizzes = lessons.filter((l) => l.type === "quiz");
  const out: Array<{
    uid: string;
    lessonId: string;
    lessonTitle: string;
    score: number;
  }> = [];
  for (const row of enrollments) {
    if (row.completedAtMs != null) continue;
    for (const quiz of quizzes) {
      const attempt = row.quizAttempts[quiz.id];
      if (!attempt || attempt.passed) continue;
      if (row.completedLessonIds.includes(quiz.id)) continue;
      out.push({
        uid: row.uid,
        lessonId: quiz.id,
        lessonTitle: quiz.title,
        score: attempt.score,
      });
    }
  }
  return out;
}

export type CourseKpis = {
  enrolled: number;
  /** Recently touched (updatedAt within range / 30d). */
  active: number;
  /** Not yet completed (business “student” for a course). */
  inProgress: number;
  completed: number;
  completionRate: number;
  medianDaysToComplete: number | null;
  stalled: number;
  /** Mean progress of in-progress enrollments (0–1). */
  avgProgress: number;
};

export function computeCourseKpis(
  enrollments: InsightsEnrollment[],
  rangeDays: number | null,
  nowMs = Date.now(),
  lessonCount = 0,
): CourseKpis {
  const scoped = filterByRange(enrollments, rangeDays, nowMs);
  const enrolled = scoped.length;
  const completed = countCompleted(scoped);
  return {
    enrolled,
    active: countActive(scoped, rangeDays, nowMs),
    inProgress: countInProgress(scoped),
    completed,
    completionRate: enrolled > 0 ? completed / enrolled : 0,
    medianDaysToComplete: medianDaysToComplete(scoped),
    stalled: countStalled(scoped, 14, nowMs),
    avgProgress: avgProgressInProgress(scoped, lessonCount),
  };
}
