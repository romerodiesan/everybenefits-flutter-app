import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage } from "./client";
import { resolveLessonDurationSeconds } from "@pulse/shared";
import type {
  Course,
  CourseContent,
  CourseLevel,
  CourseModule,
  CourseStatus,
  LearningPath,
  Lesson,
  LessonType,
  QuizAnswerKey,
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
    instructorIds: stringList(data.instructorIds),
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

function lessonFrom(id: string, data: Record<string, unknown>): Lesson {
  const instructorId = String(data.instructorId ?? "").trim();
  return {
    id,
    moduleId: String(data.moduleId ?? ""),
    title: String(data.title ?? ""),
    order: Number(data.order ?? 0),
    durationSeconds: resolveLessonDurationSeconds(data),
    type: parseLessonType(data.type),
    videoPath: (data.videoPath as string) ?? null,
    videoUrl: (data.videoUrl as string) ?? null,
    videoFileName: (data.videoFileName as string) ?? null,
    bodyMarkdown: (data.bodyMarkdown as string) ?? null,
    questions: questionsFrom(data.questions),
    passPercent: Number(data.passPercent ?? QUIZ_DEFAULT_PASS_PERCENT),
    instructorId: instructorId || null,
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
    query(collection(db, "courses", courseId, "modules"), orderBy("order")),
    (snap) => {
      modules = snap.docs.map((d) =>
        moduleFrom(d.id, d.data() as Record<string, unknown>),
      );
      emit();
    },
    (error) => onError?.(error),
  );
  const stopLessons = onSnapshot(
    query(collection(db, "courses", courseId, "lessons"), orderBy("order")),
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

export function watchPath(
  pathId: string,
  onChange: (path: LearningPath | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), "paths", pathId),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(pathFrom(snap.id, snap.data() as Record<string, unknown>));
    },
    (error) => onError?.(error),
  );
}

export function watchAuthoredPaths(
  uid: string,
  onChange: (paths: LearningPath[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(getFirebaseDb(), "paths"),
    where("createdBy", "==", uid),
    orderBy("updatedAt", "desc"),
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

/** Single listener for studio admin path queues. */
export function watchPathsInStatuses(
  statuses: CourseStatus[],
  onChange: (paths: LearningPath[]) => void,
  onError?: (error: Error) => void,
  maxDocs = 200,
): Unsubscribe {
  const q = query(
    collection(getFirebaseDb(), "paths"),
    where("status", "in", statuses),
    orderBy("updatedAt", "desc"),
    limit(maxDocs),
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

export async function createPath(input: {
  title: string;
  description: string;
  level: CourseLevel;
  createdBy: string;
  courseIds?: string[];
}) {
  const db = getFirebaseDb();
  const pathRef = doc(collection(db, "paths"));
  await setDoc(pathRef, {
    title: input.title.trim(),
    description: input.description.trim(),
    level: input.level,
    status: "draft",
    courseIds: (input.courseIds ?? []).filter((id) => id.trim().length > 0),
    order: Date.now(),
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: null,
  });
  return pathRef.id;
}

export async function updatePathMeta(input: {
  pathId: string;
  title: string;
  description: string;
  level: CourseLevel;
}) {
  await updateDoc(doc(getFirebaseDb(), "paths", input.pathId), {
    title: input.title.trim(),
    description: input.description.trim(),
    level: input.level,
    updatedAt: serverTimestamp(),
  });
}

/** Replaces the ordered course membership for a path. */
export async function setPathCourseIds(pathId: string, courseIds: string[]) {
  await updateDoc(doc(getFirebaseDb(), "paths", pathId), {
    courseIds: courseIds.filter((id) => id.trim().length > 0),
    updatedAt: serverTimestamp(),
  });
}

/** Appends a course to a path if it is not already a member. */
export async function appendCourseToPath(pathId: string, courseId: string) {
  const pathRef = doc(getFirebaseDb(), "paths", pathId);
  const snap = await getDoc(pathRef);
  if (!snap.exists()) {
    throw new Error("Path not found");
  }
  const existing = stringList(
    (snap.data() as Record<string, unknown>).courseIds,
  );
  if (existing.includes(courseId)) return;
  await setPathCourseIds(pathId, [...existing, courseId]);
}

export async function setPathStatus(pathId: string, status: CourseStatus) {
  await updateDoc(doc(getFirebaseDb(), "paths", pathId), {
    status,
    updatedAt: serverTimestamp(),
    ...(status === "published" ? { publishedAt: serverTimestamp() } : {}),
  });
}

export async function deletePath(pathId: string) {
  await deleteDoc(doc(getFirebaseDb(), "paths", pathId));
}

/** Rough reading time so mixed courses still report a sensible duration. */
export function estimateReadingSeconds(markdown: string) {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  // ~200 words per minute, floored at half a minute.
  return Math.max(30, Math.round((words / 200) * 60));
}

/** Rough quiz duration so the catalog can show something for quiz-only courses. */
export function estimateQuizSeconds(questionCount: number) {
  return questionCount * 45;
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

export async function resolveVideoUrl(lesson: Lesson) {
  if (lesson.videoUrl?.trim()) return lesson.videoUrl.trim();
  if (!lesson.videoPath?.trim()) return null;
  return getStorageUrl(lesson.videoPath);
}

/** Resumable upload so the Studio can render real progress. */
function uploadWithProgress(
  path: string,
  file: File,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
) {
  const storageRef = ref(getFirebaseStorage(), path);
  const task = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
  });
  return new Promise<string>((resolve, reject) => {
    const onAbort = () => {
      task.cancel();
      reject(new DOMException("Upload cancelled", "AbortError"));
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
    task.on(
      "state_changed",
      (snap) => {
        if (snap.totalBytes > 0) {
          onProgress?.(snap.bytesTransferred / snap.totalBytes);
        }
      },
      (error) => {
        signal?.removeEventListener("abort", onAbort);
        reject(error);
      },
      () => {
        signal?.removeEventListener("abort", onAbort);
        resolve(path);
      },
    );
  });
}

/** Mirrors storage.rules image cap. */
export const MAX_COVER_BYTES = 5 * 1024 * 1024;
/** Mirrors storage.rules video cap. */
export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;

async function deleteStoragePathIfPresent(path: string | null | undefined) {
  const trimmed = path?.trim();
  if (!trimmed) return;
  try {
    await deleteObject(ref(getFirebaseStorage(), trimmed));
  } catch {
    // Missing object or permission — non-fatal for replace flows.
  }
}

export async function uploadCourseCover(
  courseId: string,
  file: File,
  onProgress?: (fraction: number) => void,
) {
  if (file.size > MAX_COVER_BYTES) {
    throw new Error(
      `Cover image must be under ${MAX_COVER_BYTES / (1024 * 1024)}MB`,
    );
  }
  const courseRef = doc(getFirebaseDb(), "courses", courseId);
  const previous = (await getDoc(courseRef)).data()?.coverPath as
    | string
    | null
    | undefined;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `courses/${courseId}/cover-${Date.now()}.${extension}`;
  await uploadWithProgress(path, file, onProgress);
  await updateDoc(courseRef, {
    coverPath: path,
    coverUrl: null,
    updatedAt: serverTimestamp(),
  });
  if (previous && previous !== path) {
    void deleteStoragePathIfPresent(previous);
  }
  return path;
}

export async function uploadLessonVideo(input: {
  courseId: string;
  lessonId: string;
  file: File;
  durationSeconds?: number;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}) {
  if (input.file.size > MAX_VIDEO_BYTES) {
    throw new Error("Video must be under 2GB");
  }
  const lessonRef = doc(
    getFirebaseDb(),
    "courses",
    input.courseId,
    "lessons",
    input.lessonId,
  );
  const previous = (await getDoc(lessonRef)).data()?.videoPath as
    | string
    | null
    | undefined;
  const generation = Date.now();
  const extension = input.file.name.split(".").pop()?.toLowerCase() ?? "mp4";
  const path = `courses/${input.courseId}/lessons/${input.lessonId}-${generation}.${extension}`;
  await uploadWithProgress(path, input.file, input.onProgress, input.signal);

  const latest = await getDoc(lessonRef);
  const latestGen = Number(
    (latest.data() as Record<string, unknown> | undefined)
      ?.videoUploadGeneration ?? 0,
  );
  if (latestGen > generation) {
    // A newer upload already claimed this lesson — drop our orphan object.
    void deleteStoragePathIfPresent(path);
    return String(
      (latest.data() as Record<string, unknown> | undefined)?.videoPath ?? path,
    );
  }

  const seconds = Number(input.durationSeconds);
  await updateDoc(lessonRef, {
    videoPath: path,
    videoUrl: null,
    videoFileName: input.file.name,
    videoUploadGeneration: generation,
    ...(Number.isFinite(seconds) && seconds > 0
      ? { durationSeconds: Math.round(seconds) }
      : {}),
    updatedAt: serverTimestamp(),
  });
  if (previous && previous !== path) {
    void deleteStoragePathIfPresent(previous);
  }
  scheduleRecomputeCourseTotals(input.courseId);
  return path;
}

/** Removes the lesson video from Storage and clears lesson media fields. */
export async function clearLessonVideo(courseId: string, lessonId: string) {
  const lessonRef = doc(getFirebaseDb(), "courses", courseId, "lessons", lessonId);
  const snap = await getDoc(lessonRef);
  if (!snap.exists()) return;
  const data = snap.data() as Record<string, unknown>;
  const previous = (data.videoPath as string | null | undefined) ?? null;
  await updateDoc(lessonRef, {
    videoPath: null,
    videoUrl: null,
    videoFileName: null,
    durationSeconds: 0,
    videoUploadGeneration: Date.now(),
    updatedAt: serverTimestamp(),
  });
  if (previous) {
    void deleteStoragePathIfPresent(previous);
  }
  scheduleRecomputeCourseTotals(courseId);
}

/** Display label for an assigned lesson video. */
export function lessonVideoLabel(lesson: Lesson): string | null {
  if (lesson.videoFileName?.trim()) return lesson.videoFileName.trim();
  if (lesson.videoUrl?.trim()) return lesson.videoUrl.trim();
  if (lesson.videoPath?.trim()) {
    const base = lesson.videoPath.split("/").pop()?.trim();
    return base || lesson.videoPath;
  }
  return null;
}

/** Default lesson title from a video filename (no extension). */
export function titleFromVideoFile(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, "").trim();
  const cleaned = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || file.name;
}

/** Reads a local video file's duration without uploading it first. */
export function readVideoDuration(file: File) {
  return new Promise<number>((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    let settled = false;
    const finish = (seconds: number) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
      const value = Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0;
      resolve(value);
    };
    const accept = () => {
      const duration = video.duration;
      if (Number.isFinite(duration) && duration > 0 && duration !== Infinity) {
        finish(duration);
      }
    };
    video.onloadedmetadata = accept;
    video.ondurationchange = accept;
    video.onerror = () => finish(0);
    video.src = url;
    window.setTimeout(() => finish(video.duration), 4000);
  });
}

// --- Authoring ---

export function watchAuthoredCourses(
  uid: string,
  onChange: (courses: Course[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const owned = query(
    collection(db, "courses"),
    where("createdBy", "==", uid),
    orderBy("updatedAt", "desc"),
  );
  const instructed = query(
    collection(db, "courses"),
    where("instructorIds", "array-contains", uid),
    orderBy("updatedAt", "desc"),
  );

  let ownedRows: Course[] = [];
  let instructedRows: Course[] = [];
  const emit = () => {
    const map = new Map<string, Course>();
    for (const course of [...ownedRows, ...instructedRows]) {
      map.set(course.id, course);
    }
    onChange(
      [...map.values()].sort(
        (a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0),
      ),
    );
  };

  const stopOwned = onSnapshot(
    owned,
    (snap) => {
      ownedRows = snap.docs.map((d) =>
        courseFrom(d.id, d.data() as Record<string, unknown>),
      );
      emit();
    },
    (error) => onError?.(error),
  );
  const stopInstructed = onSnapshot(
    instructed,
    (snap) => {
      instructedRows = snap.docs.map((d) =>
        courseFrom(d.id, d.data() as Record<string, unknown>),
      );
      emit();
    },
    (error) => onError?.(error),
  );
  return () => {
    stopOwned();
    stopInstructed();
  };
}

/** Single listener for studio admin queues (draft + pending + published). */
export function watchCoursesInStatuses(
  statuses: CourseStatus[],
  onChange: (courses: Course[]) => void,
  onError?: (error: Error) => void,
  maxDocs = 200,
): Unsubscribe {
  const q = query(
    collection(getFirebaseDb(), "courses"),
    where("status", "in", statuses),
    orderBy("updatedAt", "desc"),
    limit(maxDocs),
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

export async function createCourse(input: {
  title: string;
  description: string;
  teacherName: string;
  instructorIds?: string[];
  level: CourseLevel;
  createdBy: string;
}) {
  const db = getFirebaseDb();
  const courseRef = doc(collection(db, "courses"));
  const instructorIds = (input.instructorIds ?? [])
    .filter((id) => id.trim())
    .slice(0, 20);
  await setDoc(courseRef, {
    title: input.title.trim(),
    description: input.description.trim(),
    teacherName: input.teacherName.trim(),
    instructorIds,
    level: input.level,
    // Everything starts as a draft; admins publish from the review queue.
    status: "draft",
    coverPath: null,
    coverUrl: null,
    lessonCount: 0,
    durationMinutes: 0,
    studentCount: 0,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: null,
  });
  return courseRef.id;
}

export async function updateCourseMeta(input: {
  courseId: string;
  title: string;
  description: string;
  teacherName: string;
  instructorIds: string[];
  level: CourseLevel;
}) {
  await updateDoc(doc(getFirebaseDb(), "courses", input.courseId), {
    title: input.title.trim(),
    description: input.description.trim(),
    teacherName: input.teacherName.trim(),
    instructorIds: input.instructorIds.filter((id) => id.trim()).slice(0, 20),
    level: input.level,
    updatedAt: serverTimestamp(),
  });
}

export async function setCourseStatus(
  courseId: string,
  status: CourseStatus,
) {
  await updateDoc(doc(getFirebaseDb(), "courses", courseId), {
    status,
    updatedAt: serverTimestamp(),
    ...(status === "published" ? { publishedAt: serverTimestamp() } : {}),
  });
}

export async function deleteCourse(courseId: string) {
  const db = getFirebaseDb();
  const [modules, lessons] = await Promise.all([
    getDocs(collection(db, "courses", courseId, "modules")),
    getDocs(collection(db, "courses", courseId, "lessons")),
  ]);
  const batch = writeBatch(db);
  modules.docs.forEach((d) => batch.delete(d.ref));
  lessons.docs.forEach((d) => {
    batch.delete(doc(d.ref, "secure", "answerKey"));
    batch.delete(d.ref);
  });
  batch.delete(doc(db, "courses", courseId));
  await batch.commit();

  // Best effort: the Firestore docs are already gone either way.
  try {
    await deleteStorageFolder(`courses/${courseId}`);
  } catch {
    // Missing folder or storage rules.
  }
}

async function deleteStorageFolder(path: string) {
  const folder = await listAll(ref(getFirebaseStorage(), path));
  await Promise.all([
    ...folder.items.map((item) => deleteObject(item)),
    ...folder.prefixes.map((prefix) => deleteStorageFolder(prefix.fullPath)),
  ]);
}

export async function upsertModule(input: {
  courseId: string;
  moduleId?: string;
  title: string;
  order: number;
}) {
  const db = getFirebaseDb();
  const moduleRef = input.moduleId
    ? doc(db, "courses", input.courseId, "modules", input.moduleId)
    : doc(collection(db, "courses", input.courseId, "modules"));
  await setDoc(
    moduleRef,
    {
      title: input.title.trim(),
      order: input.order,
      updatedAt: serverTimestamp(),
      ...(input.moduleId ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  );
  return moduleRef.id;
}

/** Deleting a module also removes its lessons, so counters stay honest. */
export async function deleteModule(courseId: string, moduleId: string) {
  const db = getFirebaseDb();
  const lessons = await getDocs(
    query(
      collection(db, "courses", courseId, "lessons"),
      where("moduleId", "==", moduleId),
    ),
  );
  const batch = writeBatch(db);
  lessons.docs.forEach((d) => {
    batch.delete(doc(d.ref, "secure", "answerKey"));
    batch.delete(d.ref);
  });
  batch.delete(doc(db, "courses", courseId, "modules", moduleId));
  await batch.commit();
  scheduleRecomputeCourseTotals(courseId);
}

export async function upsertLesson(input: {
  courseId: string;
  lessonId?: string;
  moduleId: string;
  title: string;
  order: number;
  durationSeconds?: number;
  type?: LessonType;
  instructorId?: string | null;
}) {
  const db = getFirebaseDb();
  const lessonRef = input.lessonId
    ? doc(db, "courses", input.courseId, "lessons", input.lessonId)
    : doc(collection(db, "courses", input.courseId, "lessons"));

  let defaultInstructorId: string | null = null;
  if (!input.lessonId && input.instructorId === undefined) {
    const courseSnap = await getDoc(doc(db, "courses", input.courseId));
    const ids = courseSnap.exists()
      ? stringList(
          (courseSnap.data() as Record<string, unknown>).instructorIds,
        )
      : [];
    defaultInstructorId = ids[0] ?? null;
  }

  const instructorId =
    input.instructorId === undefined
      ? defaultInstructorId
      : input.instructorId
        ? input.instructorId.trim() || null
        : null;

  await setDoc(
    lessonRef,
    {
      moduleId: input.moduleId,
      title: input.title.trim(),
      order: input.order,
      updatedAt: serverTimestamp(),
      ...(input.type ? { type: input.type } : {}),
      ...(input.durationSeconds === undefined
        ? {}
        : { durationSeconds: Math.round(input.durationSeconds) }),
      ...(input.instructorId !== undefined || !input.lessonId
        ? { instructorId }
        : {}),
      ...(input.lessonId
        ? {}
        : {
            type: input.type ?? "video",
            durationSeconds: Math.round(input.durationSeconds ?? 0),
            videoPath: null,
            videoUrl: null,
            videoFileName: null,
            bodyMarkdown: null,
            questions: [],
            passPercent: QUIZ_DEFAULT_PASS_PERCENT,
            createdAt: serverTimestamp(),
          }),
    },
    { merge: true },
  );
  // Title-only edits do not change totals; create / duration updates do.
  if (!input.lessonId || input.durationSeconds !== undefined) {
    scheduleRecomputeCourseTotals(input.courseId);
  }
  return lessonRef.id;
}

/** Saves the Markdown body and its reading-time estimate. */
export async function saveLessonReading(input: {
  courseId: string;
  lessonId: string;
  bodyMarkdown: string;
  durationSeconds: number;
}) {
  await updateDoc(
    doc(getFirebaseDb(), "courses", input.courseId, "lessons", input.lessonId),
    {
      type: "reading",
      bodyMarkdown: input.bodyMarkdown,
      durationSeconds: Math.max(0, Math.round(input.durationSeconds)),
      videoPath: null,
      videoUrl: null,
      videoFileName: null,
      updatedAt: serverTimestamp(),
    },
  );
  scheduleRecomputeCourseTotals(input.courseId);
}

/**
 * Writes the public questions and the private answer key in one batch so a
 * quiz is never readable without its grading data on the server.
 */
export async function saveLessonQuiz(input: {
  courseId: string;
  lessonId: string;
  questions: QuizQuestion[];
  answerKey: QuizAnswerKey;
  passPercent: number;
  durationSeconds: number;
}) {
  const db = getFirebaseDb();
  const lessonRef = doc(
    db,
    "courses",
    input.courseId,
    "lessons",
    input.lessonId,
  );
  const batch = writeBatch(db);
  batch.update(lessonRef, {
    type: "quiz",
    questions: input.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt.trim(),
      selectionMode: question.selectionMode,
      options: question.options.map((option) => option.trim()),
    })),
    passPercent: Math.min(100, Math.max(0, Math.round(input.passPercent))),
    durationSeconds: Math.max(0, Math.round(input.durationSeconds)),
    videoPath: null,
    videoUrl: null,
    videoFileName: null,
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(lessonRef, "secure", "answerKey"), {
    answers: input.answerKey,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  scheduleRecomputeCourseTotals(input.courseId);
}

/** Answer key for the Studio editor; learners are denied by security rules. */
export async function getLessonAnswerKey(
  courseId: string,
  lessonId: string,
): Promise<QuizAnswerKey> {
  const snap = await getDoc(
    doc(
      getFirebaseDb(),
      "courses",
      courseId,
      "lessons",
      lessonId,
      "secure",
      "answerKey",
    ),
  );
  if (!snap.exists()) return {};
  const raw = (snap.data() as Record<string, unknown>).answers;
  if (typeof raw !== "object" || raw === null) return {};
  const out: QuizAnswerKey = {};
  for (const [questionId, indexes] of Object.entries(raw)) {
    if (!Array.isArray(indexes)) continue;
    out[questionId] = indexes
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 0);
  }
  return out;
}

export async function deleteLesson(courseId: string, lessonId: string) {
  const db = getFirebaseDb();
  // The answer key is a subdocument, so it needs an explicit delete.
  await deleteDoc(
    doc(db, "courses", courseId, "lessons", lessonId, "secure", "answerKey"),
  ).catch(() => undefined);
  await deleteDoc(doc(db, "courses", courseId, "lessons", lessonId));
  scheduleRecomputeCourseTotals(courseId);
}

export async function reorderLessons(
  courseId: string,
  orderedIds: string[],
) {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, "courses", courseId, "lessons", id), {
      order: index,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

/** Debounce totals recompute across bursty editor mutations. */
const pendingTotals = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleRecomputeCourseTotals(
  courseId: string,
  delayMs = 800,
) {
  const existing = pendingTotals.get(courseId);
  if (existing) clearTimeout(existing);
  pendingTotals.set(
    courseId,
    setTimeout(() => {
      pendingTotals.delete(courseId);
      void recomputeCourseTotals(courseId).catch(() => undefined);
    }, delayMs),
  );
}

/** Keeps `lessonCount` / `durationMinutes` in sync with the lesson docs. */
export async function recomputeCourseTotals(courseId: string) {
  const db = getFirebaseDb();
  const lessons = await getDocs(collection(db, "courses", courseId, "lessons"));
  const totalSeconds = lessons.docs.reduce(
    (sum, d) => sum + Number(d.data().durationSeconds ?? 0),
    0,
  );
  await updateDoc(doc(db, "courses", courseId), {
    lessonCount: lessons.size,
    durationMinutes: Math.round(totalSeconds / 60),
    updatedAt: serverTimestamp(),
  });
}
