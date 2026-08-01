"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { canEditCourse, canManageCourses } from "@pulse/shared";
import { useAutosave } from "@/lib/hooks/use-autosave";
import {
  deleteCourse,
  fetchCourseStudents,
  progressOf,
  setCourseStatus,
  updateCourseMeta,
  uploadCourseCover,
  upsertLesson,
  upsertModule,
  watchCourse,
  watchCourseContent,
} from "@/lib/firebase/courses";
import { COURSE_LEVELS, LESSON_TYPES } from "@/lib/types";
import type {
  Course,
  CourseContent,
  CourseLevel,
  CourseStudent,
  Lesson,
  LessonType,
} from "@/lib/types";
import { Button, Input, Label, TextArea } from "@pulse/ui";
import { WorkspaceSkeleton } from "@/components/ui/skeleton";
import {
  CourseCover,
  EmptyState,
  ProgressBar,
  useLessonTypeLabels,
  useLevelLabels,
} from "@/components/academy/shared";
import { LessonContentEditor } from "@/components/studio/lesson-content-editor";
import { LearnerPreview } from "@/components/workspace/learner-preview";
import { SyllabusPane } from "@/components/workspace/course-outline-panel";
import { CourseWorkspaceHeader } from "@/components/workspace/course-workspace-header";
import dynamic from "next/dynamic";

const MediaLibrary = dynamic(
  () =>
    import("@/components/workspace/media-library").then((m) => m.MediaLibrary),
  { ssr: false },
);

export function CourseWorkspace({ courseId }: { courseId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [content, setContent] = useState<CourseContent>({
    modules: [],
    lessons: [],
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<"syllabus" | "edit" | "details">(
    "edit",
  );
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [studentsCursor, setStudentsCursor] = useState<string | null>(null);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsReady, setStudentsReady] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [level, setLevel] = useState<CourseLevel>("basic");
  const metaSeeded = useRef<string | null>(null);
  const coverRef = useRef<HTMLInputElement | null>(null);
  const [coverProgress, setCoverProgress] = useState<number | null>(null);

  useEffect(() => {
    return watchCourse(
      courseId,
      (next) => {
        setCourse(next);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [courseId]);

  useEffect(() => {
    return watchCourseContent(courseId, setContent, () =>
      setContent({ modules: [], lessons: [] }),
    );
  }, [courseId]);

  useEffect(() => {
    if (!course) return;
    if (metaSeeded.current === course.id) return;
    metaSeeded.current = course.id;
    setTitle(course.title);
    setDescription(course.description);
    setTeacherName(course.teacherName);
    setLevel(course.level);
  }, [course]);

  useEffect(() => {
    let cancelled = false;
    setStudentsReady(false);
    setStudents([]);
    setStudentsCursor(null);
    setStudentsLoading(true);
    fetchCourseStudents(courseId, { limit: 25 })
      .then((page) => {
        if (cancelled) return;
        setStudents(page.students);
        setStudentsCursor(page.nextCursor);
      })
      .catch(() => {
        if (cancelled) return;
        setStudents([]);
        setStudentsCursor(null);
      })
      .finally(() => {
        if (!cancelled) {
          setStudentsLoading(false);
          setStudentsReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, course?.studentCount]);

  const loadMoreStudents = useCallback(async () => {
    if (!studentsCursor || studentsLoading) return;
    setStudentsLoading(true);
    try {
      const page = await fetchCourseStudents(courseId, {
        limit: 25,
        cursor: studentsCursor,
      });
      setStudents((prev) => [...prev, ...page.students]);
      setStudentsCursor(page.nextCursor);
    } catch {
      // keep current list
    } finally {
      setStudentsLoading(false);
    }
  }, [courseId, studentsCursor, studentsLoading]);

  const isAdmin = canManageCourses(profile?.role ?? "guest");
  const editable = course && profile ? canEditCourse(course, profile) : false;

  const selectedLesson = useMemo(
    () => content.lessons.find((lesson) => lesson.id === selectedLessonId) ?? null,
    [content.lessons, selectedLessonId],
  );

  const activeModuleId =
    selectedModuleId ??
    selectedLesson?.moduleId ??
    content.modules[0]?.id ??
    null;

  const saveMeta = useCallback(async () => {
    if (!course || !editable || !title.trim()) return;
    await updateCourseMeta({
      courseId: course.id,
      title,
      description,
      teacherName,
      level,
    });
  }, [course, editable, title, description, teacherName, level]);

  const metaSnapshot = `${title}\0${description}\0${teacherName}\0${level}`;
  const { status: syncStatus } = useAutosave(
    metaSnapshot,
    saveMeta,
    Boolean(editable && course),
  );

  const changeStatus = useCallback(
    async (status: Course["status"]) => {
      if (!course || !editable) return;
      if (status === "published" && !isAdmin) return;
      setBusy(true);
      try {
        await setCourseStatus(course.id, status);
      } finally {
        setBusy(false);
      }
    },
    [course, editable, isAdmin],
  );

  const removeCourse = async () => {
    if (!course) return;
    if (!window.confirm(`${t("actionDelete")}: ${course.title}?`)) return;
    setBusy(true);
    try {
      await deleteCourse(course.id);
      router.push("/");
    } finally {
      setBusy(false);
    }
  };

  const addModule = async () => {
    if (!course || !editable) return;
    setBusy(true);
    try {
      const id = await upsertModule({
        courseId: course.id,
        title: `Module ${content.modules.length + 1}`,
        order: content.modules.length,
      });
      setSelectedModuleId(id);
    } finally {
      setBusy(false);
    }
  };

  const addLesson = useCallback(
    async (moduleId?: string | null) => {
      if (!course || !editable) return;
      const target = moduleId ?? activeModuleId;
      if (!target) return;
      setBusy(true);
      try {
        const id = await upsertLesson({
          courseId: course.id,
          moduleId: target,
          title: `Lesson ${content.lessons.length + 1}`,
          order: content.lessons.length,
          type: "video",
        });
        setSelectedModuleId(target);
        setSelectedLessonId(id);
      } finally {
        setBusy(false);
      }
    },
    [course, editable, activeModuleId, content.lessons.length],
  );

  useEffect(() => {
    const onPreview = () => setPreviewOpen((value) => !value);
    const onSubmit = () => {
      if (course?.status === "draft") void changeStatus("pending");
    };
    const onPublish = () => {
      if (isAdmin && course && course.status !== "published") {
        void changeStatus("published");
      }
    };
    const onAddLesson = () => {
      void addLesson(activeModuleId);
    };
    window.addEventListener("studio:toggle-preview", onPreview);
    window.addEventListener("studio:submit-review", onSubmit);
    window.addEventListener("studio:publish", onPublish);
    window.addEventListener("studio:add-lesson", onAddLesson);
    return () => {
      window.removeEventListener("studio:toggle-preview", onPreview);
      window.removeEventListener("studio:submit-review", onSubmit);
      window.removeEventListener("studio:publish", onPublish);
      window.removeEventListener("studio:add-lesson", onAddLesson);
    };
  }, [course, isAdmin, changeStatus, addLesson, activeModuleId]);

  const pickCover = async (file: File | undefined) => {
    if (!file || !course || !editable) return;
    setCoverProgress(0);
    try {
      await uploadCourseCover(course.id, file, setCoverProgress);
    } finally {
      setCoverProgress(null);
      if (coverRef.current) coverRef.current.value = "";
    }
  };

  if (authLoading || loading) {
    return <WorkspaceSkeleton />;
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <EmptyState message={t("libraryEmpty")} />
        <div className="mt-4 text-center">
          <Link href="/" className="text-sm font-semibold text-brand">
            {t("navLibrary")}
          </Link>
        </div>
      </div>
    );
  }

  if (!editable) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <EmptyState message={t("noAccessBody")} />
        <div className="mt-4 text-center">
          <Link href="/" className="text-sm font-semibold text-brand">
            {t("navLibrary")}
          </Link>
        </div>
      </div>
    );
  }

  const syncDot =
    syncStatus === "saving"
      ? "bg-warn"
      : syncStatus === "error"
        ? "bg-danger"
        : syncStatus === "saved"
          ? "bg-ok"
          : "bg-white/20";

  const syncLabel =
    syncStatus === "saving"
      ? t("syncSaving")
      : syncStatus === "error"
        ? t("syncError")
        : syncStatus === "saved"
          ? t("syncSaved")
          : null;

  return (
    <div className="flex h-[calc(100svh-7.25rem)] flex-col lg:h-[calc(100vh)]">
      <CourseWorkspaceHeader
        course={course}
        syncDot={syncDot}
        syncLabel={syncLabel}
        busy={busy}
        isAdmin={isAdmin}
        onMedia={() => setMediaOpen(true)}
        onPreview={() => setPreviewOpen(true)}
        onChangeStatus={(status) => void changeStatus(status)}
        onRemove={() => void removeCourse()}
      />

      <div className="flex gap-1 border-b border-glass-border px-2 py-1.5 lg:hidden">
        {(
          [
            ["syllabus", t("workspaceModules")],
            ["edit", t("workspaceEdit")],
            ["details", t("workspaceInspector")],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMobilePane(id)}
            className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold ${
              mobilePane === id
                ? "bg-brand/15 text-brand"
                : "text-muted hover:bg-ink/[0.04]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        <div
          className={`min-h-0 overflow-hidden ${
            mobilePane === "syllabus" ? "block" : "hidden"
          } lg:block`}
        >
          <SyllabusPane
            courseId={course.id}
            content={content}
            selectedLessonId={selectedLessonId}
            selectedModuleId={activeModuleId}
            busy={busy}
            onSelectLesson={(lesson) => {
              setSelectedLessonId(lesson.id);
              setSelectedModuleId(lesson.moduleId);
              setMobilePane("edit");
            }}
            onSelectModule={setSelectedModuleId}
            onAddModule={() => void addModule()}
            onAddLesson={(moduleId) => void addLesson(moduleId)}
            onBusy={setBusy}
          />
        </div>

        <section
          className={`min-h-0 overflow-y-auto border-x border-glass-border p-3 sm:p-4 ${
            mobilePane === "edit" ? "block" : "hidden"
          } lg:block`}
        >
          {selectedLesson ? (
            <div>
              <LessonTitleEditor
                courseId={course.id}
                lesson={selectedLesson}
              />
              <div className="mt-4">
                <LessonContentEditor
                  courseId={course.id}
                  lesson={selectedLesson}
                />
              </div>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted">
              {t("workspaceNoLesson")}
            </p>
          )}
        </section>

        <div
          className={`min-h-0 overflow-hidden ${
            mobilePane === "details" ? "block" : "hidden"
          } lg:block`}
        >
          <InspectorPane
            course={course}
            title={title}
            description={description}
            teacherName={teacherName}
            level={level}
            onTitle={setTitle}
            onDescription={setDescription}
            onTeacherName={setTeacherName}
            onLevel={setLevel}
            coverRef={coverRef}
            coverProgress={coverProgress}
            onCover={(file) => void pickCover(file)}
            students={students}
            studentsReady={studentsReady}
            studentsLoading={studentsLoading}
            hasMoreStudents={Boolean(studentsCursor)}
            onLoadMoreStudents={() => void loadMoreStudents()}
          />
        </div>
      </div>

      {previewOpen ? (
        <LearnerPreview
          course={course}
          content={content}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}

      <MediaLibrary
        course={course}
        lessons={content.lessons}
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
      />
    </div>
  );
}

function LessonTitleEditor({
  courseId,
  lesson,
}: {
  courseId: string;
  lesson: Lesson;
}) {
  const typeLabel = useLessonTypeLabels();
  const [draft, setDraft] = useState(lesson.title);
  const [type, setType] = useState<LessonType>(lesson.type);

  useEffect(() => {
    setDraft(lesson.title);
    setType(lesson.type);
  }, [lesson.id, lesson.title, lesson.type]);

  const persist = async (nextTitle: string, nextType: LessonType) => {
    if (!nextTitle.trim()) return;
    if (nextTitle === lesson.title && nextType === lesson.type) return;
    await upsertLesson({
      courseId,
      lessonId: lesson.id,
      moduleId: lesson.moduleId,
      title: nextTitle,
      order: lesson.order,
      type: nextType,
    });
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[200px] flex-1">
        <Label>{typeLabel(lesson.type)}</Label>
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void persist(draft, type)}
        />
      </div>
      <div>
        <Label>&nbsp;</Label>
        <select
          value={type}
          onChange={(event) => {
            const next = event.target.value as LessonType;
            setType(next);
            void persist(draft, next);
          }}
          className="h-10 rounded-xl border border-glass-border bg-sheet px-3 text-sm"
        >
          {LESSON_TYPES.map((option) => (
            <option key={option} value={option}>
              {typeLabel(option)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function InspectorPane({
  course,
  title,
  description,
  teacherName,
  level,
  onTitle,
  onDescription,
  onTeacherName,
  onLevel,
  coverRef,
  coverProgress,
  onCover,
  students,
  studentsReady,
  studentsLoading,
  hasMoreStudents,
  onLoadMoreStudents,
}: {
  course: Course;
  title: string;
  description: string;
  teacherName: string;
  level: CourseLevel;
  onTitle: (value: string) => void;
  onDescription: (value: string) => void;
  onTeacherName: (value: string) => void;
  onLevel: (value: CourseLevel) => void;
  coverRef: RefObject<HTMLInputElement | null>;
  coverProgress: number | null;
  onCover: (file: File | undefined) => void;
  students: CourseStudent[];
  studentsReady: boolean;
  studentsLoading: boolean;
  hasMoreStudents: boolean;
  onLoadMoreStudents: () => void;
}) {
  const t = useTranslations();
  const levelLabel = useLevelLabels();
  const completed = students.filter(
    (row) => row.enrollment.completedAt,
  ).length;
  const enrolledCount =
    course.activeStudentCount ??
    students.filter((row) => !row.enrollment.completedAt).length;

  return (
    <aside className="min-h-0 overflow-y-auto p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {t("workspaceInspector")}
      </p>

      <div className="mt-3 space-y-3">
        <div>
          <Label>{t("fieldTitle")}</Label>
          <Input value={title} onChange={(event) => onTitle(event.target.value)} />
        </div>
        <div>
          <Label>{t("fieldTeacher")}</Label>
          <Input
            value={teacherName}
            onChange={(event) => onTeacherName(event.target.value)}
          />
        </div>
        <div>
          <Label>{t("fieldLevel")}</Label>
          <select
            value={level}
            onChange={(event) => onLevel(event.target.value as CourseLevel)}
            className="h-10 w-full rounded-xl border border-glass-border bg-sheet px-3 text-sm"
          >
            {COURSE_LEVELS.map((option) => (
              <option key={option} value={option}>
                {levelLabel(option)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>{t("fieldDescription")}</Label>
          <TextArea
            value={description}
            onChange={(event) => onDescription(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {t("workspaceCover")}
        </p>
        <div className="mt-2 overflow-hidden rounded-xl border border-glass-border">
          <CourseCover course={course} className="h-28" showLevel={false} />
        </div>
        <input
          ref={coverRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => onCover(event.target.files?.[0])}
          className="mt-2 w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand/14 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand"
        />
        {coverProgress !== null ? (
          <div className="mt-2">
            <ProgressBar value={coverProgress} />
            <p className="mt-1 text-[11px] text-muted">
              {t("studioUploading", {
                percent: Math.round(coverProgress * 100),
              })}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {t("workspaceStudents")}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="studio-panel px-3 py-2">
            <p className="text-[10px] uppercase text-muted">
              {t("insightsInProgress")}
            </p>
            <p className="font-display text-xl">{enrolledCount}</p>
          </div>
          <div className="studio-panel px-3 py-2">
            <p className="text-[10px] uppercase text-muted">{t("insightsCompleted")}</p>
            <p className="font-display text-xl">{completed}</p>
          </div>
        </div>
        {!studentsReady || (studentsLoading && students.length === 0) ? (
          <div className="mt-3 space-y-1" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-7 animate-pulse rounded-lg bg-white/[0.06]"
              />
            ))}
          </div>
        ) : students.filter((row) => !row.enrollment.completedAt).length ===
          0 ? (
          <p className="mt-3 text-xs text-muted">{t("insightsNoLearners")}</p>
        ) : (
          <>
            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
              {students
                .filter((row) => !row.enrollment.completedAt)
                .map((row) => (
                <li
                  key={row.uid}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs"
                >
                  <span className="truncate text-muted">
                    {row.uid.slice(0, 10)}…
                  </span>
                  <span>
                    {Math.round(
                      progressOf(row.enrollment, course.lessonCount) * 100,
                    )}
                    %
                  </span>
                </li>
              ))}
            </ul>
            {hasMoreStudents ? (
              <Button
                type="button"
                variant="ghost"
                className="mt-2 h-8 w-full text-xs"
                disabled={studentsLoading}
                onClick={onLoadMoreStudents}
              >
                {t("tableLoadMore")}
              </Button>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}
