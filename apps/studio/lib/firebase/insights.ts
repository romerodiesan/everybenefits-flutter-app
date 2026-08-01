import { callCloudFunction } from "@pulse/firebase-client";
import type {
  ProgressBucketId,
  LessonFunnelRow,
  QuizStatRow,
  CourseKpis,
  LearnerStatusFilter,
} from "@pulse/insights-metrics";

export type InsightsRangeDays = 7 | 30 | 90 | null;

export type CourseInsightsLearner = {
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
};

export type CourseInsightsResult = {
  courseId: string;
  title: string;
  status: string;
  lessonCount: number;
  rangeDays: number | null;
  kpis: CourseKpis;
  progressBuckets: Array<{ id: ProgressBucketId; count: number }>;
  lessonFunnel: LessonFunnelRow[];
  dropOffs: LessonFunnelRow[];
  quizStats: QuizStatRow[];
  stuckOnQuiz: Array<{
    uid: string;
    displayName: string | null;
    lessonId: string;
    lessonTitle: string;
    score: number;
  }>;
  learners: CourseInsightsLearner[];
  nextLearnerCursor?: string | null;
  generatedAt: number;
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

export type CatalogInsightsResult = {
  kpis: {
    activeStudents: number;
    avgCompletionRate: number;
    avgProgress: number;
    atRiskLearners: number;
    totalEnrollments: number;
    coursesWithLearners: number;
  };
  courses: Array<{
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
  }>;
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

export async function fetchCourseInsights(
  courseId: string,
  rangeDays: InsightsRangeDays = null,
  opts?: {
    learnerLimit?: number;
    learnerCursor?: string | null;
    learnerStatus?: LearnerStatusFilter;
  },
): Promise<CourseInsightsResult> {
  return callCloudFunction<CourseInsightsResult>("getCourseInsights", {
    courseId,
    rangeDays: rangeDays == null ? "all" : rangeDays,
    learnerLimit: opts?.learnerLimit,
    learnerCursor: opts?.learnerCursor ?? undefined,
    learnerStatus: opts?.learnerStatus ?? "all",
  });
}

export async function fetchCatalogInsights(input: {
  courseIds: string[];
  paths?: Array<{ pathId: string; title: string; courseIds: string[] }>;
}): Promise<CatalogInsightsResult> {
  return callCloudFunction<CatalogInsightsResult>("getCatalogInsights", {
    courseIds: input.courseIds,
    paths: input.paths ?? [],
  });
}

export function learnersToCsv(learners: CourseInsightsLearner[]): string {
  const header = [
    "uid",
    "displayName",
    "email",
    "role",
    "progressPercent",
    "completedLessons",
    "enrolledAt",
    "updatedAt",
    "completedAt",
    "stalled",
  ];
  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  };
  const iso = (ms: number | null) =>
    ms == null ? "" : new Date(ms).toISOString();
  const lines = learners.map((row) =>
    [
      row.uid,
      row.displayName ?? "",
      row.email ?? "",
      row.role,
      String(Math.round(row.progress * 100)),
      String(row.completedLessonCount),
      iso(row.enrolledAtMs),
      iso(row.updatedAtMs),
      iso(row.completedAtMs),
      row.stalled ? "yes" : "no",
    ]
      .map(escape)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
