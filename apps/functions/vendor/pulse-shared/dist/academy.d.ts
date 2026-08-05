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
export type Lesson = {
    id: string;
    moduleId: string;
    title: string;
    order: number;
    durationSeconds: number;
    type: LessonType;
    videoPath: string | null;
    videoUrl: string | null;
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
//# sourceMappingURL=academy.d.ts.map