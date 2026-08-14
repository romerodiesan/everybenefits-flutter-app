export type CourseLevel = "basic" | "intermediate" | "advanced";
/** Publication workflow: authors draft, admins publish. */
export type CourseStatus = "draft" | "pending" | "published";
export declare const COURSE_LEVELS: CourseLevel[];
export type Course = {
    id: string;
    title: string;
    description: string;
    /** Display label derived from selected instructors (comma-separated names). */
    teacherName: string;
    /** Auth uids of course instructors (stable order). */
    instructorIds: string[];
    level: CourseLevel;
    status: CourseStatus;
    coverPath: string | null;
    coverUrl: string | null;
    lessonCount: number;
    durationMinutes: number;
    studentCount: number;
    createdBy: string;
    createdAt: Date | null;
    updatedAt: Date | null;
    publishedAt: Date | null;
};
export type CourseModule = {
    id: string;
    title: string;
    order: number;
};
export type LessonType = "video" | "reading" | "quiz";
export declare const LESSON_TYPES: LessonType[];
export type QuizSelectionMode = "single" | "multi";
export type QuizQuestion = {
    id: string;
    prompt: string;
    selectionMode: QuizSelectionMode;
    options: string[];
};
/** Parses `m:ss` / `h:mm:ss` duration labels. */
export declare function parseClockDuration(raw: string): number | null;
/**
 * Reads a lesson's duration in seconds.
 * Some Studio docs stored minutes in `durationMinutes` (or duplicated that
 * value into `durationSeconds`); prefer a real second count when present.
 */
export declare function resolveLessonDurationSeconds(data: Record<string, unknown>): number;
export type Lesson = {
    id: string;
    moduleId: string;
    title: string;
    order: number;
    durationSeconds: number;
    type: LessonType;
    videoPath: string | null;
    videoUrl: string | null;
    /** Original upload filename when known (Studio display). */
    videoFileName: string | null;
    bodyMarkdown: string | null;
    questions: QuizQuestion[];
    passPercent: number;
    /** One of the course `instructorIds`, or null when unset/legacy. */
    instructorId: string | null;
};
export type QuizAnswerKey = Record<string, number[]>;
export type QuizAttemptResult = {
    score: number;
    passed: boolean;
    passPercent: number;
    correctByQuestion: Record<string, boolean>;
};
export type QuizAttempt = {
    score: number;
    passed: boolean;
    at: Date | null;
};
export type CourseContent = {
    modules: CourseModule[];
    lessons: Lesson[];
};
export type LearningPath = {
    id: string;
    title: string;
    description: string;
    level: CourseLevel;
    status: CourseStatus;
    courseIds: string[];
    order: number;
    createdBy: string;
};
export type Enrollment = {
    courseId: string;
    completedLessonIds: string[];
    lastLessonId: string | null;
    lastPositionSeconds: number;
    /** Furthest playhead observed for resume analytics. */
    maxPositionSeconds?: number;
    /** Approximate cumulative watch seconds for this enrollment. */
    watchSeconds?: number;
    enrolledAt: Date | null;
    updatedAt: Date | null;
    completedAt: Date | null;
    quizAttempts: Record<string, QuizAttempt>;
};
export type CourseStudent = {
    uid: string;
    enrollment: Enrollment;
};
export declare const LESSON_COMPLETE_THRESHOLD = 0.9;
export declare const QUIZ_DEFAULT_PASS_PERCENT = 70;
/** Bump when event payload or rollup shape changes incompatibly. */
export declare const ACADEMY_ANALYTICS_SCHEMA_VERSION = 1;
/** Minimum cohort size before audience breakdowns are shown (privacy). */
export declare const ANALYTICS_MIN_COHORT = 5;
/** Heartbeat / progress sample interval expected from clients (seconds). */
export declare const ANALYTICS_HEARTBEAT_SECONDS = 15;
export declare const ACADEMY_ANALYTICS_EVENT_NAMES: readonly ["course_impression", "course_open", "lesson_start", "lesson_heartbeat", "lesson_complete", "quiz_submit", "session_ping"];
export type AcademyAnalyticsEventName = (typeof ACADEMY_ANALYTICS_EVENT_NAMES)[number];
export declare const ACADEMY_ANALYTICS_SOURCES: readonly ["catalog", "search", "path", "notification", "direct", "share", "unknown"];
export type AcademyAnalyticsSource = (typeof ACADEMY_ANALYTICS_SOURCES)[number];
export declare const ACADEMY_ANALYTICS_PLATFORMS: readonly ["web", "ios", "android"];
export type AcademyAnalyticsPlatform = (typeof ACADEMY_ANALYTICS_PLATFORMS)[number];
/**
 * Client → trusted callable / GA custom event.
 * Never include uid, email, names, or free-text fields.
 */
export type AcademyAnalyticsEventInput = {
    name: AcademyAnalyticsEventName;
    courseId: string;
    lessonId?: string | null;
    sessionId: string;
    source?: AcademyAnalyticsSource;
    platform: AcademyAnalyticsPlatform;
    /** Absolute playhead for video lessons. */
    positionSeconds?: number;
    /** Declared lesson duration when known. */
    durationSeconds?: number;
    /** Incremental watch seconds since last heartbeat. */
    watchDeltaSeconds?: number;
    /** 0–100 bucket for audience retention histograms. */
    retentionBucket?: number;
    quizPassed?: boolean;
    quizScore?: number;
    locale?: string;
    /** Opaque referrer host or UTM source (no path/query with PII). */
    trafficSource?: string | null;
    clientEventId?: string | null;
};
/** `courses/{courseId}/analytics/summary` — lifetime + rolling windows. */
export type CourseAnalyticsSummary = {
    schemaVersion: number;
    enrolled: number;
    completed: number;
    completionRate: number;
    avgProgress: number;
    views: number;
    uniqueViewersApprox: number;
    watchSeconds: number;
    avgViewDurationSeconds: number;
    impressions: number;
    opens: number;
    quizAttempts: number;
    quizPasses: number;
    window28d: CourseAnalyticsWindow;
    window7d: CourseAnalyticsWindow;
    updatedAt: Date | null;
    /** Fraction of events with analytics consent / GA coverage. */
    coverageRate: number;
};
export type CourseAnalyticsWindow = {
    views: number;
    watchSeconds: number;
    enrolled: number;
    completed: number;
    impressions: number;
    opens: number;
};
/** `courses/{courseId}/analytics/realtime` — last ~60 minutes. */
export type CourseAnalyticsRealtime = {
    schemaVersion: number;
    activeSessions: number;
    viewsLast60m: number;
    watchSecondsLast60m: number;
    topLessonIds: string[];
    updatedAt: Date | null;
};
/** `courses/{courseId}/analytics/audience` — aggregate only. */
export type CourseAnalyticsAudience = {
    schemaVersion: number;
    uniqueViewersApprox: number;
    returningViewersApprox: number;
    byCountry: Record<string, number>;
    byDevice: Record<string, number>;
    byLocale: Record<string, number>;
    byHourUtc: number[];
    /** True when any bucket was suppressed below ANALYTICS_MIN_COHORT. */
    suppressed: boolean;
    updatedAt: Date | null;
};
/** `courses/{courseId}/analytics/traffic` */
export type CourseAnalyticsTraffic = {
    schemaVersion: number;
    bySource: Record<string, number>;
    impressions: number;
    opens: number;
    ctr: number;
    updatedAt: Date | null;
};
/** `courses/{courseId}/lessonAnalytics/{lessonId}` */
export type LessonAnalyticsRollup = {
    schemaVersion: number;
    lessonId: string;
    started: number;
    completed: number;
    watchSeconds: number;
    avgPositionSeconds: number;
    /**
     * Length-101 histogram; index = floor(percent watched).
     * Persisted in Firestore as `retentionBucketCounts` map, normalized on read.
     */
    retentionBuckets: number[];
    quizAttempts: number;
    quizPasses: number;
    updatedAt: Date | null;
};
/** `courses/{courseId}/analyticsDays/{yyyy-mm-dd}` */
export type CourseAnalyticsDay = {
    schemaVersion: number;
    day: string;
    views: number;
    watchSeconds: number;
    enrolled: number;
    completed: number;
    impressions: number;
    opens: number;
    uniqueViewersApprox: number;
};
export declare function emptyRetentionBuckets(): number[];
export declare function emptyHourHistogram(): number[];
export declare function emptyAnalyticsWindow(): CourseAnalyticsWindow;
//# sourceMappingURL=academy.d.ts.map