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
} from "@pulse/shared";

export {
  COURSE_LEVELS,
  LESSON_TYPES,
  LESSON_COMPLETE_THRESHOLD,
  QUIZ_DEFAULT_PASS_PERCENT,
} from "@pulse/shared";

export const DEFAULT_AGENCY = "Every Benefits";

export type AccountStatus = "active" | "deactivated" | "pendingDeletion";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  role: UserRole;
  isAnonymous: boolean;
  profileCompleted: boolean;
  /** Last product-tour version finished/skipped; 0 or absent = never seen. */
  productTourVersion?: number;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  /** True after SMS ownership check; absent means unverified. */
  phoneVerified?: boolean;
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
  /** Account lifecycle; absent/"active" means normal. Server-managed. */
  accountStatus?: AccountStatus;
  deletionScheduledAt?: Date | null;
  /**
   * New registrations start as `pending` until an admin/manager approves.
   * Legacy users without this field are treated as approved.
   */
  approvalStatus?: ApprovalStatus;
  appearance?: {
    theme: "system" | "light" | "dark";
    accent: string;
    locale?: "inherit" | "en" | "es";
  } | null;
};

export type ForumThread = {
  id: string;
  tags: string[];
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  authorRole: UserRole;
  replyCount: number;
  score: number;
  acceptedReplyId: string | null;
  /** When true, new replies are rejected. */
  closed: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  lastReplyAt: Date | null;
};

export type ForumReply = {
  id: string;
  threadId: string;
  body: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  authorRole: UserRole;
  score: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type SharedPostPreview = {
  threadId: string;
  title: string;
  excerpt: string;
  authorName?: string | null;
  tags: string[];
};

export type ChatConversation = {
  id: string;
  memberIds: string[];
  memberNames: Record<string, string>;
  isGroup: boolean;
  title: string | null;
  dmKey: string | null;
  lastMessage: string;
  lastMessageAt: number;
  lastMessageSenderId: string | null;
  unreadCounts: Record<string, number>;
  pinnedBy: Record<string, boolean>;
  createdAt: number;
  createdBy: string;
  isDefaultAgentGroup: boolean;
  isSupportChat: boolean;
  /** Roles that auto-join when a user is approved. Empty = none. */
  autoJoinRoles: UserRole[];
  /** Optional group photo (Storage download URL). */
  photoUrl: string | null;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  body: string;
  senderId: string;
  senderName: string;
  createdAt: number;
  sharedPost?: SharedPostPreview | null;
  isAi?: boolean;
  reactions?: Record<string, string>;
};

export const SUPPORT_AI_UID = "support-ai";
export const AGENTS_DEFAULT_ID = "agents-default";

export const FORUM_TAGS = [
  "npn",
  "ventas",
  "productos",
  "compliance",
  "onboarding",
  "comisiones",
  "renovacion",
  "general",
] as const;

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;
