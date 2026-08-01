"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  downloadCsv,
  fetchCourseInsights,
  learnersToCsv,
  type CourseInsightsLearner,
  type InsightsRangeDays,
} from "@/lib/firebase/insights";
import type { LearnerStatusFilter } from "@pulse/insights-metrics";
import { Button, Input } from "@pulse/ui";
import { TablePagination, TableSkeleton } from "@/components/ui/skeleton";

type SortKey = "name" | "progress" | "updated" | "status";

const DEFAULT_PAGE_SIZE = 25;

const STATUS_FILTERS: LearnerStatusFilter[] = [
  "inProgress",
  "all",
  "completed",
  "atRisk",
];

function relativeTime(ms: number | null, locale: string): string {
  if (ms == null) return "—";
  const delta = Date.now() - ms;
  const minutes = Math.round(delta / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.round(hours / 24);
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    -days,
    "day",
  );
}

export function LearnersTable({
  courseId,
  courseTitle,
  locale,
  rangeDays,
}: {
  courseId: string;
  courseTitle: string;
  locale: string;
  rangeDays: InsightsRangeDays;
}) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("progress");
  const [statusFilter, setStatusFilter] =
    useState<LearnerStatusFilter>("inProgress");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [learners, setLearners] = useState<CourseInsightsLearner[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const loadPage = useCallback(
    async (cursor: string | null, opts?: { resetStack?: boolean }) => {
      setLoading(true);
      try {
        const result = await fetchCourseInsights(courseId, rangeDays, {
          learnerLimit: pageSize,
          learnerCursor: cursor,
          learnerStatus: statusFilter,
        });
        setLearners(result.learners);
        setNextCursor(result.nextLearnerCursor ?? null);
        if (opts?.resetStack) {
          setCursorStack([null]);
          setPageIndex(0);
        }
      } catch {
        setLearners([]);
        setNextCursor(null);
        if (opts?.resetStack) {
          setCursorStack([null]);
          setPageIndex(0);
        }
      } finally {
        setLoading(false);
        setReady(true);
      }
    },
    [courseId, pageSize, rangeDays, statusFilter],
  );

  useEffect(() => {
    setReady(false);
    void loadPage(null, { resetStack: true });
  }, [loadPage]);

  const goNext = () => {
    if (!nextCursor) return;
    const nextIndex = pageIndex + 1;
    setCursorStack((prev) => {
      const copy = prev.slice(0, nextIndex);
      copy[nextIndex] = nextCursor;
      return copy;
    });
    setPageIndex(nextIndex);
    void loadPage(nextCursor);
  };

  const goPrev = () => {
    if (pageIndex <= 0) return;
    const prevIndex = pageIndex - 1;
    const cursor = cursorStack[prevIndex] ?? null;
    setPageIndex(prevIndex);
    void loadPage(cursor);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = learners;
    if (q) {
      rows = rows.filter((row) => {
        const hay = `${row.displayName ?? ""} ${row.email ?? ""} ${row.uid}`.toLowerCase();
        return hay.includes(q);
      });
    }
    const sorted = [...rows];
    sorted.sort((a, b) => {
      if (sort === "name") {
        return (a.displayName ?? a.email ?? a.uid).localeCompare(
          b.displayName ?? b.email ?? b.uid,
        );
      }
      if (sort === "updated") {
        return (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0);
      }
      if (sort === "status") {
        const rank = (row: CourseInsightsLearner) =>
          row.completedAtMs != null ? 2 : row.stalled ? 0 : 1;
        return rank(b) - rank(a);
      }
      return b.progress - a.progress;
    });
    return sorted;
  }, [learners, query, sort]);

  const statusLabel = (id: LearnerStatusFilter) => {
    switch (id) {
      case "inProgress":
        return t("insightsFilterInProgress");
      case "completed":
        return t("insightsFilterCompleted");
      case "atRisk":
        return t("insightsFilterAtRisk");
      default:
        return t("insightsFilterAll");
    }
  };

  return (
    <section className="studio-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-glass-border px-4 py-3">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {t("insightsLearners")}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-lg border border-glass-border p-1">
            {STATUS_FILTERS.map((id) => {
              const active = statusFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatusFilter(id)}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                    active
                      ? "bg-brand text-on-brand"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {statusLabel(id)}
                </button>
              );
            })}
          </div>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("insightsSearchLearners")}
            className="h-9 w-48"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-9 rounded-lg border border-glass-border bg-transparent px-2 text-xs text-ink"
          >
            <option value="progress">{t("insightsSortProgress")}</option>
            <option value="name">{t("insightsSortName")}</option>
            <option value="updated">{t("insightsSortActivity")}</option>
            <option value="status">{t("insightsSortStatus")}</option>
          </select>
          <Button
            type="button"
            variant="ghost"
            className="h-9 text-xs"
            disabled={learners.length === 0}
            onClick={() =>
              downloadCsv(
                `${courseTitle.replace(/\s+/g, "-").toLowerCase()}-learners.csv`,
                learnersToCsv(learners),
              )
            }
          >
            {t("insightsExportCsv")}
          </Button>
        </div>
      </div>

      {!ready || loading ? (
        <div className="px-4 py-2">
          <TableSkeleton columns={4} rows={Math.min(pageSize, 8)} />
        </div>
      ) : filtered.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted">{t("insightsNoLearners")}</p>
      ) : (
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-0 bg-panel text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2 font-semibold">{t("insightsColLearner")}</th>
                <th className="px-4 py-2 font-semibold">{t("insightsColProgress")}</th>
                <th className="px-4 py-2 font-semibold">{t("insightsColActivity")}</th>
                <th className="px-4 py-2 font-semibold">{t("insightsColStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const name = row.displayName || row.email || row.uid.slice(0, 8);
                const status =
                  row.completedAtMs != null
                    ? "completed"
                    : row.stalled
                      ? "atRisk"
                      : "active";
                return (
                  <tr
                    key={row.uid}
                    className="border-t border-glass-border/80 hover:bg-brand/[0.04]"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {row.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.photoUrl}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand">
                            {name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium">{name}</p>
                          {row.email ? (
                            <p className="truncate text-xs text-muted">
                              {row.email}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted/20">
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{
                              width: `${Math.round(row.progress * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="tabular-nums text-xs">
                          {Math.round(row.progress * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted">
                      {relativeTime(row.updatedAtMs, locale)}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill status={status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {ready ? (
        <div className="px-4 pb-3">
          <TablePagination
            pageSize={pageSize}
            showing={filtered.length}
            hasPrev={pageIndex > 0}
            hasNext={Boolean(nextCursor)}
            onPrev={goPrev}
            onNext={goNext}
            onPageSizeChange={(size) => setPageSize(size)}
            pageSizeOptions={[25, 50, 100]}
            labelShowing={t("tableShowing", { count: filtered.length })}
            labelPrev={t("tablePrev")}
            labelNext={t("tableNext")}
            labelPageSize={t("tablePageSize")}
          />
        </div>
      ) : null}
    </section>
  );
}

function StatusPill({
  status,
}: {
  status: "completed" | "atRisk" | "active";
}) {
  const t = useTranslations();
  const label =
    status === "completed"
      ? t("insightsStatusCompleted")
      : status === "atRisk"
        ? t("insightsStatusAtRisk")
        : t("insightsStatusActive");
  const tone =
    status === "completed"
      ? "bg-ok/15 text-ok"
      : status === "atRisk"
        ? "bg-warn/18 text-warn"
        : "bg-brand/14 text-brand";
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone}`}
    >
      {label}
    </span>
  );
}
