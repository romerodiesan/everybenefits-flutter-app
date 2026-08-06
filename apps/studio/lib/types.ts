import type { UserRole } from "@pulse/shared";

export type {
  UserRole,
  CourseLevel,
  CourseStatus,
  Course,
  CourseModule,
  LessonType,
  QuizSelectionMode,
  QuizQuestion,
  Lesson,
  QuizAnswerKey,
  QuizAttemptResult,
  QuizAttempt,
  CourseContent,
  LearningPath,
  Enrollment,
  CourseStudent,
  AcademyAnalyticsEventName,
  AcademyAnalyticsSource,
  AcademyAnalyticsPlatform,
  AcademyAnalyticsEventInput,
  CourseAnalyticsSummary,
  CourseAnalyticsWindow,
  CourseAnalyticsRealtime,
  CourseAnalyticsAudience,
  CourseAnalyticsTraffic,
  LessonAnalyticsRollup,
  CourseAnalyticsDay,
} from "@pulse/shared";

export {
  COURSE_LEVELS,
  LESSON_TYPES,
  LESSON_COMPLETE_THRESHOLD,
  QUIZ_DEFAULT_PASS_PERCENT,
  ACADEMY_ANALYTICS_SCHEMA_VERSION,
  ANALYTICS_MIN_COHORT,
  ANALYTICS_HEARTBEAT_SECONDS,
  ACADEMY_ANALYTICS_EVENT_NAMES,
  ACADEMY_ANALYTICS_SOURCES,
  ACADEMY_ANALYTICS_PLATFORMS,
  emptyRetentionBuckets,
  emptyHourHistogram,
  emptyAnalyticsWindow,
} from "@pulse/shared";

export const DEFAULT_AGENCY = "Every Benefits";

export type AccountStatus = "active" | "deactivated" | "pendingDeletion";

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  role: UserRole;
  isAnonymous: boolean;
  profileCompleted: boolean;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  npn: string | null;
  address: string | null;
  addressStreet: string | null;
  addressApt: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  agency: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  accountStatus?: AccountStatus;
  approvalStatus?: import("@pulse/shared").ApprovalStatus;
  deletionScheduledAt?: Date | null;
  appearance?: {
    theme: "system" | "light" | "dark";
    accent: string;
  } | null;
};
