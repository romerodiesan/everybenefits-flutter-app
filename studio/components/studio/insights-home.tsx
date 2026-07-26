"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { canManageCourses } from "@/lib/roles";
import {
  fetchCourseStudents,
  progressOf,
  watchAuthoredCourses,
  watchCourseContent,
  watchCoursesInStatuses,
} from "@/lib/firebase/courses";
import type {
  Course,
  CourseContent,
  CourseStudent,
  Lesson,
} from "@/lib/types";

export function InsightsHome({
  initialCourseId = null,
}: {
  initialCourseId?: string | null;
}) {
  const t = useTranslations();
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialCourseId);
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [content, setContent] = useState<CourseContent>({
    modules: [],
    lessons: [],
  });
  const [loadingStudents, setLoadingStudents] = useState(false);

  const uid = profile?.uid ?? "";
  const isAdmin = canManageCourses(profile?.role ?? "guest");

  useEffect(() => {
    if (initialCourseId) setSelectedId(initialCourseId);
  }, [initialCourseId]);

  useEffect(() => {
    if (!uid) return;
    if (isAdmin) {
      return watchCoursesInStatuses(
        ["draft", "pending", "published"],
        setCourses,
        () => setCourses([]),
      );
    }
    return watchAuthoredCourses(uid, setCourses, () => setCourses([]));
  }, [uid, isAdmin]);

  useEffect(() => {
    if (!selectedId && courses[0]) setSelectedId(courses[0].id);
  }, [courses, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setStudents([]);
      setContent({ modules: [], lessons: [] });
      return;
    }
    setLoadingStudents(true);
    let cancelled = false;
    fetchCourseStudents(selectedId)
      .then((rows) => {
        if (!cancelled) setStudents(rows);
      })
      .catch(() => {
        if (!cancelled) setStudents([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingStudents(false);
      });

    const stop = watchCourseContent(
      selectedId,
      setContent,
      () => setContent({ modules: [], lessons: [] }),
    );
    return () => {
      cancelled = true;
      stop();
    };
  }, [selectedId]);

  const selected = courses.find((course) => course.id === selectedId) ?? null;

  const kpis = useMemo(() => {
    const enrolled = students.length;
    const completed = students.filter((row) => row.enrollment.completedAt).length;
    const completion = enrolled > 0 ? completed / enrolled : 0;
    return { enrolled, completed, completion };
  }, [students]);

  const lessonStats = useMemo(() => {
    return content.lessons.map((lesson) => {
      const completedCount = students.filter((row) =>
        row.enrollment.completedLessonIds.includes(lesson.id),
      ).length;
      return { lesson, completedCount };
    });
  }, [content.lessons, students]);

  const quizStats = useMemo(() => {
    const quizzes = content.lessons.filter((lesson) => lesson.type === "quiz");
    return quizzes.map((lesson) => {
      const attempts = students
        .map((row) => row.enrollment.quizAttempts?.[lesson.id])
        .filter(Boolean);
      const passed = attempts.filter((attempt) => attempt?.passed).length;
      const rate = attempts.length > 0 ? passed / attempts.length : 0;
      return {
        lesson,
        attempts: attempts.length,
        passed,
        rate,
      };
    });
  }, [content.lessons, students]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header>
        <h1 className="font-display text-3xl">{t("insightsTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t("insightsSubtitle")}</p>
      </header>

      {courses.length === 0 ? (
        <p className="mt-10 text-sm text-muted">{t("libraryEmpty")}</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="space-y-1">
            {courses.map((course) => {
              const active = course.id === selectedId;
              return (
                <Link
                  key={course.id}
                  href={`/insights/${course.id}`}
                  onClick={() => setSelectedId(course.id)}
                  className={`block rounded-lg px-3 py-2 text-sm transition ${
                    active
                      ? "bg-brand/20 text-brand"
                      : "text-muted hover:bg-white/[0.04] hover:text-ink"
                  }`}
                >
                  <span className="block truncate font-medium">{course.title}</span>
                  <span className="text-[11px] opacity-80">
                    {course.studentCount} {t("kpiStudents").toLowerCase()}
                  </span>
                </Link>
              );
            })}
          </aside>

          <div>
            {!selected ? (
              <p className="text-sm text-muted">{t("insightsPick")}</p>
            ) : loadingStudents ? (
              <p className="text-sm text-muted">{t("loading")}</p>
            ) : (
              <CourseInsights
                course={selected}
                kpis={kpis}
                lessonStats={lessonStats}
                quizStats={quizStats}
                students={students}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CourseInsights({
  course,
  kpis,
  lessonStats,
  quizStats,
  students,
}: {
  course: Course;
  kpis: { enrolled: number; completed: number; completion: number };
  lessonStats: { lesson: Lesson; completedCount: number }[];
  quizStats: {
    lesson: Lesson;
    attempts: number;
    passed: number;
    rate: number;
  }[];
  students: CourseStudent[];
}) {
  const t = useTranslations();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">{course.title}</h2>
          <Link
            href={`/courses/${course.id}`}
            className="mt-1 inline-block text-xs font-semibold text-brand"
          >
            {t("navLibrary")} →
          </Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi label={t("insightsEnrolled")} value={kpis.enrolled} />
        <Kpi label={t("insightsCompleted")} value={kpis.completed} />
        <Kpi
          label={t("insightsCompletion")}
          value={`${Math.round(kpis.completion * 100)}%`}
        />
      </div>

      <section className="mt-8">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {t("insightsDropoff")}
        </h3>
        {lessonStats.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("workspaceNoLesson")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {lessonStats.map(({ lesson, completedCount }) => {
              const rate =
                kpis.enrolled > 0 ? completedCount / kpis.enrolled : 0;
              return (
                <li
                  key={lesson.id}
                  className="studio-panel flex items-center justify-between gap-3 px-3 py-2"
                >
                  <span className="min-w-0 truncate text-sm">{lesson.title}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {completedCount}/{kpis.enrolled} · {Math.round(rate * 100)}%
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {t("insightsQuizPass")}
        </h3>
        {quizStats.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("studioQuizEmpty")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {quizStats.map(({ lesson, attempts, passed, rate }) => (
              <li
                key={lesson.id}
                className="studio-panel flex items-center justify-between gap-3 px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm">{lesson.title}</span>
                <span className="shrink-0 text-xs text-muted">
                  {passed}/{attempts} · {Math.round(rate * 100)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {students.length > 0 ? (
        <section className="mt-8">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {t("workspaceStudents")}
          </h3>
          <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
            {students.map((row) => (
              <li
                key={row.uid}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs"
              >
                <span className="truncate text-muted">{row.uid}</span>
                <span>
                  {Math.round(
                    progressOf(row.enrollment, course.lessonCount) * 100,
                  )}
                  %
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="studio-panel px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}
