"use client";

import { useTranslations } from "next-intl";
import {
  CourseCover,
  ProgressBar,
  useLevelLabels,
} from "@/components/academy/shared";
import {
  LANDING_COURSES,
  LANDING_COURSE_PROGRESS,
  LANDING_PATH,
} from "@/lib/landing/fixtures";

export function AcademyScreen() {
  const t = useTranslations();
  const levelLabel = useLevelLabels();
  const keep = LANDING_COURSES.map((course) => ({
    course,
    progress: LANDING_COURSE_PROGRESS[course.id] ?? 0,
  }));
  const pathMinutes = LANDING_PATH.courseIds.reduce((sum, id) => {
    const course = LANDING_COURSES.find((c) => c.id === id);
    return sum + (course?.durationMinutes ?? 0);
  }, 0);

  return (
    <div className="flex h-full flex-col overflow-hidden px-3 pt-2.5">
      <div className="mb-3">
        <h1 className="font-display text-xl font-extrabold tracking-tight">
          {t("academyTitle")}
        </h1>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted">
          {t("academySubtitle")}
        </p>
      </div>

      <section className="mb-3">
        <h2 className="font-display text-sm font-bold">
          {t("academyKeepLearning")}
        </h2>
        <div className="mt-2 space-y-2">
          {keep.map(({ course, progress }) => (
            <div
              key={course.id}
              className="pulse-sheet flex items-center gap-2.5 overflow-hidden p-2.5"
            >
              <CourseCover
                course={course}
                className="h-12 w-20 rounded-lg"
                showLevel={false}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{course.title}</p>
                <div className="mt-1.5">
                  <ProgressBar value={progress} />
                </div>
                <p className="mt-1 text-[10px] font-medium text-muted">
                  {t("academyProgress", {
                    percent: Math.round(progress * 100),
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="min-h-0 flex-1 overflow-hidden">
        <h2 className="font-display text-sm font-bold">
          {t("academyPaths")}
        </h2>
        <div className="mt-2 pulse-sheet overflow-hidden">
          <div className="border-b border-glass-border px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand">
              {levelLabel(LANDING_PATH.level)}
            </p>
            <p className="mt-0.5 font-display text-sm font-bold leading-snug">
              {LANDING_PATH.title}
            </p>
            <p className="mt-1 text-[10px] text-muted">
              {t("pathMeta", {
                courses: LANDING_PATH.courseIds.length,
                hours: Math.round(pathMinutes / 60),
              })}
            </p>
          </div>
          <div className="space-y-0.5 p-1.5">
            {LANDING_COURSES.map((course) => (
              <div
                key={course.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5"
              >
                <CourseCover
                  course={course}
                  className="h-9 w-14 rounded-md"
                  showLevel={false}
                />
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold">
                    {course.title}
                  </p>
                  <p className="text-[9px] text-muted">
                    {t("academyLessonsCount", { count: course.lessonCount })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
