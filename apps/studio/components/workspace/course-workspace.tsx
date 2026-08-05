"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type RefObject,
} from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { canEditCourse, canManageCourses } from "@/lib/roles";
import { useAutosave } from "@/lib/hooks/use-autosave";
import {
  deleteCourse,
  deleteLesson,
  deleteModule,
  fetchCourseStudents,
  progressOf,
  reorderLessons,
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
import { Button, Input, Label, TextArea } from "@/components/ui/primitives";
import {
  CourseCover,
  EmptyState,
  LessonTypeIcon,
  ProgressBar,
  StatusChip,
  useLessonTypeLabels,
  useLevelLabels,
} from "@/components/academy/shared";
import { LessonContentEditor } from "@/components/studio/lesson-content-editor";
import { InstructorMultiSelect } from "@/components/studio/instructor-multi-select";
import { LearnerPreview } from "@/components/workspace/learner-preview";
import { MediaLibrary } from "@/components/workspace/media-library";
import { headlineName, listDirectory } from "@/lib/firebase/users";

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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [instructorIds, setInstructorIds] = useState<string[]>([]);
  const [instructorOptions, setInstructorOptions] = useState<
    { uid: string; label: string }[]
  >([]);
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
    setInstructorIds(course.instructorIds ?? []);
    setLevel(course.level);
  }, [course]);

  useEffect(() => {
    let cancelled = false;
    listDirectory(undefined, 120)
      .then((profiles) => {
        if (cancelled) return;
        setInstructorOptions(
          profiles.map((profile) => ({
            uid: profile.uid,
            label: headlineName(profile),
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setInstructorOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchCourseStudents(courseId)
      .then((rows) => {
        if (!cancelled) setStudents(rows);
      })
      .catch(() => {
        if (!cancelled) setStudents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, course?.studentCount]);

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
      instructorIds,
      level,
    });
  }, [course, editable, title, description, teacherName, instructorIds, level]);

  const metaSnapshot = `${title}\0${description}\0${teacherName}\0${instructorIds.join(",")}\0${level}`;
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
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        {t("loading")}
      </div>
    );
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
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-glass-border px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-[11px] font-semibold text-muted hover:text-ink"
            >
              ← {t("navLibrary")}
            </Link>
            <span
              className={`inline-block h-2 w-2 rounded-full ${syncDot}`}
              title={syncLabel ?? undefined}
            />
            {syncLabel ? (
              <span className="text-[11px] text-muted">{syncLabel}</span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-lg sm:text-xl">{course.title}</h1>
            <StatusChip status={course.status} />
          </div>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            className="h-9 px-3 text-xs"
            onClick={() => setMediaOpen(true)}
          >
            {t("actionMedia")}
          </Button>
          <Button
            variant="secondary"
            className="h-9 px-3 text-xs"
            onClick={() => setPreviewOpen(true)}
          >
            {t("actionPreview")}
          </Button>
          {course.status === "draft" && !isAdmin ? (
            <Button
              className="h-9 px-3 text-xs"
              disabled={busy}
              onClick={() => void changeStatus("pending")}
            >
              {t("actionSubmit")}
            </Button>
          ) : null}
          {isAdmin && course.status !== "published" ? (
            <Button
              className="h-9 px-3 text-xs"
              disabled={busy}
              onClick={() => void changeStatus("published")}
            >
              {t("actionPublish")}
            </Button>
          ) : null}
          {isAdmin && course.status === "pending" ? (
            <Button
              variant="secondary"
              className="h-9 px-3 text-xs"
              disabled={busy}
              onClick={() => void changeStatus("draft")}
            >
              {t("actionReject")}
            </Button>
          ) : null}
          {isAdmin && course.status === "published" ? (
            <Button
              variant="secondary"
              className="h-9 px-3 text-xs"
              disabled={busy}
              onClick={() => void changeStatus("draft")}
            >
              {t("actionUnpublish")}
            </Button>
          ) : null}
          <Button
            variant="danger"
            className="h-9 px-3 text-xs"
            disabled={busy}
            onClick={() => void removeCourse()}
          >
            {t("actionDelete")}
          </Button>
        </div>
      </header>

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
                courseInstructorIds={instructorIds}
                instructorOptions={instructorOptions}
                editable={Boolean(editable)}
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
            instructorIds={instructorIds}
            level={level}
            editable={Boolean(editable)}
            onTitle={setTitle}
            onDescription={setDescription}
            onInstructors={(ids, name) => {
              setInstructorIds(ids);
              setTeacherName(name);
            }}
            onLevel={setLevel}
            coverRef={coverRef}
            coverProgress={coverProgress}
            onCover={(file) => void pickCover(file)}
            students={students}
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
  courseInstructorIds,
  instructorOptions,
  editable,
}: {
  courseId: string;
  lesson: Lesson;
  courseInstructorIds: string[];
  instructorOptions: { uid: string; label: string }[];
  editable: boolean;
}) {
  const t = useTranslations();
  const typeLabel = useLessonTypeLabels();
  const [draft, setDraft] = useState(lesson.title);
  const [type, setType] = useState<LessonType>(lesson.type);
  const [instructorId, setInstructorId] = useState<string>(
    lesson.instructorId ?? "",
  );

  useEffect(() => {
    setDraft(lesson.title);
    setType(lesson.type);
    setInstructorId(lesson.instructorId ?? "");
  }, [lesson.id, lesson.title, lesson.type, lesson.instructorId]);

  const lessonInstructorChoices = useMemo(() => {
    const labels = new Map(
      instructorOptions.map((option) => [option.uid, option.label]),
    );
    const ids = [...courseInstructorIds];
    if (instructorId && !ids.includes(instructorId)) {
      ids.push(instructorId);
    }
    return ids.map((uid) => ({
      uid,
      label: labels.get(uid) ?? uid,
    }));
  }, [courseInstructorIds, instructorOptions, instructorId]);

  const persist = async (
    nextTitle: string,
    nextType: LessonType,
    nextInstructorId: string,
  ) => {
    if (!nextTitle.trim()) return;
    const normalizedInstructor = nextInstructorId.trim() || null;
    if (
      nextTitle === lesson.title &&
      nextType === lesson.type &&
      normalizedInstructor === (lesson.instructorId ?? null)
    ) {
      return;
    }
    await upsertLesson({
      courseId,
      lessonId: lesson.id,
      moduleId: lesson.moduleId,
      title: nextTitle,
      order: lesson.order,
      type: nextType,
      instructorId: normalizedInstructor,
    });
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[200px] flex-1">
        <Label>{typeLabel(lesson.type)}</Label>
        <Input
          value={draft}
          disabled={!editable}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void persist(draft, type, instructorId)}
        />
      </div>
      <div>
        <Label>&nbsp;</Label>
        <select
          value={type}
          disabled={!editable}
          onChange={(event) => {
            const next = event.target.value as LessonType;
            setType(next);
            void persist(draft, next, instructorId);
          }}
          className="h-10 rounded-xl border border-glass-border bg-sheet px-3 text-sm disabled:opacity-50"
        >
          {LESSON_TYPES.map((option) => (
            <option key={option} value={option}>
              {typeLabel(option)}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[160px] flex-1">
        <Label>{t("fieldLessonInstructor")}</Label>
        <select
          value={instructorId}
          disabled={!editable}
          onChange={(event) => {
            const next = event.target.value;
            setInstructorId(next);
            void persist(draft, type, next);
          }}
          className="h-10 w-full rounded-xl border border-glass-border bg-sheet px-3 text-sm disabled:opacity-50"
        >
          <option value="">{t("instructorNone")}</option>
          {lessonInstructorChoices.map((option) => (
            <option key={option.uid} value={option.uid}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function SyllabusPane({
  courseId,
  content,
  selectedLessonId,
  selectedModuleId,
  busy,
  onSelectLesson,
  onSelectModule,
  onAddModule,
  onAddLesson,
  onBusy,
}: {
  courseId: string;
  content: CourseContent;
  selectedLessonId: string | null;
  selectedModuleId: string | null;
  busy: boolean;
  onSelectLesson: (lesson: Lesson) => void;
  onSelectModule: (moduleId: string) => void;
  onAddModule: () => void;
  onAddLesson: (moduleId: string) => void;
  onBusy: (value: boolean) => void;
}) {
  const t = useTranslations();
  const [dragLessonId, setDragLessonId] = useState<string | null>(null);

  const lessonsOf = (moduleId: string) =>
    content.lessons.filter((lesson) => lesson.moduleId === moduleId);

  const onDropLesson = async (moduleId: string, targetLessonId: string) => {
    if (!dragLessonId || dragLessonId === targetLessonId) return;
    const group = [...lessonsOf(moduleId)];
    const fromIndex = group.findIndex((lesson) => lesson.id === dragLessonId);
    const toIndex = group.findIndex((lesson) => lesson.id === targetLessonId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = group.splice(fromIndex, 1);
    group.splice(toIndex, 0, moved);

    const flat: string[] = [];
    for (const block of content.modules) {
      const ids =
        block.id === moduleId
          ? group.map((lesson) => lesson.id)
          : lessonsOf(block.id).map((lesson) => lesson.id);
      flat.push(...ids);
    }
    const known = new Set(flat);
    for (const lesson of content.lessons) {
      if (!known.has(lesson.id)) flat.push(lesson.id);
    }

    onBusy(true);
    try {
      await reorderLessons(courseId, flat);
    } finally {
      onBusy(false);
      setDragLessonId(null);
    }
  };

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-glass-border px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {t("workspaceModules")}
        </p>
        <button
          type="button"
          className="text-[11px] font-semibold text-brand hover:underline"
          disabled={busy}
          onClick={onAddModule}
        >
          {t("workspaceAddModule")}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {content.modules.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-muted">
            {t("workspaceAddModule")}
          </p>
        ) : (
          content.modules.map((module) => (
            <ModuleTree
              key={module.id}
              courseId={courseId}
              moduleId={module.id}
              title={module.title}
              order={module.order}
              lessons={lessonsOf(module.id)}
              selected={selectedModuleId === module.id}
              selectedLessonId={selectedLessonId}
              busy={busy}
              dragLessonId={dragLessonId}
              onSelectModule={() => onSelectModule(module.id)}
              onSelectLesson={onSelectLesson}
              onAddLesson={() => onAddLesson(module.id)}
              onDragStart={setDragLessonId}
              onDropLesson={(lessonId) => void onDropLesson(module.id, lessonId)}
              onBusy={onBusy}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function ModuleTree({
  courseId,
  moduleId,
  title,
  order,
  lessons,
  selected,
  selectedLessonId,
  busy,
  dragLessonId,
  onSelectModule,
  onSelectLesson,
  onAddLesson,
  onDragStart,
  onDropLesson,
  onBusy,
}: {
  courseId: string;
  moduleId: string;
  title: string;
  order: number;
  lessons: Lesson[];
  selected: boolean;
  selectedLessonId: string | null;
  busy: boolean;
  dragLessonId: string | null;
  onSelectModule: () => void;
  onSelectLesson: (lesson: Lesson) => void;
  onAddLesson: () => void;
  onDragStart: (lessonId: string) => void;
  onDropLesson: (targetLessonId: string) => void;
  onBusy: (value: boolean) => void;
}) {
  const t = useTranslations();
  const [draft, setDraft] = useState(title);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => setDraft(title), [title]);

  const rename = async () => {
    if (!draft.trim() || draft === title) return;
    onBusy(true);
    try {
      await upsertModule({ courseId, moduleId, title: draft, order });
    } finally {
      onBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`${t("actionDelete")}: ${title}?`)) return;
    onBusy(true);
    try {
      await deleteModule(courseId, moduleId);
    } finally {
      onBusy(false);
    }
  };

  return (
    <div
      className={`mb-2 rounded-xl border ${
        selected ? "border-brand/40 bg-brand/5" : "border-transparent"
      }`}
    >
      <div className="flex items-center gap-1 px-1.5 py-1">
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center text-muted"
          onClick={() => setExpanded((value) => !value)}
        >
          <span className={`text-xs transition-transform ${expanded ? "rotate-90" : ""}`}>
            ▸
          </span>
        </button>
        <input
          value={draft}
          onFocus={onSelectModule}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void rename()}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
        />
        <button
          type="button"
          className="px-1 text-[11px] text-muted hover:text-danger"
          disabled={busy}
          onClick={() => void remove()}
        >
          ✕
        </button>
      </div>
      {expanded ? (
        <ul className="space-y-0.5 px-1 pb-2">
          {lessons.map((lesson) => (
            <LessonTreeRow
              key={lesson.id}
              courseId={courseId}
              lesson={lesson}
              active={lesson.id === selectedLessonId}
              dragging={dragLessonId === lesson.id}
              busy={busy}
              onSelect={() => onSelectLesson(lesson)}
              onDragStart={() => onDragStart(lesson.id)}
              onDrop={() => onDropLesson(lesson.id)}
              onBusy={onBusy}
            />
          ))}
          <li>
            <button
              type="button"
              className="w-full rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold text-brand hover:bg-white/[0.04]"
              disabled={busy}
              onClick={onAddLesson}
            >
              + {t("workspaceAddLesson")}
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

function LessonTreeRow({
  courseId,
  lesson,
  active,
  dragging,
  busy,
  onSelect,
  onDragStart,
  onDrop,
  onBusy,
}: {
  courseId: string;
  lesson: Lesson;
  active: boolean;
  dragging: boolean;
  busy: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDrop: () => void;
  onBusy: (value: boolean) => void;
}) {
  const t = useTranslations();

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const remove = async () => {
    if (!window.confirm(`${t("actionDelete")}: ${lesson.title}?`)) return;
    onBusy(true);
    try {
      await deleteLesson(courseId, lesson.id);
    } finally {
      onBusy(false);
    }
  };

  return (
    <li>
      <div
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", lesson.id);
          event.dataTransfer.effectAllowed = "move";
          onDragStart();
        }}
        onDragOver={onDragOver}
        onDrop={(event) => {
          event.preventDefault();
          onDrop();
        }}
        className={`group flex items-center gap-1 rounded-lg px-1.5 py-1.5 ${
          active ? "bg-brand/20 text-brand" : "hover:bg-white/[0.04]"
        } ${dragging ? "opacity-50" : ""}`}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={onSelect}
        >
          <LessonTypeIcon type={lesson.type} />
          <span className="truncate text-xs">{lesson.title}</span>
        </button>
        <button
          type="button"
          className="inline px-1 text-[10px] text-muted hover:text-danger lg:invisible lg:group-hover:visible"
          disabled={busy}
          onClick={() => void remove()}
        >
          ✕
        </button>
      </div>
    </li>
  );
}

function InspectorPane({
  course,
  title,
  description,
  instructorIds,
  level,
  editable,
  onTitle,
  onDescription,
  onInstructors,
  onLevel,
  coverRef,
  coverProgress,
  onCover,
  students,
}: {
  course: Course;
  title: string;
  description: string;
  instructorIds: string[];
  level: CourseLevel;
  editable: boolean;
  onTitle: (value: string) => void;
  onDescription: (value: string) => void;
  onInstructors: (ids: string[], teacherName: string) => void;
  onLevel: (value: CourseLevel) => void;
  coverRef: RefObject<HTMLInputElement | null>;
  coverProgress: number | null;
  onCover: (file: File | undefined) => void;
  students: CourseStudent[];
}) {
  const t = useTranslations();
  const levelLabel = useLevelLabels();
  const completed = students.filter((row) => row.enrollment.completedAt).length;

  return (
    <aside className="min-h-0 overflow-y-auto p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {t("workspaceInspector")}
      </p>

      <div className="mt-3 space-y-3">
        <div>
          <Label>{t("fieldTitle")}</Label>
          <Input
            value={title}
            disabled={!editable}
            onChange={(event) => onTitle(event.target.value)}
          />
        </div>
        <div>
          <Label>{t("fieldTeacher")}</Label>
          <InstructorMultiSelect
            value={instructorIds}
            disabled={!editable}
            onChange={onInstructors}
          />
        </div>
        <div>
          <Label>{t("fieldLevel")}</Label>
          <select
            value={level}
            disabled={!editable}
            onChange={(event) => onLevel(event.target.value as CourseLevel)}
            className="h-10 w-full rounded-xl border border-glass-border bg-sheet px-3 text-sm disabled:opacity-50"
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
            disabled={!editable}
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
          disabled={!editable}
          onChange={(event) => onCover(event.target.files?.[0])}
          className="mt-2 w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand/14 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand disabled:opacity-50"
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
            <p className="text-[10px] uppercase text-muted">{t("insightsEnrolled")}</p>
            <p className="font-display text-xl">{students.length}</p>
          </div>
          <div className="studio-panel px-3 py-2">
            <p className="text-[10px] uppercase text-muted">{t("insightsCompleted")}</p>
            <p className="font-display text-xl">{completed}</p>
          </div>
        </div>
        <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
          {students.slice(0, 20).map((row) => (
            <li
              key={row.uid}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs"
            >
              <span className="truncate text-muted">{row.uid.slice(0, 10)}…</span>
              <span>
                {Math.round(progressOf(row.enrollment, course.lessonCount) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
