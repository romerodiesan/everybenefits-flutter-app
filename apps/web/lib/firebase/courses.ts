import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage } from "./client";
import { callCloudFunction } from "./call-function";
import { resolveLessonDurationSeconds } from "@pulse/shared";
import type {
  Course,
  CourseContent,
  CourseLevel,
  CourseModule,
  CourseStatus,
  Enrollment,
  LearningPath,
  Lesson,
  LessonType,
  QuizAttempt,
  QuizAttemptResult,
  QuizQuestion,
  QuizSelectionMode,
} from "../types";
import { QUIZ_DEFAULT_PASS_PERCENT } from "../types";

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseLevel(value: unknown): CourseLevel {
  return value === "intermediate" || value === "advanced" ? value : "basic";
}

function parseStatus(value: unknown): CourseStatus {
  return value === "pending" || value === "published" ? value : "draft";
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter((entry) => entry.length > 0);
}

export function courseFrom(id: string, data: Record<string, unknown>): Course {
  return {
    id,
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    teacherName: String(data.teacherName ?? ""),
    level: parseLevel(data.level),
    status: parseStatus(data.status),
    coverPath: (data.coverPath as string) ?? null,
    coverUrl: (data.coverUrl as string) ?? null,
    lessonCount: Number(data.lessonCount ?? 0),
    durationMinutes: Number(data.durationMinutes ?? 0),
    studentCount: Number(data.studentCount ?? 0),
    createdBy: String(data.createdBy ?? ""),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt) ?? toDate(data.createdAt),
    publishedAt: toDate(data.publishedAt),
  };
}

function moduleFrom(id: string, data: Record<string, unknown>): CourseModule {
  return {
    id,
    title: String(data.title ?? ""),
    order: Number(data.order ?? 0),
  };
}

/** Legacy lessons predate the field and are always videos. */
function parseLessonType(value: unknown): LessonType {
  return value === "reading" || value === "quiz" ? value : "video";
}

function parseSelectionMode(value: unknown): QuizSelectionMode {
  return value === "multi" ? "multi" : "single";
}

function questionsFrom(value: unknown): QuizQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (typeof entry !== "object" || entry === null) return [];
    const raw = entry as Record<string, unknown>;
    const id = String(raw.id ?? "").trim() || `q${index + 1}`;
    return [
      {
        id,
        prompt: String(raw.prompt ?? ""),
        selectionMode: parseSelectionMode(raw.selectionMode),
        options: Array.isArray(raw.options) ? raw.options.map(String) : [],
      },
    ];
  });
}

function attemptsFrom(value: unknown): Record<string, QuizAttempt> {
  if (typeof value !== "object" || value === null) return {};
  const out: Record<string, QuizAttempt> = {};
  for (const [lessonId, raw] of Object.entries(value)) {
    if (typeof raw !== "object" || raw === null) continue;
    const entry = raw as Record<string, unknown>;
    out[lessonId] = {
      score: Number(entry.score ?? 0),
      passed: entry.passed === true,
      at: toDate(entry.at),
    };
  }
  return out;
}

function lessonFrom(id: string, data: Record<string, unknown>): Lesson {
  return {
    id,
    moduleId: String(data.moduleId ?? ""),
    title: String(data.title ?? ""),
    order: Number(data.order ?? 0),
    durationSeconds: resolveLessonDurationSeconds(data),
    type: parseLessonType(data.type),
    videoPath: (data.videoPath as string) ?? null,
    videoUrl: (data.videoUrl as string) ?? null,
    bodyMarkdown: (data.bodyMarkdown as string) ?? null,
    questions: questionsFrom(data.questions),
    passPercent: Number(data.passPercent ?? QUIZ_DEFAULT_PASS_PERCENT),
  };
}

function pathFrom(id: string, data: Record<string, unknown>): LearningPath {
  return {
    id,
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    level: parseLevel(data.level),
    status: parseStatus(data.status),
    courseIds: stringList(data.courseIds),
    order: Number(data.order ?? 0),
    createdBy: String(data.createdBy ?? ""),
  };
}

function enrollmentFrom(
  courseId: string,
  data: Record<string, unknown>,
): Enrollment {
  return {
    courseId: String(data.courseId ?? courseId),
    completedLessonIds: stringList(data.completedLessonIds),
    lastLessonId: (data.lastLessonId as string) ?? null,
    lastPositionSeconds: Number(data.lastPositionSeconds ?? 0),
    enrolledAt: toDate(data.enrolledAt),
    updatedAt: toDate(data.updatedAt) ?? toDate(data.enrolledAt),
    completedAt: toDate(data.completedAt),
    quizAttempts: attemptsFrom(data.quizAttempts),
  };
}

/** Fraction of a course finished, clamped to [0, 1]. */
export function progressOf(
  enrollment: Enrollment | null | undefined,
  lessonCount: number,
) {
  if (!enrollment) return 0;
  if (lessonCount <= 0) return enrollment.completedAt ? 1 : 0;
  const ratio = enrollment.completedLessonIds.length / lessonCount;
  return Math.min(1, Math.max(0, ratio));
}

// --- Catalog reads ---

export function watchPublishedCourses(
  onChange: (courses: Course[]) => void,
  onError?: (error: Error) => void,
  max = 60,
): Unsubscribe {
  const q = query(
    collection(getFirebaseDb(), "courses"),
    where("status", "==", "published"),
    orderBy("publishedAt", "desc"),
    limit(max),
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs.map((d) =>
          courseFrom(d.id, d.data() as Record<string, unknown>),
        ),
      );
    },
    (error) => onError?.(error),
  );
}

export function watchCourse(
  courseId: string,
  onChange: (course: Course | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), "courses", courseId),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(courseFrom(snap.id, snap.data() as Record<string, unknown>));
    },
    (error) => onError?.(error),
  );
}

export function watchCourseContent(
  courseId: string,
  onChange: (content: CourseContent) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  let modules: CourseModule[] = [];
  let lessons: Lesson[] = [];
  const emit = () => onChange({ modules, lessons });

  const stopModules = onSnapshot(
    query(
      collection(db, "courses", courseId, "modules"),
      orderBy("order"),
      limit(200),
    ),
    (snap) => {
      modules = snap.docs.map((d) =>
        moduleFrom(d.id, d.data() as Record<string, unknown>),
      );
      emit();
    },
    (error) => onError?.(error),
  );
  const stopLessons = onSnapshot(
    query(
      collection(db, "courses", courseId, "lessons"),
      orderBy("order"),
      limit(500),
    ),
    (snap) => {
      lessons = snap.docs.map((d) =>
        lessonFrom(d.id, d.data() as Record<string, unknown>),
      );
      emit();
    },
    (error) => onError?.(error),
  );

  return () => {
    stopModules();
    stopLessons();
  };
}

export function watchPaths(
  onChange: (paths: LearningPath[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(getFirebaseDb(), "paths"),
    where("status", "==", "published"),
    orderBy("order"),
    limit(30),
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs.map((d) =>
          pathFrom(d.id, d.data() as Record<string, unknown>),
        ),
      );
    },
    (error) => onError?.(error),
  );
}

export async function getPath(pathId: string) {
  const snap = await getDoc(doc(getFirebaseDb(), "paths", pathId));
  if (!snap.exists()) return null;
  return pathFrom(snap.id, snap.data() as Record<string, unknown>);
}

// --- Enrollment and progress ---

export function watchEnrollments(
  uid: string,
  onChange: (enrollments: Enrollment[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(getFirebaseDb(), "users", uid, "enrollments"),
    orderBy("updatedAt", "desc"),
    limit(100),
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs.map((d) =>
          enrollmentFrom(d.id, d.data() as Record<string, unknown>),
        ),
      );
    },
    (error) => onError?.(error),
  );
}

export function watchEnrollment(
  uid: string,
  courseId: string,
  onChange: (enrollment: Enrollment | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), "users", uid, "enrollments", courseId),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(
        enrollmentFrom(snap.id, snap.data() as Record<string, unknown>),
      );
    },
    (error) => onError?.(error),
  );
}

export async function enrollInCourse(uid: string, courseId: string) {
  void uid;
  await callCloudFunction("enrollInCourse", { courseId });
}

/**
 * Persists playback position and marks the lesson complete past the threshold.
 * Returns the enrollment the caller should render.
 */
export async function saveLessonProgress(input: {
  uid: string;
  courseId: string;
  lessonCount: number;
  enrollment: Enrollment;
  lessonId: string;
  positionSeconds: number;
  completed: boolean;
}): Promise<Enrollment> {
  const completedLessonIds = [...input.enrollment.completedLessonIds];
  if (input.completed && !completedLessonIds.includes(input.lessonId)) {
    completedLessonIds.push(input.lessonId);
  }
  const allDone =
    input.lessonCount > 0 && completedLessonIds.length >= input.lessonCount;
  const now = new Date();
  const next: Enrollment = {
    ...input.enrollment,
    completedLessonIds,
    lastLessonId: input.lessonId,
    lastPositionSeconds: Math.max(0, Math.round(input.positionSeconds)),
    updatedAt: now,
    completedAt: allDone ? (input.enrollment.completedAt ?? now) : null,
  };

  await callCloudFunction("saveCourseProgress", {
    courseId: input.courseId,
    lessonId: input.lessonId,
    positionSeconds: next.lastPositionSeconds,
    completed: input.completed,
  });
  return next;
}

/**
 * Grades a quiz on the server: the answer key never reaches the browser, and
 * the callable is what marks the lesson complete when the learner passes.
 */
export async function submitQuizAttempt(input: {
  courseId: string;
  lessonId: string;
  answers: Record<string, number[]>;
}): Promise<QuizAttemptResult> {
  const raw = await callCloudFunction<Partial<QuizAttemptResult>>(
    "submitQuizAttempt",
    input,
  );
  return {
    score: Number(raw?.score ?? 0),
    passed: raw?.passed === true,
    passPercent: Number(raw?.passPercent ?? QUIZ_DEFAULT_PASS_PERCENT),
    correctByQuestion:
      typeof raw?.correctByQuestion === "object" && raw.correctByQuestion
        ? raw.correctByQuestion
        : {},
  };
}

// --- Media ---

const storageUrlCache = new Map<string, Promise<string>>();

export async function getStorageUrl(path: string) {
  const normalized = path.trim();
  const cached = storageUrlCache.get(normalized);
  if (cached) return cached;
  const pending = getDownloadURL(ref(getFirebaseStorage(), normalized)).catch(
    (error) => {
      storageUrlCache.delete(normalized);
      throw error;
    },
  );
  storageUrlCache.set(normalized, pending);
  return pending;
}
