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
    quizAttempts: Record<string, {
        score: number;
        passed: boolean;
        atMs: number | null;
    }>;
};
export type InsightsLesson = {
    id: string;
    title: string;
    moduleId: string;
    order: number;
    type: "video" | "reading" | "quiz";
};
export type ProgressBucketId = "0" | "1-25" | "26-50" | "51-75" | "76-99" | "100";
export declare const PROGRESS_BUCKETS: ProgressBucketId[];
export declare function progressPercent(completedLessonIds: string[], lessonCount: number): number;
export declare function progressBucket(completedLessonIds: string[], lessonCount: number): ProgressBucketId;
export declare function buildProgressBuckets(enrollments: InsightsEnrollment[], lessonCount: number): Array<{
    id: ProgressBucketId;
    count: number;
}>;
export declare function filterByRange(enrollments: InsightsEnrollment[], rangeDays: number | null, nowMs?: number): InsightsEnrollment[];
/** Active = touched (updatedAt) within range; if no range, updated in last 30d. */
export declare function countActive(enrollments: InsightsEnrollment[], rangeDays: number | null, nowMs?: number): number;
export declare function countCompleted(enrollments: InsightsEnrollment[]): number;
/** In progress = enrolled and not yet completed. */
export declare function countInProgress(enrollments: InsightsEnrollment[]): number;
/** Unique UIDs with at least one in-progress enrollment. */
export declare function countUniqueActiveStudents(enrollments: InsightsEnrollment[]): number;
/** Mean progress (0–1) across in-progress enrollments only. */
export declare function avgProgressInProgress(enrollments: InsightsEnrollment[], lessonCount: number): number;
export declare function isStalled(row: InsightsEnrollment, stalledDays?: number, nowMs?: number): boolean;
export declare function countStalled(enrollments: InsightsEnrollment[], stalledDays?: number, nowMs?: number): number;
export type LearnerStatusFilter = "all" | "inProgress" | "completed" | "atRisk";
export declare function filterByLearnerStatus(enrollments: InsightsEnrollment[], status: LearnerStatusFilter, nowMs?: number, stalledDays?: number): InsightsEnrollment[];
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
export declare function buildPortfolioStudents(rows: Array<{
    enrollment: InsightsEnrollment;
    courseId: string;
    title: string;
    lessonCount: number;
}>, nowMs?: number): PortfolioStudentRow[];
export declare function medianDaysToComplete(enrollments: InsightsEnrollment[]): number | null;
export type LessonFunnelRow = {
    lessonId: string;
    title: string;
    moduleId: string;
    type: InsightsLesson["type"];
    completedCount: number;
    rate: number;
    dropFromPrev: number | null;
};
export declare function buildLessonFunnel(lessons: InsightsLesson[], enrollments: InsightsEnrollment[]): LessonFunnelRow[];
export declare function topDropOffs(funnel: LessonFunnelRow[], limit?: number): LessonFunnelRow[];
export type QuizStatRow = {
    lessonId: string;
    title: string;
    attempts: number;
    passed: number;
    passRate: number;
    avgScore: number | null;
};
export declare function buildQuizStats(lessons: InsightsLesson[], enrollments: InsightsEnrollment[]): QuizStatRow[];
export declare function stuckOnQuiz(lessons: InsightsLesson[], enrollments: InsightsEnrollment[]): Array<{
    uid: string;
    lessonId: string;
    lessonTitle: string;
    score: number;
}>;
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
export declare function computeCourseKpis(enrollments: InsightsEnrollment[], rangeDays: number | null, nowMs?: number, lessonCount?: number): CourseKpis;
