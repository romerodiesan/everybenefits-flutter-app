"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEnrollments } from "@/lib/providers/enrollments-provider";
import { getPath, progressOf } from "@/lib/firebase/courses";
import { usePublishedCourses } from "@/lib/hooks/use-published-courses";
import type { Course, LearningPath } from "@/lib/types";
import {
  CourseCard,
  EmptyState,
  PageHeader,
  ProgressBar,
  useLevelLabels,
} from "./shared";

export function PathDetail({ pathId }: { pathId: string }) {
  const t = useTranslations();
  const { byCourseId: enrollments } = useEnrollments();
  const { courses } = usePublishedCourses();
  const levelLabel = useLevelLabels();

  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPath(pathId)
      .then((next) => {
        if (cancelled) return;
        setPath(next);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathId]);

  const ordered = useMemo(() => {
    if (!path) return [];
    const byId = new Map(courses.map((course) => [course.id, course]));
    return path.courseIds
      .map((id) => byId.get(id))
      .filter((course): course is Course => Boolean(course));
  }, [path, courses]);

  const aggregate = useMemo(() => {
    if (ordered.length === 0) return 0;
    const total = ordered.reduce(
      (sum, course) =>
        sum + progressOf(enrollments[course.id], course.lessonCount),
      0,
    );
    return total / ordered.length;
  }, [ordered, enrollments]);

  const hours = Math.round(
    ordered.reduce((sum, course) => sum + course.durationMinutes, 0) / 60,
  );

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 text-sm text-muted lg:px-8">
        {t("loading")}
      </div>
    );
  }

  if (!path) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 lg:px-8">
        <EmptyState message={t("pathNotFound")} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
      <Link
        href="/academy"
        className="text-xs font-semibold text-muted transition hover:text-ink"
      >
        ← {t("academyPaths")}
      </Link>
      <div className="mt-3">
        <PageHeader title={path.title} subtitle={path.description} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted">
        <span className="rounded-md bg-ink/[0.07] px-2 py-0.5 uppercase tracking-wide dark:bg-white/[0.08]">
          {levelLabel(path.level)}
        </span>
        <span>{t("pathMeta", { courses: ordered.length, hours })}</span>
      </div>

      {ordered.length > 0 && (
        <div className="mt-4 max-w-sm">
          <ProgressBar value={aggregate} />
          <p className="mt-1.5 text-[11px] font-semibold text-muted">
            {aggregate >= 1
              ? t("academyCompleted")
              : t("academyProgress", { percent: Math.round(aggregate * 100) })}
          </p>
        </div>
      )}

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold">
          {t("pathIncludedCourses")}
        </h2>
        {ordered.length === 0 ? (
          <div className="mt-3">
            <EmptyState message={t("academyCatalogEmpty")} />
          </div>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ordered.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                href={`/academy/${course.id}`}
                progress={
                  enrollments[course.id]
                    ? progressOf(enrollments[course.id], course.lessonCount)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
