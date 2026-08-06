"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { canManageCourses } from "@/lib/roles";
import {
  watchAuthoredCourses,
  watchCoursesInStatuses,
} from "@/lib/firebase/courses";
import { fetchAuthorDashboardStats } from "@/lib/firebase/analytics";
import type { Course, CourseAnalyticsSummary } from "@/lib/types";
import { CourseCover, StatusChip } from "@/components/academy/shared";
import { Button } from "@/components/ui/primitives";

function formatWatch(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="studio-panel px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function DashboardHome() {
  const t = useTranslations();
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [totals, setTotals] = useState<CourseAnalyticsSummary | null>(null);
  const [byCourse, setByCourse] = useState<
    Record<string, CourseAnalyticsSummary>
  >({});
  const [realtimeActive, setRealtimeActive] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  const uid = profile?.uid ?? "";
  const isAdmin = canManageCourses(profile?.role ?? "guest");

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
    if (courses.length === 0) {
      setTotals(null);
      setByCourse({});
      setRealtimeActive(0);
      setLoadingStats(false);
      return;
    }
    let cancelled = false;
    setLoadingStats(true);
    fetchAuthorDashboardStats(courses.map((c) => c.id).slice(0, 24))
      .then((stats) => {
        if (cancelled) return;
        setTotals(stats.totals);
        setByCourse(stats.byCourse);
        setRealtimeActive(stats.realtimeActive);
      })
      .catch(() => {
        if (!cancelled) {
          setTotals(null);
          setByCourse({});
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStats(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courses]);

  const drafts = courses.filter((c) => c.status === "draft").length;
  const pending = courses.filter((c) => c.status === "pending").length;
  const published = courses.filter((c) => c.status === "published").length;

  const topCourses = useMemo(() => {
    return [...courses]
      .map((course) => ({
        course,
        stats: byCourse[course.id],
      }))
      .sort(
        (a, b) =>
          (b.stats?.window28d.views ?? b.course.studentCount) -
          (a.stats?.window28d.views ?? a.course.studentCount),
      )
      .slice(0, 6);
  }, [courses, byCourse]);

  const dropoffAlerts = useMemo(() => {
    return topCourses
      .filter(({ stats }) => {
        if (!stats || stats.enrolled < 5) return false;
        return stats.completionRate < 0.35;
      })
      .slice(0, 3);
  }, [topCourses]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl">
            {t("dashTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("dashSubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/content">
            <Button variant="secondary">{t("navContent")}</Button>
          </Link>
          <Link href="/content?create=course">
            <Button>{t("libraryNewCourse")}</Button>
          </Link>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Kpi label={t("kpiDrafts")} value={drafts} />
        <Kpi label={t("kpiPending")} value={pending} />
        <Kpi label={t("kpiPublished")} value={published} />
        <Kpi
          label={t("dashViews28")}
          value={loadingStats ? "…" : (totals?.window28d.views ?? 0)}
        />
        <Kpi
          label={t("dashWatch28")}
          value={
            loadingStats
              ? "…"
              : formatWatch(totals?.window28d.watchSeconds ?? 0)
          }
        />
        <Kpi
          label={t("dashRealtime")}
          value={loadingStats ? "…" : realtimeActive}
          hint={t("dashRealtimeHint")}
        />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t("dashTopContent")}</h2>
            <Link
              href="/analytics"
              className="text-xs font-semibold text-brand hover:underline"
            >
              {t("navAnalytics")}
            </Link>
          </div>
          {topCourses.length === 0 ? (
            <p className="studio-panel px-4 py-8 text-center text-sm text-muted">
              {t("libraryEmpty")}
            </p>
          ) : (
            <ul className="divide-y divide-glass-border overflow-hidden rounded-xl border border-glass-border bg-panel">
              {topCourses.map(({ course, stats }) => (
                <li key={course.id}>
                  <Link
                    href={`/courses/${course.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-ink/[0.03] dark:hover:bg-white/[0.03]"
                  >
                    <CourseCover
                      course={course}
                      className="h-12 w-20 shrink-0 rounded-md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">
                          {course.title}
                        </p>
                        <StatusChip status={course.status} />
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {(stats?.window28d.views ?? 0).toLocaleString()}{" "}
                        {t("analyticsViews").toLowerCase()}
                        {" · "}
                        {course.studentCount} {t("kpiStudents").toLowerCase()}
                        {" · "}
                        {Math.round((stats?.completionRate ?? 0) * 100)}%{" "}
                        {t("insightsCompletion").toLowerCase()}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          <section className="studio-panel p-4">
            <h2 className="text-sm font-semibold">{t("dashChannel")}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t("insightsEnrolled")}</dt>
                <dd className="font-semibold tabular-nums">
                  {totals?.enrolled ?? 0}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t("insightsCompleted")}</dt>
                <dd className="font-semibold tabular-nums">
                  {totals?.completed ?? 0}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t("analyticsWatchTime")}</dt>
                <dd className="font-semibold tabular-nums">
                  {formatWatch(totals?.watchSeconds ?? 0)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="studio-panel p-4">
            <h2 className="text-sm font-semibold">{t("dashAlerts")}</h2>
            {dropoffAlerts.length === 0 ? (
              <p className="mt-2 text-sm text-muted">{t("dashAlertsEmpty")}</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {dropoffAlerts.map(({ course, stats }) => (
                  <li key={course.id}>
                    <Link
                      href={`/analytics/${course.id}`}
                      className="block rounded-lg bg-warn/10 px-3 py-2 text-sm"
                    >
                      <span className="font-semibold">{course.title}</span>
                      <span className="mt-0.5 block text-[11px] text-muted">
                        {t("dashAlertDropoff", {
                          percent: Math.round((stats?.completionRate ?? 0) * 100),
                        })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="studio-panel p-4">
            <h2 className="text-sm font-semibold">{t("dashShortcuts")}</h2>
            <div className="mt-3 flex flex-col gap-2">
              <Link href="/content" className="text-sm font-medium text-brand">
                {t("navContent")} →
              </Link>
              <Link href="/analytics" className="text-sm font-medium text-brand">
                {t("navAnalytics")} →
              </Link>
              {isAdmin ? (
                <Link href="/review" className="text-sm font-medium text-brand">
                  {t("navReview")} →
                </Link>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
