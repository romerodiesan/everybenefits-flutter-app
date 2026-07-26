"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { canAuthorCourses } from "@/lib/roles";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { handoffUrlWithToken, ssoConsumeUrl } from "@/lib/sso";
import {
  progressOf,
  watchEnrollments,
  watchPaths,
  watchPublishedCourses,
} from "@/lib/firebase/courses";
import type {
  Course,
  CourseLevel,
  Enrollment,
  LearningPath,
} from "@/lib/types";
import { Input } from "@/components/ui/primitives";
import {
  CourseCard,
  CourseCover,
  EmptyState,
  LevelFilters,
  PageHeader,
  ProgressBar,
  useLevelLabels,
} from "./shared";

export function AcademyCatalog() {
  const t = useTranslations();
  const locale = useLocale();
  const { profile } = useAuth();
  const levelLabel = useLevelLabels();

  const [courses, setCourses] = useState<Course[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [enrollments, setEnrollments] = useState<Record<string, Enrollment>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [level, setLevel] = useState<CourseLevel | "all">("all");
  const [query, setQuery] = useState("");

  const uid = profile?.uid ?? null;
  const role = profile?.role ?? "guest";
  const isAuthor = canAuthorCourses(role);

  useEffect(() => {
    const stop = watchPublishedCourses(
      (next) => {
        setCourses(next);
        setLoading(false);
        setFailed(false);
      },
      () => {
        setLoading(false);
        setFailed(true);
      },
    );
    return stop;
  }, []);

  useEffect(() => {
    return watchPaths(setPaths, () => setPaths([]));
  }, []);

  useEffect(() => {
    if (!uid) return;
    return watchEnrollments(
      uid,
      (list) => {
        const map: Record<string, Enrollment> = {};
        for (const entry of list) map[entry.courseId] = entry;
        setEnrollments(map);
      },
      // Guests can't read enrollments; the catalog still works.
      () => setEnrollments({}),
    );
  }, [uid]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return courses
      .filter((course) => level === "all" || course.level === level)
      .filter((course) => {
        if (!needle) return true;
        return (
          course.title.toLowerCase().includes(needle) ||
          course.description.toLowerCase().includes(needle) ||
          course.teacherName.toLowerCase().includes(needle)
        );
      });
  }, [courses, level, query]);

  const keepLearning = useMemo(() => {
    const byId = new Map(courses.map((course) => [course.id, course]));
    return Object.values(enrollments)
      .map((enrollment) => {
        const course = byId.get(enrollment.courseId);
        if (!course) return null;
        const progress = progressOf(enrollment, course.lessonCount);
        return progress >= 1 ? null : { course, enrollment, progress };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort(
        (a, b) =>
          (b.enrollment.updatedAt?.getTime() ?? 0) -
          (a.enrollment.updatedAt?.getTime() ?? 0),
      )
      .slice(0, 3);
  }, [courses, enrollments]);

  const pathMeta = (path: LearningPath) => {
    const byId = new Map(courses.map((course) => [course.id, course]));
    const minutes = path.courseIds.reduce(
      (sum, id) => sum + (byId.get(id)?.durationMinutes ?? 0),
      0,
    );
    return t("pathMeta", {
      courses: path.courseIds.length,
      hours: Math.round(minutes / 60),
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        title={t("academyTitle")}
        subtitle={t("academySubtitle")}
        actions={
          isAuthor ? (
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  const user = getFirebaseAuth().currentUser;
                  if (!user) {
                    window.location.assign(
                      `${process.env.NEXT_PUBLIC_STUDIO_URL?.replace(/\/$/, "") || "http://localhost:3001"}/${locale}`,
                    );
                    return;
                  }
                  const idToken = await user.getIdToken();
                  window.location.assign(
                    handoffUrlWithToken(
                      ssoConsumeUrl("studio", locale, "/"),
                      idToken,
                    ),
                  );
                })();
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand transition hover:brightness-110"
            >
              {t("academyStudioLink")}
            </button>
          ) : undefined
        }
      />

      {keepLearning.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-lg font-bold">
            {t("academyKeepLearning")}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {keepLearning.map(({ course, progress }) => (
              <Link
                key={course.id}
                href={`/academy/${course.id}`}
                className="pulse-sheet flex items-center gap-3 overflow-hidden p-3 transition hover:border-brand/40"
              >
                <CourseCover
                  course={course}
                  className="h-14 w-24 rounded-lg"
                  showLevel={false}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {course.title}
                  </p>
                  <div className="mt-2">
                    <ProgressBar value={progress} />
                  </div>
                  <p className="mt-1.5 text-[11px] font-medium text-muted">
                    {t("academyProgress", {
                      percent: Math.round(progress * 100),
                    })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold">{t("academyPaths")}</h2>
        {paths.length === 0 ? (
          <div className="mt-3">
            <EmptyState message={t("pathsEmpty")} />
          </div>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paths.map((path) => (
              <Link
                key={path.id}
                href={`/academy/paths/${path.id}`}
                className="pulse-sheet p-4 transition hover:border-brand/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-base font-bold leading-snug">
                    {path.title}
                  </h3>
                  <span className="shrink-0 rounded-md bg-ink/[0.07] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted dark:bg-white/[0.08]">
                    {levelLabel(path.level)}
                  </span>
                </div>
                {path.description && (
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted">
                    {path.description}
                  </p>
                )}
                <p className="mt-3 text-[11px] font-medium text-muted">
                  {pathMeta(path)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">
            {t("academyCourses")}
          </h2>
          <div className="w-full sm:w-64">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("academySearchPlaceholder")}
              aria-label={t("academySearchPlaceholder")}
            />
          </div>
        </div>
        <div className="mt-3">
          <LevelFilters value={level} onChange={setLevel} />
        </div>

        <div className="mt-5">
          {loading ? (
            <p className="text-sm text-muted">{t("loading")}</p>
          ) : failed ? (
            <EmptyState message={t("academyLoadError")} />
          ) : filtered.length === 0 ? (
            <EmptyState
              message={
                query.trim()
                  ? t("academyNoResults", { query: query.trim() })
                  : courses.length === 0
                    ? t("academyCatalogEmpty")
                    : t("academyEmptyFilter")
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((course) => (
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
        </div>
      </section>
    </div>
  );
}
