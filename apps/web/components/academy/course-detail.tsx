"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { canEditCourse } from "@/lib/roles";
import { getFirebaseAuth } from "@pulse/firebase-client";
import { buildSsoHandoffUrl, ssoConsumeUrl } from "@pulse/sso/client";
import {
  enrollInCourse,
  progressOf,
  watchCourse,
  watchCourseContent,
  watchEnrollment,
} from "@/lib/firebase/courses";
import {
  isLessonUnlocked,
  isModuleUnlocked,
} from "@/lib/academy-progress";
import type { Course, CourseContent, Enrollment, Lesson } from "@/lib/types";
import { Button } from "@pulse/ui";
import { DetailPageSkeleton } from "@/components/ui/skeleton";
import {
  CourseCover,
  EmptyState,
  LessonTypeIcon,
  ProgressBar,
  StatusChip,
  useDurationLabel,
  useLevelLabels,
} from "./shared";

export function CourseDetail({ courseId }: { courseId: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { profile } = useAuth();
  const duration = useDurationLabel();
  const levelLabel = useLevelLabels();

  const [course, setCourse] = useState<Course | null>(null);
  const [content, setContent] = useState<CourseContent | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uid = profile?.uid ?? null;

  useEffect(() => {
    return watchCourse(
      courseId,
      (next) => {
        setCourse(next);
        setLoading(false);
      },
      () => {
        setCourse(null);
        setLoading(false);
      },
    );
  }, [courseId]);

  useEffect(() => {
    return watchCourseContent(courseId, setContent, () => setContent(null));
  }, [courseId]);

  useEffect(() => {
    if (!uid) return;
    return watchEnrollment(uid, courseId, setEnrollment, () =>
      setEnrollment(null),
    );
  }, [uid, courseId]);

  const completed = useMemo(
    () => new Set(enrollment?.completedLessonIds ?? []),
    [enrollment],
  );

  const progress = course ? progressOf(enrollment, course.lessonCount) : 0;
  const canEdit = course && profile ? canEditCourse(course, profile) : false;

  const start = async (lesson?: Lesson) => {
    if (!uid || !course) return;
    if (lesson && content && !isLessonUnlocked(content, lesson, enrollment)) {
      setError(t("moduleLocked"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (!enrollment) await enrollInCourse(uid, course.id);
      const unlocked = (item: Lesson) =>
        !content || isLessonUnlocked(content, item, enrollment);
      const target =
        lesson?.id ??
        (enrollment?.lastLessonId &&
        content?.lessons.some(
          (item) => item.id === enrollment.lastLessonId && unlocked(item),
        )
          ? enrollment.lastLessonId
          : undefined) ??
        content?.lessons.find(
          (item) => !completed.has(item.id) && unlocked(item),
        )?.id ??
        content?.lessons.find((item) => unlocked(item))?.id;
      const suffix = target ? `?lesson=${encodeURIComponent(target)}` : "";
      router.push(`/academy/${course.id}/learn${suffix}`);
    } catch {
      setError(t("courseEnrollError"));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <DetailPageSkeleton />;
  }

  if (!course) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 lg:px-8">
        <EmptyState message={t("courseNotFound")} />
      </div>
    );
  }

  const lessonsByModule = (moduleId: string) =>
    (content?.lessons ?? []).filter((lesson) => lesson.moduleId === moduleId);
  const orphanLessons = (content?.lessons ?? []).filter(
    (lesson) =>
      !lesson.moduleId ||
      !(content?.modules ?? []).some((module) => module.id === lesson.moduleId),
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
      <Link
        href="/academy"
        className="text-xs font-semibold text-muted transition hover:text-ink"
      >
        ← {t("academyTitle")}
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <CourseCover course={course} className="h-56 rounded-2xl" />

        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {course.title}
            </h1>
            {course.status !== "published" && (
              <StatusChip status={course.status} />
            )}
          </div>
          {course.teacherName && (
            <p className="mt-1.5 text-sm text-muted">
              {t("courseBy", { name: course.teacherName })}
            </p>
          )}
          <p className="mt-3 text-[11px] font-medium text-muted">
            {[
              levelLabel(course.level),
              t("academyLessonsCount", { count: course.lessonCount }),
              course.durationMinutes > 0
                ? duration(course.durationMinutes)
                : null,
              t("academyStudentsCount", { count: course.studentCount }),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {enrollment && (
            <div className="mt-4">
              <ProgressBar value={progress} />
              <p className="mt-1.5 text-[11px] font-semibold text-muted">
                {progress >= 1
                  ? t("academyCompleted")
                  : t("academyProgress", {
                      percent: Math.round(progress * 100),
                    })}
              </p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              onClick={() => void start()}
              disabled={busy || !uid || (content?.lessons.length ?? 0) === 0}
            >
              {enrollment ? t("courseContinue") : t("courseStart")}
            </Button>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    const user = getFirebaseAuth().currentUser;
                    const path = `/courses/${course.id}`;
                    if (!user) {
                      window.location.assign(
                        `${process.env.NEXT_PUBLIC_STUDIO_URL?.replace(/\/$/, "") || "http://localhost:3001"}/${locale}${path}`,
                      );
                      return;
                    }
                    const idToken = await user.getIdToken();
                    window.location.assign(
                      await buildSsoHandoffUrl(
                        ssoConsumeUrl("studio", locale, path),
                        idToken,
                      ),
                    );
                  })();
                }}
                className="pulse-sheet inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold transition hover:border-brand/40"
              >
                {t("studioOpenEditor")}
              </button>
            )}
          </div>
          {error && <p className="mt-2 text-xs text-[#B42318]">{error}</p>}
        </div>
      </div>

      {course.description && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold">{t("courseAbout")}</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
            {course.description}
          </p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold">{t("courseSyllabus")}</h2>
        {(content?.lessons.length ?? 0) === 0 ? (
          <div className="mt-3">
            <EmptyState message={t("courseNoLessons")} />
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            {(content?.modules ?? []).map((module, index) => (
              <SyllabusModule
                key={module.id}
                index={index + 1}
                title={module.title}
                lessons={lessonsByModule(module.id)}
                completed={completed}
                locked={
                  !!content && !isModuleUnlocked(content, module.id, enrollment)
                }
                busy={busy || !uid}
                onOpen={(lesson) => void start(lesson)}
              />
            ))}
            {orphanLessons.length > 0 && (
              <ul className="pulse-sheet overflow-hidden">
                {orphanLessons.map((lesson) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    done={completed.has(lesson.id)}
                    locked={false}
                    disabled={busy || !uid}
                    onOpen={() => void start(lesson)}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function SyllabusModule({
  index,
  title,
  lessons,
  completed,
  locked,
  busy,
  onOpen,
}: {
  index: number;
  title: string;
  lessons: Lesson[];
  completed: Set<string>;
  locked: boolean;
  busy: boolean;
  onOpen: (lesson: Lesson) => void;
}) {
  const t = useTranslations();
  const [expanded, setExpanded] = useState(index === 1 && !locked);

  return (
    <div className="pulse-sheet overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 border-b border-glass-border px-4 py-3 text-left transition hover:bg-ink/[0.03] dark:hover:bg-white/[0.03]"
      >
        <span
          aria-hidden
          className={`text-sm text-muted transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
        >
          ▸
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">
            {t("courseModule", { index })}
          </span>
          <span className="block text-sm font-semibold">{title}</span>
        </span>
        {locked && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            {t("moduleLockedShort")}
          </span>
        )}
      </button>
      {expanded && (
        <>
          {locked && (
            <p className="border-b border-glass-border px-4 py-2 text-xs text-muted">
              {t("moduleLocked")}
            </p>
          )}
          <ul>
            {lessons.map((lesson) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                done={completed.has(lesson.id)}
                locked={locked}
                disabled={busy || locked}
                onOpen={() => onOpen(lesson)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function LessonRow({
  lesson,
  done,
  locked,
  disabled,
  onOpen,
}: {
  lesson: Lesson;
  done: boolean;
  locked: boolean;
  disabled: boolean;
  onOpen: () => void;
}) {
  const minutes = Math.max(1, Math.round(lesson.durationSeconds / 60));
  return (
    <li className="border-b border-glass-border last:border-0">
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-ink/[0.03] disabled:opacity-60 dark:hover:bg-white/[0.03]"
      >
        {done ? (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/16 text-[11px] font-bold text-brand">
            ✓
          </span>
        ) : locked ? (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink/[0.07] text-[11px] font-bold text-muted dark:bg-white/[0.08]">
            ·
          </span>
        ) : (
          <LessonTypeIcon type={lesson.type} className="rounded-full" />
        )}
        <span className="min-w-0 flex-1 truncate text-sm">{lesson.title}</span>
        <span className="shrink-0 text-[11px] font-medium text-muted">
          {minutes} min
        </span>
      </button>
    </li>
  );
}
