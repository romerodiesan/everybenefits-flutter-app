import { describe, expect, it } from "vitest";
import {
  buildLessonFunnel,
  buildPortfolioStudents,
  buildProgressBuckets,
  buildQuizStats,
  computeCourseKpis,
  countInProgress,
  countStalled,
  countUniqueActiveStudents,
  filterByLearnerStatus,
  filterByRange,
  medianDaysToComplete,
  progressBucket,
  stuckOnQuiz,
  topDropOffs,
  type InsightsEnrollment,
  type InsightsLesson,
} from "@pulse/insights-metrics";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 6, 30);

function enrollment(
  partial: Partial<InsightsEnrollment> & { uid: string },
): InsightsEnrollment {
  return {
    completedLessonIds: [],
    lastLessonId: null,
    enrolledAtMs: NOW - 10 * DAY,
    updatedAtMs: NOW - 2 * DAY,
    completedAtMs: null,
    quizAttempts: {},
    ...partial,
  };
}

describe("progressBucket", () => {
  it("maps percentages to buckets", () => {
    expect(progressBucket([], 4)).toBe("0");
    expect(progressBucket(["a"], 4)).toBe("1-25");
    expect(progressBucket(["a", "b"], 4)).toBe("26-50");
    expect(progressBucket(["a", "b", "c"], 4)).toBe("51-75");
    expect(progressBucket(["a", "b", "c"], 5)).toBe("51-75");
    expect(progressBucket(["a", "b", "c", "d"], 4)).toBe("100");
  });
});

describe("buildProgressBuckets", () => {
  it("counts all buckets", () => {
    const rows = [
      enrollment({ uid: "1", completedLessonIds: [] }),
      enrollment({ uid: "2", completedLessonIds: ["a"] }),
      enrollment({ uid: "3", completedLessonIds: ["a", "b", "c", "d"] }),
    ];
    const buckets = buildProgressBuckets(rows, 4);
    expect(buckets.find((b) => b.id === "0")?.count).toBe(1);
    expect(buckets.find((b) => b.id === "1-25")?.count).toBe(1);
    expect(buckets.find((b) => b.id === "100")?.count).toBe(1);
  });
});

describe("filterByRange / stalled / median", () => {
  it("filters by enrolledAt", () => {
    const rows = [
      enrollment({ uid: "old", enrolledAtMs: NOW - 100 * DAY }),
      enrollment({ uid: "new", enrolledAtMs: NOW - 3 * DAY }),
    ];
    expect(filterByRange(rows, 7, NOW)).toHaveLength(1);
    expect(filterByRange(rows, null, NOW)).toHaveLength(2);
  });

  it("detects stalled learners", () => {
    const rows = [
      enrollment({ uid: "ok", updatedAtMs: NOW - 2 * DAY }),
      enrollment({ uid: "stale", updatedAtMs: NOW - 20 * DAY }),
      enrollment({
        uid: "done",
        updatedAtMs: NOW - 40 * DAY,
        completedAtMs: NOW - 30 * DAY,
      }),
    ];
    expect(countStalled(rows, 14, NOW)).toBe(1);
  });

  it("computes median days to complete", () => {
    const rows = [
      enrollment({
        uid: "a",
        enrolledAtMs: NOW - 10 * DAY,
        completedAtMs: NOW - 5 * DAY,
      }),
      enrollment({
        uid: "b",
        enrolledAtMs: NOW - 20 * DAY,
        completedAtMs: NOW - 10 * DAY,
      }),
      enrollment({
        uid: "c",
        enrolledAtMs: NOW - 6 * DAY,
        completedAtMs: NOW - 3 * DAY,
      }),
    ];
    expect(medianDaysToComplete(rows)).toBe(5);
  });
});

describe("funnel and quizzes", () => {
  const lessons: InsightsLesson[] = [
    { id: "l1", title: "Intro", moduleId: "m1", order: 0, type: "video" },
    { id: "l2", title: "Quiz A", moduleId: "m1", order: 1, type: "quiz" },
    { id: "l3", title: "Outro", moduleId: "m1", order: 2, type: "reading" },
  ];

  it("builds funnel with drop-off", () => {
    const rows = [
      enrollment({ uid: "1", completedLessonIds: ["l1", "l2", "l3"] }),
      enrollment({ uid: "2", completedLessonIds: ["l1"] }),
      enrollment({ uid: "3", completedLessonIds: ["l1"] }),
    ];
    const funnel = buildLessonFunnel(lessons, rows);
    expect(funnel[0]!.completedCount).toBe(3);
    expect(funnel[1]!.completedCount).toBe(1);
    expect(funnel[1]!.dropFromPrev).toBeCloseTo(2 / 3);
    expect(topDropOffs(funnel, 1)[0]!.lessonId).toBe("l2");
  });

  it("builds quiz stats and stuck list", () => {
    const rows = [
      enrollment({
        uid: "1",
        quizAttempts: { l2: { score: 80, passed: true, atMs: NOW } },
        completedLessonIds: ["l2"],
      }),
      enrollment({
        uid: "2",
        quizAttempts: { l2: { score: 40, passed: false, atMs: NOW } },
        completedLessonIds: [],
      }),
    ];
    const stats = buildQuizStats(lessons, rows);
    expect(stats[0]!.attempts).toBe(2);
    expect(stats[0]!.passRate).toBe(0.5);
    expect(stats[0]!.avgScore).toBe(60);
    expect(stuckOnQuiz(lessons, rows)).toEqual([
      { uid: "2", lessonId: "l2", lessonTitle: "Quiz A", score: 40 },
    ]);
  });

  it("computes course KPIs", () => {
    const rows = [
      enrollment({
        uid: "1",
        enrolledAtMs: NOW - 5 * DAY,
        updatedAtMs: NOW - 1 * DAY,
        completedAtMs: NOW - 1 * DAY,
        completedLessonIds: ["a", "b", "c", "d"],
      }),
      enrollment({
        uid: "2",
        enrolledAtMs: NOW - 5 * DAY,
        updatedAtMs: NOW - 20 * DAY,
        completedLessonIds: ["a"],
      }),
      enrollment({
        uid: "2",
        enrolledAtMs: NOW - 5 * DAY,
        updatedAtMs: NOW - 1 * DAY,
        completedLessonIds: ["a", "b"],
      }),
    ];
    // Note: two rows share uid "2" — unique active still counts once across courses
    // when using countUniqueActiveStudents on a flat list.
    const kpis = computeCourseKpis(rows, null, NOW, 4);
    expect(kpis.enrolled).toBe(3);
    expect(kpis.completed).toBe(1);
    expect(kpis.inProgress).toBe(2);
    expect(kpis.completionRate).toBeCloseTo(1 / 3);
    expect(kpis.stalled).toBe(1);
    expect(kpis.avgProgress).toBeCloseTo((0.25 + 0.5) / 2);
  });
});

describe("unique active students and portfolio", () => {
  it("counts unique in-progress UIDs once", () => {
    const rows = [
      enrollment({ uid: "a", completedLessonIds: ["x"] }),
      enrollment({ uid: "a", completedLessonIds: ["y"] }),
      enrollment({
        uid: "b",
        completedAtMs: NOW - 1 * DAY,
        completedLessonIds: ["x", "y", "z", "w"],
      }),
      enrollment({ uid: "c" }),
    ];
    expect(countUniqueActiveStudents(rows)).toBe(2);
    expect(countInProgress(rows)).toBe(3);
  });

  it("builds portfolio students excluding fully completed learners", () => {
    const portfolio = buildPortfolioStudents(
      [
        {
          enrollment: enrollment({
            uid: "a",
            completedLessonIds: ["l1"],
            updatedAtMs: NOW - 2 * DAY,
          }),
          courseId: "c1",
          title: "Course 1",
          lessonCount: 4,
        },
        {
          enrollment: enrollment({
            uid: "a",
            completedLessonIds: ["l1", "l2"],
            updatedAtMs: NOW - 1 * DAY,
          }),
          courseId: "c2",
          title: "Course 2",
          lessonCount: 4,
        },
        {
          enrollment: enrollment({
            uid: "b",
            completedAtMs: NOW - 1 * DAY,
            completedLessonIds: ["l1", "l2", "l3", "l4"],
          }),
          courseId: "c1",
          title: "Course 1",
          lessonCount: 4,
        },
        {
          enrollment: enrollment({
            uid: "c",
            updatedAtMs: NOW - 20 * DAY,
            completedLessonIds: [],
          }),
          courseId: "c1",
          title: "Course 1",
          lessonCount: 4,
        },
      ],
      NOW,
    );
    expect(portfolio).toHaveLength(2);
    const a = portfolio.find((row) => row.uid === "a");
    expect(a?.coursesInProgress).toBe(2);
    expect(a?.avgProgress).toBeCloseTo((0.25 + 0.5) / 2);
    expect(a?.atRisk).toBe(false);
    const c = portfolio.find((row) => row.uid === "c");
    expect(c?.atRisk).toBe(true);
    expect(c?.coursesInProgress).toBe(1);
  });

  it("filters learners by status", () => {
    const rows = [
      enrollment({ uid: "done", completedAtMs: NOW - 1 * DAY }),
      enrollment({ uid: "ok", updatedAtMs: NOW - 1 * DAY }),
      enrollment({ uid: "risk", updatedAtMs: NOW - 20 * DAY }),
    ];
    expect(filterByLearnerStatus(rows, "completed", NOW)).toHaveLength(1);
    expect(filterByLearnerStatus(rows, "inProgress", NOW)).toHaveLength(2);
    expect(filterByLearnerStatus(rows, "atRisk", NOW)).toHaveLength(1);
    expect(filterByLearnerStatus(rows, "all", NOW)).toHaveLength(3);
  });
});
