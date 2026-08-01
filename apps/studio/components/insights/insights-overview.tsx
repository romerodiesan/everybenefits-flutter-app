"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { canManageCourses } from "@pulse/shared";
import {
  watchAuthoredCourses,
  watchAuthoredPaths,
  watchCoursesInStatuses,
  watchPathsInStatuses,
} from "@/lib/firebase/courses";
import {
  fetchCatalogInsights,
  type CatalogInsightsResult,
} from "@/lib/firebase/insights";
import { FunctionsUnavailableError } from "@pulse/firebase-client";
import { StatusChip } from "@/components/academy/shared";
import { PortfolioStudents } from "@/components/insights/portfolio-students";
import { Input } from "@pulse/ui";
import type { Course, CourseStatus, LearningPath } from "@/lib/types";

type StatusFilter = "all" | CourseStatus;

export function InsightsOverview() {
  const t = useTranslations();
  const { profile } = useAuth();
  const uid = profile?.uid ?? "";
  const isAdmin = canManageCourses(profile?.role ?? "guest");

  const [courses, setCourses] = useState<Course[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [listReady, setListReady] = useState(false);
  const [catalog, setCatalog] = useState<CatalogInsightsResult | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!uid) return;
    setListReady(false);
    if (isAdmin) {
      const stops = [
        watchCoursesInStatuses(
          ["draft", "pending", "published"],
          (next) => {
            setCourses(next);
            setListReady(true);
          },
          () => {
            setCourses([]);
            setListReady(true);
          },
        ),
        watchPathsInStatuses(
          ["draft", "pending", "published"],
          setPaths,
          () => setPaths([]),
        ),
      ];
      return () => stops.forEach((s) => s());
    }
    const stops = [
      watchAuthoredCourses(
        uid,
        (next) => {
          setCourses(next);
          setListReady(true);
        },
        () => {
          setCourses([]);
          setListReady(true);
        },
      ),
      watchAuthoredPaths(uid, setPaths, () => setPaths([])),
    ];
    return () => stops.forEach((s) => s());
  }, [uid, isAdmin]);

  const courseIdsKey = useMemo(
    () => courses.map((c) => c.id).sort().join(","),
    [courses],
  );
  const pathPayload = useMemo(() => {
    const published = paths
      .filter((p) => p.status === "published")
      .slice(0, 5)
      .map((p) => ({
        pathId: p.id,
        title: p.title,
        courseIds: p.courseIds,
      }));
    return published;
  }, [paths]);

  const pathPayloadKey = useMemo(
    () =>
      pathPayload
        .map((p) => `${p.pathId}:${p.courseIds.join("+")}`)
        .join("|"),
    [pathPayload],
  );

  useEffect(() => {
    if (!listReady || courses.length === 0) {
      setCatalog(null);
      return;
    }
    let cancelled = false;
    setLoadingCatalog(true);
    setError(null);
    fetchCatalogInsights({
      courseIds: courses.map((c) => c.id),
      paths: pathPayload,
    })
      .then((result) => {
        if (!cancelled) setCatalog(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof FunctionsUnavailableError) {
          setError(t("insightsFunctionsUnavailable"));
        } else {
          setError(t("insightsLoadError"));
        }
        setCatalog(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalog(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pathPayload keyed separately
  }, [listReady, courseIdsKey, pathPayloadKey, t]);

  const filteredRows = useMemo(() => {
    const rows = catalog?.courses ?? [];
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (q && !row.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [catalog, query, statusFilter]);

  if (!listReady) {
    return <OverviewSkeleton />;
  }

  if (courses.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header>
          <h1 className="font-display text-3xl">{t("insightsTitle")}</h1>
          <p className="mt-1 text-sm text-muted">{t("insightsSubtitle")}</p>
        </header>
        <p className="mt-10 text-sm text-muted">{t("libraryEmpty")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">{t("insightsTitle")}</h1>
          <p className="mt-1 text-sm text-muted">{t("insightsSubtitlePro")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("insightsSearchCourses")}
            className="h-9 w-52"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-9 rounded-lg border border-glass-border bg-transparent px-2 text-xs text-ink"
          >
            <option value="all">{t("libraryFilterAll")}</option>
            <option value="published">{t("statusPublished")}</option>
            <option value="pending">{t("statusPending")}</option>
            <option value="draft">{t("statusDraft")}</option>
          </select>
        </div>
      </header>

      {error ? (
        <p className="mt-6 text-sm text-muted">{error}</p>
      ) : loadingCatalog && !catalog ? (
        <OverviewSkeleton compact />
      ) : catalog ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi
              label={t("insightsActiveStudents")}
              value={catalog.kpis.activeStudents}
            />
            <Kpi
              label={t("insightsAvgCompletion")}
              value={`${Math.round(catalog.kpis.avgCompletionRate * 100)}%`}
            />
            <Kpi
              label={t("insightsAvgProgress")}
              value={`${Math.round(catalog.kpis.avgProgress * 100)}%`}
            />
            <Kpi
              label={t("insightsAtRisk")}
              value={catalog.kpis.atRiskLearners}
            />
          </div>

          <PortfolioStudents students={catalog.students ?? []} />

          <section className="studio-panel mt-8 overflow-hidden">
            <div className="border-b border-glass-border px-4 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {t("insightsPortfolio")}
              </h2>
            </div>
            {filteredRows.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted">
                {t("insightsNoMatchingCourses")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-[11px] uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-2 font-semibold">
                        {t("insightsColCourse")}
                      </th>
                      <th className="px-4 py-2 font-semibold">
                        {t("insightsInProgress")}
                      </th>
                      <th className="px-4 py-2 font-semibold">
                        {t("insightsEnrolled")}
                      </th>
                      <th className="px-4 py-2 font-semibold">
                        {t("insightsCompleted")}
                      </th>
                      <th className="px-4 py-2 font-semibold">
                        {t("insightsCompletion")}
                      </th>
                      <th className="px-4 py-2 font-semibold">
                        {t("insightsQuizPass")}
                      </th>
                      <th className="px-4 py-2 font-semibold">
                        {t("insightsColStatus")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => {
                      const status = (
                        ["draft", "pending", "published"].includes(row.status)
                          ? row.status
                          : "draft"
                      ) as CourseStatus;
                      return (
                        <tr
                          key={row.courseId}
                          className="border-t border-glass-border/80 hover:bg-brand/[0.04]"
                        >
                          <td className="px-4 py-3">
                            <Link
                              href={`/insights/${row.courseId}`}
                              className="font-medium text-ink hover:text-brand"
                            >
                              {row.title}
                            </Link>
                            {row.stalled > 0 ? (
                              <p className="text-[11px] text-warn">
                                {row.stalled} {t("insightsAtRisk").toLowerCase()}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {row.inProgress ?? row.activeStudentCount ?? 0}
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {row.enrolled}
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {row.completed}
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {Math.round(row.completionRate * 100)}%
                          </td>
                          <td className="px-4 py-3 tabular-nums text-muted">
                            {row.quizAvgPassRate == null
                              ? "—"
                              : `${Math.round(row.quizAvgPassRate * 100)}%`}
                          </td>
                          <td className="px-4 py-3">
                            <StatusChip status={status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {(catalog.attention.dropOffs.length > 0 ||
            catalog.attention.weakQuizzes.length > 0) && (
            <section className="mt-8 grid gap-4 lg:grid-cols-2">
              {catalog.attention.dropOffs.length > 0 ? (
                <div className="studio-panel p-4">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {t("insightsAttentionDropoffs")}
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {catalog.attention.dropOffs.map((row) => (
                      <li key={`${row.courseId}-${row.lessonId}`}>
                        <Link
                          href={`/insights/${row.courseId}`}
                          className="flex items-center justify-between gap-3 text-sm hover:text-brand"
                        >
                          <span className="min-w-0 truncate">
                            <span className="text-muted">{row.courseTitle}</span>
                            {" · "}
                            {row.lessonTitle}
                          </span>
                          <span className="shrink-0 text-xs text-warn">
                            −{Math.round(row.dropFromPrev * 100)}%
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {catalog.attention.weakQuizzes.length > 0 ? (
                <div className="studio-panel p-4">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {t("insightsAttentionQuizzes")}
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {catalog.attention.weakQuizzes.map((row) => (
                      <li key={`${row.courseId}-${row.lessonId}`}>
                        <Link
                          href={`/insights/${row.courseId}`}
                          className="flex items-center justify-between gap-3 text-sm hover:text-brand"
                        >
                          <span className="min-w-0 truncate">
                            <span className="text-muted">{row.courseTitle}</span>
                            {" · "}
                            {row.lessonTitle}
                          </span>
                          <span className="shrink-0 text-xs text-warn">
                            {Math.round(row.passRate * 100)}%
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          )}

          {catalog.paths.length > 0 ? (
            <section className="mt-8">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {t("insightsPathsStrip")}
              </h2>
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {catalog.paths.map((path) => (
                  <div
                    key={path.pathId}
                    className="studio-panel min-w-[220px] shrink-0 p-4"
                  >
                    <p className="truncate text-sm font-medium">{path.title}</p>
                    <p className="mt-2 font-display text-2xl tabular-nums">
                      {Math.round(path.completionRate * 100)}%
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                      {path.learnersCompletedAll}/{path.learnersStartedAny}{" "}
                      {t("insightsPathCompleteHint")}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="studio-panel px-4 py-3"
    >
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl tabular-nums">{value}</p>
    </motion.div>
  );
}

function OverviewSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`mx-auto max-w-6xl animate-pulse px-6 ${compact ? "mt-6" : "py-8"}`}
    >
      {!compact ? (
        <>
          <div className="h-9 w-48 rounded bg-muted/20" />
          <div className="mt-2 h-4 w-80 rounded bg-muted/15" />
        </>
      ) : null}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="studio-panel h-20" />
        ))}
      </div>
      <div className="studio-panel mt-8 h-64" />
    </div>
  );
}
