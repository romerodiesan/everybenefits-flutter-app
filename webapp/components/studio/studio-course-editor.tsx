"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { canEditCourse, canManageCourses } from "@/lib/roles";
import {
  deleteCourse,
  deleteLesson,
  deleteModule,
  fetchCourseStudents,
  progressOf,
  reorderLessons,
  reorderModules,
  lessonHasContent,
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
  ProgressBar,
  StatusChip,
  useLessonTypeLabels,
  useLevelLabels,
} from "@/components/academy/shared";
import { LessonContentEditor } from "@/components/studio/lesson-content-editor";

export function StudioCourseEditor({ courseId }: { courseId: string }) {
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

  const isAdmin = canManageCourses(profile?.role ?? "guest");
  const editable = course && profile ? canEditCourse(course, profile) : false;

  if (authLoading || loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 text-sm text-muted lg:px-8">
        {t("loading")}
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 lg:px-8">
        <EmptyState message={t("studioCourseNotFound")} />
      </div>
    );
  }

  if (!editable) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 lg:px-8">
        <EmptyState message={t("studioReadOnly")} />
        <div className="mt-4 text-center">
          <Link href="/studio" className="text-sm font-semibold text-brand">
            {t("studioBackToList")}
          </Link>
        </div>
      </div>
    );
  }

  const changeStatus = async (status: Course["status"]) => {
    setBusy(true);
    try {
      await setCourseStatus(course.id, status);
    } finally {
      setBusy(false);
    }
  };

  const removeCourse = async () => {
    if (!window.confirm(t("studioDeleteConfirm", { title: course.title }))) {
      return;
    }
    setBusy(true);
    try {
      await deleteCourse(course.id);
      router.push("/studio");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/studio"
          className="text-xs font-semibold text-muted transition hover:text-ink"
        >
          ← {t("studioBackToList")}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={course.status} />
          {course.status === "draft" && !isAdmin && (
            <Button
              className="h-9 px-3 text-xs"
              onClick={() => void changeStatus("pending")}
              disabled={busy}
            >
              {t("studioSubmitReview")}
            </Button>
          )}
          {isAdmin && course.status !== "published" && (
            <Button
              className="h-9 px-3 text-xs"
              onClick={() => void changeStatus("published")}
              disabled={busy}
            >
              {t("studioPublish")}
            </Button>
          )}
          {isAdmin && course.status === "pending" && (
            <Button
              variant="secondary"
              className="h-9 px-3 text-xs"
              onClick={() => void changeStatus("draft")}
              disabled={busy}
            >
              {t("studioRejectToDraft")}
            </Button>
          )}
          {isAdmin && course.status === "published" && (
            <Button
              variant="secondary"
              className="h-9 px-3 text-xs"
              onClick={() => void changeStatus("draft")}
              disabled={busy}
            >
              {t("studioUnpublish")}
            </Button>
          )}
          <Button
            variant="danger"
            className="h-9 px-3 text-xs"
            onClick={() => void removeCourse()}
            disabled={busy}
          >
            {t("studioDeleteCourse")}
          </Button>
        </div>
      </div>

      {/* Remount on id change so the form always seeds from the right course. */}
      <MetaSection key={course.id} course={course} />

      <ModulesSection course={course} content={content} />

      <StudentsSection course={course} />
    </div>
  );
}

function MetaSection({ course }: { course: Course }) {
  const t = useTranslations();
  const levelLabel = useLevelLabels();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [teacherName, setTeacherName] = useState(course.teacherName);
  const [level, setLevel] = useState<CourseLevel>(course.level);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [coverProgress, setCoverProgress] = useState<number | null>(null);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateCourseMeta({
        courseId: course.id,
        title,
        description,
        teacherName,
        level,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const pickCover = async (file: File | undefined) => {
    if (!file) return;
    setCoverProgress(0);
    try {
      await uploadCourseCover(course.id, file, setCoverProgress);
    } finally {
      setCoverProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="pulse-sheet p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>{t("studioFieldTitle")}</Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div>
            <Label>{t("studioFieldTeacher")}</Label>
            <Input
              value={teacherName}
              onChange={(event) => setTeacherName(event.target.value)}
            />
          </div>
          <div>
            <Label>{t("studioFieldLevel")}</Label>
            <select
              value={level}
              onChange={(event) =>
                setLevel(event.target.value as CourseLevel)
              }
              className="h-10 w-full rounded-xl border border-glass-border bg-sheet px-3 text-sm text-ink outline-none focus:border-brand"
            >
              {COURSE_LEVELS.map((option) => (
                <option key={option} value={option}>
                  {levelLabel(option)}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label>{t("studioFieldDescription")}</Label>
            <TextArea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={() => void save()} disabled={saving || !title.trim()}>
            {t("studioSaveMeta")}
          </Button>
          {saved && (
            <span className="text-xs font-semibold text-brand">
              {t("studioSaved")}
            </span>
          )}
        </div>
      </div>

      <div className="pulse-sheet overflow-hidden">
        <CourseCover course={course} className="h-32" showLevel={false} />
        <div className="p-4">
          <Label>{t("studioCover")}</Label>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void pickCover(event.target.files?.[0])}
            className="w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand/14 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand"
          />
          {coverProgress !== null && (
            <div className="mt-3">
              <ProgressBar value={coverProgress} />
              <p className="mt-1.5 text-[11px] font-semibold text-muted">
                {t("studioUploading", {
                  percent: Math.round(coverProgress * 100),
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ModulesSection({
  course,
  content,
}: {
  course: Course;
  content: CourseContent;
}) {
  const t = useTranslations();
  const [newModule, setNewModule] = useState("");
  const [busy, setBusy] = useState(false);

  const lessonsOf = (moduleId: string) =>
    content.lessons.filter((lesson) => lesson.moduleId === moduleId);

  const addModule = async () => {
    if (!newModule.trim()) return;
    setBusy(true);
    try {
      await upsertModule({
        courseId: course.id,
        title: newModule,
        order: content.modules.length,
      });
      setNewModule("");
    } finally {
      setBusy(false);
    }
  };

  const moveModule = async (index: number, delta: number) => {
    const next = [...content.modules];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(true);
    try {
      await reorderModules(
        course.id,
        next.map((module) => module.id),
      );
    } finally {
      setBusy(false);
    }
  };

  /** Lesson order is global, so a swap inside a module rewrites the flat list. */
  const moveLesson = async (moduleId: string, index: number, delta: number) => {
    const group = lessonsOf(moduleId);
    const target = index + delta;
    if (target < 0 || target >= group.length) return;
    [group[index], group[target]] = [group[target], group[index]];
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
    setBusy(true);
    try {
      await reorderLessons(course.id, flat);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold">{t("studioModules")}</h2>

      <div className="mt-3 flex flex-wrap gap-2">
        <div className="min-w-[220px] flex-1">
          <Input
            value={newModule}
            onChange={(event) => setNewModule(event.target.value)}
            placeholder={t("studioModuleTitle")}
          />
        </div>
        <Button
          onClick={() => void addModule()}
          disabled={busy || !newModule.trim()}
        >
          {t("studioAddModule")}
        </Button>
      </div>

      {content.modules.length === 0 ? (
        <div className="mt-4">
          <EmptyState message={t("studioNoModules")} />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {content.modules.map((module, index) => (
            <ModuleBlock
              key={module.id}
              courseId={course.id}
              moduleId={module.id}
              title={module.title}
              order={module.order}
              lessons={lessonsOf(module.id)}
              canMoveUp={index > 0}
              canMoveDown={index < content.modules.length - 1}
              totalLessons={content.lessons.length}
              onMove={(delta) => void moveModule(index, delta)}
              onMoveLesson={(lessonIndex, delta) =>
                void moveLesson(module.id, lessonIndex, delta)
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ModuleBlock({
  courseId,
  moduleId,
  title,
  order,
  lessons,
  canMoveUp,
  canMoveDown,
  totalLessons,
  onMove,
  onMoveLesson,
}: {
  courseId: string;
  moduleId: string;
  title: string;
  order: number;
  lessons: Lesson[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  totalLessons: number;
  onMove: (delta: number) => void;
  onMoveLesson: (index: number, delta: number) => void;
}) {
  const t = useTranslations();
  const typeLabel = useLessonTypeLabels();
  const [draftTitle, setDraftTitle] = useState(title);
  const [newLesson, setNewLesson] = useState("");
  const [newLessonType, setNewLessonType] = useState<LessonType>("video");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const renameModule = async () => {
    if (!draftTitle.trim() || draftTitle === title) return;
    setBusy(true);
    try {
      await upsertModule({ courseId, moduleId, title: draftTitle, order });
    } finally {
      setBusy(false);
    }
  };

  const addLesson = async () => {
    if (!newLesson.trim()) return;
    setBusy(true);
    try {
      await upsertLesson({
        courseId,
        moduleId,
        title: newLesson,
        order: totalLessons,
        type: newLessonType,
      });
      setNewLesson("");
    } finally {
      setBusy(false);
    }
  };

  const removeModule = async () => {
    if (!window.confirm(t("studioDeleteConfirm", { title }))) return;
    setBusy(true);
    try {
      await deleteModule(courseId, moduleId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pulse-sheet overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-glass-border p-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-label={
            expanded ? t("studioCollapseModule") : t("studioExpandModule")
          }
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-ink/[0.05] hover:text-ink dark:hover:bg-white/[0.06]"
        >
          <span
            aria-hidden
            className={`block text-sm transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          >
            ▸
          </span>
        </button>
        <div className="min-w-[200px] flex-1">
          <Input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={() => void renameModule()}
          />
        </div>
        <span className="text-[11px] font-semibold text-muted">
          {t("studioLessonCount", { count: lessons.length })}
        </span>
        <IconAction
          label={t("studioMoveUp")}
          disabled={!canMoveUp || busy}
          onClick={() => onMove(-1)}
        >
          ↑
        </IconAction>
        <IconAction
          label={t("studioMoveDown")}
          disabled={!canMoveDown || busy}
          onClick={() => onMove(1)}
        >
          ↓
        </IconAction>
        <IconAction
          label={t("studioDelete")}
          disabled={busy}
          onClick={() => void removeModule()}
        >
          ✕
        </IconAction>
      </div>

      {expanded && (
        <>
          <ul>
            {lessons.map((lesson, index) => (
              <LessonRow
                key={lesson.id}
                courseId={courseId}
                lesson={lesson}
                canMoveUp={index > 0}
                canMoveDown={index < lessons.length - 1}
                onMove={(delta) => onMoveLesson(index, delta)}
              />
            ))}
          </ul>

          <div className="flex flex-wrap gap-2 p-3">
            <div className="min-w-[200px] flex-1">
              <Input
                value={newLesson}
                onChange={(event) => setNewLesson(event.target.value)}
                placeholder={t("studioLessonTitle")}
              />
            </div>
            <select
              value={newLessonType}
              onChange={(event) =>
                setNewLessonType(event.target.value as LessonType)
              }
              aria-label={t("studioLessonType")}
              className="h-10 shrink-0 rounded-xl border border-glass-border bg-sheet px-2.5 text-sm text-ink outline-none focus:border-brand"
            >
              {LESSON_TYPES.map((option) => (
                <option key={option} value={option}>
                  {typeLabel(option)}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              onClick={() => void addLesson()}
              disabled={busy || !newLesson.trim()}
            >
              {t("studioAddLesson")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function LessonRow({
  courseId,
  lesson,
  canMoveUp,
  canMoveDown,
  onMove,
}: {
  courseId: string;
  lesson: Lesson;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (delta: number) => void;
}) {
  const t = useTranslations();
  const typeLabel = useLessonTypeLabels();
  const [draftTitle, setDraftTitle] = useState(lesson.title);
  const [busy, setBusy] = useState(false);

  const ready = lessonHasContent(lesson);
  const minutes = Math.round(lesson.durationSeconds / 60);

  const rename = async () => {
    if (!draftTitle.trim() || draftTitle === lesson.title) return;
    setBusy(true);
    try {
      await upsertLesson({
        courseId,
        lessonId: lesson.id,
        moduleId: lesson.moduleId,
        title: draftTitle,
        order: lesson.order,
      });
    } finally {
      setBusy(false);
    }
  };

  const changeType = async (type: LessonType) => {
    if (type === lesson.type) return;
    setBusy(true);
    try {
      await upsertLesson({
        courseId,
        lessonId: lesson.id,
        moduleId: lesson.moduleId,
        title: lesson.title,
        order: lesson.order,
        type,
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(t("studioDeleteConfirm", { title: lesson.title }))) {
      return;
    }
    setBusy(true);
    try {
      await deleteLesson(courseId, lesson.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="border-b border-glass-border p-3 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[200px] flex-1">
          <Input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={() => void rename()}
          />
        </div>
        <select
          value={lesson.type}
          onChange={(event) =>
            void changeType(event.target.value as LessonType)
          }
          aria-label={t("studioLessonType")}
          disabled={busy}
          className="h-10 shrink-0 rounded-xl border border-glass-border bg-sheet px-2 text-xs text-ink outline-none focus:border-brand"
        >
          {LESSON_TYPES.map((option) => (
            <option key={option} value={option}>
              {typeLabel(option)}
            </option>
          ))}
        </select>
        <span className="text-[11px] font-medium text-muted">
          {ready ? `${Math.max(1, minutes)} min` : t("studioLessonEmpty")}
        </span>
        <IconAction
          label={t("studioMoveUp")}
          disabled={!canMoveUp || busy}
          onClick={() => onMove(-1)}
        >
          ↑
        </IconAction>
        <IconAction
          label={t("studioMoveDown")}
          disabled={!canMoveDown || busy}
          onClick={() => onMove(1)}
        >
          ↓
        </IconAction>
        <IconAction
          label={t("studioDelete")}
          disabled={busy}
          onClick={() => void remove()}
        >
          ✕
        </IconAction>
      </div>

      <div className="mt-2">
        {/* Remount when the type changes so drafts never leak across editors. */}
        <LessonContentEditor
          key={lesson.type}
          courseId={courseId}
          lesson={lesson}
        />
      </div>
    </li>
  );
}

function IconAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm text-muted transition hover:bg-ink/[0.05] hover:text-ink disabled:opacity-40 dark:hover:bg-white/[0.06]"
    >
      {children}
    </button>
  );
}

function StudentsSection({ course }: { course: Course }) {
  const t = useTranslations();
  const [students, setStudents] = useState<CourseStudent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCourseStudents(course.id)
      .then((list) => {
        if (!cancelled) setStudents(list);
      })
      .catch(() => {
        if (!cancelled) setStudents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [course.id]);

  const metrics = useMemo(() => {
    const list = students ?? [];
    if (list.length === 0) return { enrolled: 0, average: 0, completed: 0 };
    const total = list.reduce(
      (sum, entry) => sum + progressOf(entry.enrollment, course.lessonCount),
      0,
    );
    return {
      enrolled: list.length,
      average: total / list.length,
      completed: list.filter((entry) => entry.enrollment.completedAt).length,
    };
  }, [students, course.lessonCount]);

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold">{t("studioStudents")}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Metric label={t("studioMetricEnrolled")} value={`${metrics.enrolled}`} />
        <Metric
          label={t("studioMetricAvgProgress")}
          value={`${Math.round(metrics.average * 100)}%`}
        />
        <Metric
          label={t("studioMetricCompleted")}
          value={`${metrics.completed}`}
        />
      </div>
      {students !== null && students.length === 0 && (
        <div className="mt-3">
          <EmptyState message={t("studioStudentsEmpty")} />
        </div>
      )}
      {students !== null && students.length > 0 && (
        <ul className="pulse-sheet mt-3 overflow-hidden">
          {students.map((entry) => {
            const value = progressOf(entry.enrollment, course.lessonCount);
            return (
              <li
                key={entry.uid}
                className="flex items-center gap-3 border-b border-glass-border px-4 py-3 last:border-0"
              >
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted">
                  {entry.uid}
                </span>
                <span className="w-32">
                  <ProgressBar value={value} />
                </span>
                <span className="w-10 shrink-0 text-right text-[11px] font-semibold text-muted">
                  {Math.round(value * 100)}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="pulse-sheet p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
