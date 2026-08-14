export type UserRole = import("@pulse/shared").UserRole;
export type AccountStatus = import("@pulse/shared").AccountStatus;
export type ApprovalStatus = import("@pulse/shared").ApprovalStatus;

export const DEFAULT_AGENCY = "Every Benefits";

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
  /** Short public bio; omitted on older docs. */
  bio?: string | null;
  /** Org hierarchy node; managed by Admin / Functions. */
  orgNodeId?: string | null;
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
  } | null;
  privacy?: {
    discoverableInDirectory: boolean;
    searchableByEmail: boolean;
    searchableByNpn: boolean;
    showEmailInSearch: boolean;
    showNpnInSearch: boolean;
    allowDirectMessages: boolean;
  } | null;
  profileBadge?: {
    text: string;
    icon: string;
    backgroundColor: string;
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
  authorBadge?: {
    text: string;
    icon: string;
    backgroundColor: string;
  } | null;
  replyCount: number;
  score: number;
  /** Unique users who interacted (author + voters + repliers). */
  interactorCount: number;
  acceptedReplyId: string | null;
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
  authorBadge?: {
    text: string;
    icon: string;
    backgroundColor: string;
  } | null;
  score: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type CourseLevel = "basic" | "intermediate" | "advanced";

/** Publication workflow: authors draft, admins publish. */
export type CourseStatus = "draft" | "pending" | "published";

export type Course = {
  id: string;
  title: string;
  description: string;
  teacherName: string;
  level: CourseLevel;
  status: CourseStatus;
  /** Storage path of the cover image; resolved to a URL on demand. */
  coverPath: string | null;
  /** Direct cover URL (seeds, already-resolved covers). */
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

/** What a learner does in a lesson: watch, read, or answer a quiz. */
export type LessonType = "video" | "reading" | "quiz";

/** One or many correct options, decided per question by the author. */
export type QuizSelectionMode = "single" | "multi";

/** A quiz question as learners see it: no correct answers included. */
export type QuizQuestion = {
  id: string;
  prompt: string;
  selectionMode: QuizSelectionMode;
  options: string[];
};

export type Lesson = {
  id: string;
  moduleId: string;
  title: string;
  order: number;
  durationSeconds: number;
  type: LessonType;
  videoPath: string | null;
  videoUrl: string | null;
  /** Markdown body for reading lessons. */
  bodyMarkdown: string | null;
  /** Quiz questions without their answer key (kept in a secure subdoc). */
  questions: QuizQuestion[];
  /** Score needed to pass a quiz, 0-100. */
  passPercent: number;
};

/** Correct option indexes per question; only authors and admins may read it. */
export type QuizAnswerKey = Record<string, number[]>;

/** Server response from the `submitQuizAttempt` callable. */
export type QuizAttemptResult = {
  score: number;
  passed: boolean;
  passPercent: number;
  correctByQuestion: Record<string, boolean>;
};

/** Latest graded attempt for a quiz lesson, written by the server. */
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
  /** Author uid; managers edit their own drafts until an admin publishes. */
  createdBy: string;
};

export type Enrollment = {
  courseId: string;
  completedLessonIds: string[];
  lastLessonId: string | null;
  lastPositionSeconds: number;
  enrolledAt: Date | null;
  updatedAt: Date | null;
  completedAt: Date | null;
  quizAttempts: Record<string, QuizAttempt>;
};

/** Enrollment plus the learner it belongs to, for Studio metrics. */
export type CourseStudent = {
  uid: string;
  enrollment: Enrollment;
};

/** Video lesson completes once the learner reaches this share of the video. */
export const LESSON_COMPLETE_THRESHOLD = 0.9;

/** Default passing score for new quizzes; authors can change it per quiz. */
export const QUIZ_DEFAULT_PASS_PERCENT = 70;

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
  /** Roles that auto-join when a user is approved. Empty = none. */
  autoJoinRoles: UserRole[];
  /** 1:1 DMs require mutual contacts; groups are always true. */
  dmMessagingEnabled: boolean;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  body: string;
  senderId: string;
  senderName: string;
  createdAt: number;
  sharedPost?: SharedPostPreview | null;
  reactions?: Record<string, string>;
};

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
