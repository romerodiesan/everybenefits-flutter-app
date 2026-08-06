"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { canManageCourses } from "@/lib/roles";
import {
  watchAuthoredCourses,
  watchAuthoredPaths,
  watchCourse,
  watchCourseContent,
  watchCoursesInStatuses,
  watchPathsInStatuses,
} from "@/lib/firebase/courses";
import {
  fetchAuthorDashboardStats,
  fetchCourseAnalytics,
  type CourseAnalyticsBundle,
} from "@/lib/firebase/analytics";
import {
  ANALYTICS_MIN_COHORT,
  COURSE_LEVELS,
  type Course,
  type CourseAnalyticsSummary,
  type CourseContent,
  type CourseLevel,
  type CourseStatus,
  type LearningPath,
  type Lesson,
} from "@/lib/types";
import {
  CourseCover,
  StatusChip,
  useLevelLabels,
} from "@/components/academy/shared";
import { Input } from "@/components/ui/primitives";
import { CoursePicker } from "@/components/studio/course-picker";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/studio/analytics-charts";

type TabId = "overview" | "engagement" | "audience" | "traffic" | "realtime";
type RangeId = "7d" | "28d" | "90d";

const LANDING_PAGE_SIZE = 25;

type PathFilter = "all" | "none" | string;
type LevelFilter = "all" | CourseLevel;
type StatusFilter = "all" | CourseStatus;
type SortKey = "views" | "students" | "completion" | "title" | "watch";

function formatWatch(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex w-full min-w-[9rem] flex-col gap-1 text-[11px] font-medium text-muted sm:w-40">
      {label}
      <select
        className="h-9 w-full rounded-lg border border-glass-border bg-sheet px-2.5 text-sm text-ink outline-none focus:border-brand"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function useAuthorCatalog() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const uid = profile?.uid ?? "";
  const isAdmin = canManageCourses(profile?.role ?? "guest");

  useEffect(() => {
    if (!uid) return;
    if (isAdmin) {
      const stops = [
        watchCoursesInStatuses(
          ["draft", "pending", "published"],
          setCourses,
          () => setCourses([]),
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
      watchAuthoredCourses(uid, setCourses, () => setCourses([])),
      watchAuthoredPaths(uid, setPaths, () => setPaths([])),
    ];
    return () => stops.forEach((s) => s());
  }, [uid, isAdmin]);

  return { courses, paths };
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

function ChartFrame({
  title,
  children,
  empty,
}: {
  title: string;
  children: ReactNode;
  empty?: boolean;
}) {
  const t = useTranslations();
  return (
    <section className="studio-panel p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 h-56 w-full">
        {empty ? (
          <p className="flex h-full items-center justify-center text-sm text-muted">
            {t("analyticsNoData")}
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function RankedList({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string | number }[];
}) {
  const t = useTranslations();
  return (
    <section className="studio-panel p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t("analyticsNoData")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="truncate">{row.label}</span>
              <span className="shrink-0 tabular-nums text-muted">
                {row.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AnalyticsLanding({
  courses,
  paths,
}: {
  courses: Course[];
  paths: LearningPath[];
}) {
  const t = useTranslations();
  const levelLabel = useLevelLabels();
  const [query, setQuery] = useState("");
  const [pathFilter, setPathFilter] = useState<PathFilter>("all");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [instructorFilter, setInstructorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("views");
  const [byCourse, setByCourse] = useState<
    Record<string, CourseAnalyticsSummary>
  >({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [visibleCount, setVisibleCount] = useState(LANDING_PAGE_SIZE);

  const pathsByCourse = useMemo(() => {
    const map = new Map<string, LearningPath[]>();
    for (const path of paths) {
      for (const courseId of path.courseIds) {
        const list = map.get(courseId) ?? [];
        list.push(path);
        map.set(courseId, list);
      }
    }
    return map;
  }, [paths]);

  const pathOptions = useMemo(
    () => [...paths].sort((a, b) => a.title.localeCompare(b.title)),
    [paths],
  );

  const instructorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const course of courses) {
      const names = course.teacherName
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      course.instructorIds.forEach((id, index) => {
        if (!id || map.has(id)) return;
        map.set(id, names[index] ?? names[0] ?? id);
      });
      if (course.instructorIds.length === 0 && course.teacherName.trim()) {
        const key = `name:${course.teacherName.trim().toLowerCase()}`;
        if (!map.has(key)) map.set(key, course.teacherName.trim());
      }
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [courses]);

  useEffect(() => {
    setVisibleCount(LANDING_PAGE_SIZE);
  }, [query, pathFilter, levelFilter, instructorFilter, statusFilter, sort]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return courses.filter((course) => {
      if (statusFilter !== "all" && course.status !== statusFilter) return false;
      if (levelFilter !== "all" && course.level !== levelFilter) return false;

      if (pathFilter === "none") {
        if ((pathsByCourse.get(course.id) ?? []).length > 0) return false;
      } else if (pathFilter !== "all") {
        const inPath = (pathsByCourse.get(course.id) ?? []).some(
          (p) => p.id === pathFilter,
        );
        if (!inPath) return false;
      }

      if (instructorFilter !== "all") {
        if (instructorFilter.startsWith("name:")) {
          const want = instructorFilter.slice(5);
          if (course.teacherName.trim().toLowerCase() !== want) return false;
        } else if (!course.instructorIds.includes(instructorFilter)) {
          return false;
        }
      }

      if (!needle) return true;
      const pathTitles = (pathsByCourse.get(course.id) ?? [])
        .map((p) => p.title.toLowerCase())
        .join(" ");
      return (
        course.title.toLowerCase().includes(needle) ||
        course.teacherName.toLowerCase().includes(needle) ||
        pathTitles.includes(needle)
      );
    });
  }, [
    courses,
    query,
    pathFilter,
    levelFilter,
    instructorFilter,
    statusFilter,
    pathsByCourse,
  ]);

  const ranked = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const statsA = byCourse[a.id];
      const statsB = byCourse[b.id];
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "students") return b.studentCount - a.studentCount;
      if (sort === "completion") {
        return (statsB?.completionRate ?? 0) - (statsA?.completionRate ?? 0);
      }
      if (sort === "watch") {
        return (
          (statsB?.window28d.watchSeconds ?? 0) -
          (statsA?.window28d.watchSeconds ?? 0)
        );
      }
      const viewsA = statsA?.window28d.views ?? a.studentCount;
      const viewsB = statsB?.window28d.views ?? b.studentCount;
      if (viewsB !== viewsA) return viewsB - viewsA;
      return a.title.localeCompare(b.title);
    });
  }, [filtered, byCourse, sort]);

  const visible = ranked.slice(0, visibleCount);
  const hasActiveFilters =
    query.trim() !== "" ||
    pathFilter !== "all" ||
    levelFilter !== "all" ||
    instructorFilter !== "all" ||
    statusFilter !== "all";

  useEffect(() => {
    if (filtered.length === 0) {
      setByCourse({});
      setLoadingStats(false);
      return;
    }
    let cancelled = false;
    setLoadingStats(true);
    const seed = [...filtered]
      .sort((a, b) => b.studentCount - a.studentCount)
      .slice(0, 40)
      .map((c) => c.id);
    fetchAuthorDashboardStats(seed)
      .then((stats) => {
        if (!cancelled) setByCourse(stats.byCourse);
      })
      .catch(() => {
        if (!cancelled) setByCourse({});
      })
      .finally(() => {
        if (!cancelled) setLoadingStats(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filtered]);

  const clearFilters = () => {
    setQuery("");
    setPathFilter("all");
    setLevelFilter("all");
    setInstructorFilter("all");
    setStatusFilter("all");
    setSort("views");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl">
            {t("analyticsTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("analyticsSubtitle")}</p>
        </div>
      </header>

      {courses.length === 0 ? (
        <p className="mt-10 text-sm text-muted">{t("libraryEmpty")}</p>
      ) : (
        <>
          <div className="mt-5 studio-panel space-y-3 p-3 sm:p-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-[11px] font-medium text-muted">
                {t("librarySearch")}
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("analyticsSearchHint")}
                  aria-label={t("librarySearch")}
                />
              </label>
              <FilterSelect
                label={t("fieldPath")}
                value={pathFilter}
                onChange={setPathFilter}
              >
                <option value="all">{t("libraryFilterAll")}</option>
                <option value="none">{t("analyticsPathNone")}</option>
                {pathOptions.map((path) => (
                  <option key={path.id} value={path.id}>
                    {path.title}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label={t("fieldLevel")}
                value={levelFilter}
                onChange={(v) => setLevelFilter(v as LevelFilter)}
              >
                <option value="all">{t("libraryFilterAll")}</option>
                {COURSE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {levelLabel(level)}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label={t("fieldTeacher")}
                value={instructorFilter}
                onChange={setInstructorFilter}
              >
                <option value="all">{t("libraryFilterAll")}</option>
                {instructorOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label={t("contentColVisibility")}
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <option value="all">{t("libraryFilterAll")}</option>
                <option value="draft">{t("libraryFilterDraft")}</option>
                <option value="pending">{t("libraryFilterPending")}</option>
                <option value="published">{t("libraryFilterPublished")}</option>
              </FilterSelect>
              <FilterSelect
                label={t("contentSort")}
                value={sort}
                onChange={(v) => setSort(v as SortKey)}
              >
                <option value="views">{t("contentSortViews")}</option>
                <option value="watch">{t("analyticsWatchTime")}</option>
                <option value="students">{t("contentSortStudents")}</option>
                <option value="completion">{t("insightsCompletion")}</option>
                <option value="title">{t("contentSortTitle")}</option>
              </FilterSelect>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">
                {t("analyticsCourseCount", { count: filtered.length })}
                {loadingStats ? " · …" : null}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  {t("analyticsClearFilters")}
                </button>
              ) : null}
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="mt-8 text-sm text-muted">{t("analyticsNoCourseMatch")}</p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-glass-border bg-panel">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <caption className="sr-only">{t("analyticsTitle")}</caption>
                  <thead className="border-b border-glass-border bg-rail/60 text-[11px] uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">
                        {t("contentColVideo")}
                      </th>
                      <th className="hidden px-3 py-2.5 font-semibold lg:table-cell">
                        {t("fieldPath")}
                      </th>
                      <th className="hidden px-3 py-2.5 font-semibold md:table-cell">
                        {t("fieldLevel")}
                      </th>
                      <th className="hidden px-3 py-2.5 font-semibold xl:table-cell">
                        {t("fieldTeacher")}
                      </th>
                      <th className="px-3 py-2.5 font-semibold">
                        {t("contentColVisibility")}
                      </th>
                      <th className="px-3 py-2.5 font-semibold tabular-nums">
                        {t("kpiStudents")}
                      </th>
                      <th className="hidden px-3 py-2.5 font-semibold tabular-nums sm:table-cell">
                        {t("dashViews28")}
                      </th>
                      <th className="hidden px-3 py-2.5 font-semibold tabular-nums md:table-cell">
                        {t("dashWatch28")}
                      </th>
                      <th className="hidden px-3 py-2.5 font-semibold tabular-nums lg:table-cell">
                        {t("insightsCompletion")}
                      </th>
                      <th className="px-3 py-2.5 font-semibold">
                        {t("contentColActions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border">
                    {visible.map((course) => {
                      const stats = byCourse[course.id];
                      const coursePaths = pathsByCourse.get(course.id) ?? [];
                      return (
                        <tr
                          key={course.id}
                          className="hover:bg-ink/[0.025] dark:hover:bg-white/[0.025]"
                        >
                          <td className="px-3 py-2.5">
                            <Link
                              href={`/analytics/${course.id}`}
                              className="flex items-center gap-3"
                            >
                              <CourseCover
                                course={course}
                                className="h-11 w-[4.75rem] shrink-0 rounded-md"
                                showLevel={false}
                              />
                              <div className="min-w-0">
                                <p className="truncate font-semibold">
                                  {course.title}
                                </p>
                                <p className="truncate text-[11px] text-muted md:hidden">
                                  {levelLabel(course.level)}
                                  {course.teacherName
                                    ? ` · ${course.teacherName}`
                                    : ""}
                                </p>
                              </div>
                            </Link>
                          </td>
                          <td className="hidden max-w-[10rem] px-3 py-2.5 text-xs text-muted lg:table-cell">
                            {coursePaths.length === 0 ? (
                              <span>—</span>
                            ) : (
                              <span className="line-clamp-2">
                                {coursePaths.map((p) => p.title).join(", ")}
                              </span>
                            )}
                          </td>
                          <td className="hidden px-3 py-2.5 text-xs text-muted md:table-cell">
                            {levelLabel(course.level)}
                          </td>
                          <td className="hidden max-w-[9rem] truncate px-3 py-2.5 text-xs text-muted xl:table-cell">
                            {course.teacherName || "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            <StatusChip status={course.status} />
                          </td>
                          <td className="px-3 py-2.5 tabular-nums">
                            {course.studentCount}
                          </td>
                          <td className="hidden px-3 py-2.5 tabular-nums sm:table-cell">
                            {(stats?.window28d.views ?? 0).toLocaleString()}
                          </td>
                          <td className="hidden px-3 py-2.5 tabular-nums md:table-cell">
                            {formatWatch(stats?.window28d.watchSeconds ?? 0)}
                          </td>
                          <td className="hidden px-3 py-2.5 tabular-nums lg:table-cell">
                            {Math.round((stats?.completionRate ?? 0) * 100)}%
                          </td>
                          <td className="px-3 py-2.5">
                            <Link
                              href={`/analytics/${course.id}`}
                              className="text-xs font-semibold text-brand"
                            >
                              {t("analyticsOpen")}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {visibleCount < ranked.length ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((n) => n + LANDING_PAGE_SIZE)
                }
                className="rounded-lg px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/10"
              >
                {t("analyticsShowMore", {
                  remaining: ranked.length - visibleCount,
                })}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function AnalyticsCourseDetail({
  courseId,
  courses,
}: {
  courseId: string;
  courses: Course[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [selected, setSelected] = useState<Course | null>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [range, setRange] = useState<RangeId>("28d");
  const [bundle, setBundle] = useState<CourseAnalyticsBundle | null>(null);
  const [content, setContent] = useState<CourseContent>({
    modules: [],
    lessons: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return watchCourse(courseId, setSelected, () => setSelected(null));
  }, [courseId]);

  useEffect(() => {
    setLoading(true);
    let cancelled = false;
    fetchCourseAnalytics(courseId)
      .then((next) => {
        if (!cancelled) setBundle(next);
      })
      .catch(() => {
        if (!cancelled) setBundle(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const stop = watchCourseContent(
      courseId,
      setContent,
      () => setContent({ modules: [], lessons: [] }),
    );
    return () => {
      cancelled = true;
      stop();
    };
  }, [courseId]);

  const summary = bundle?.summary;
  const days = useMemo(() => {
    const all = bundle?.days ?? [];
    const keep = range === "7d" ? 7 : range === "28d" ? 28 : 90;
    return all.slice(-keep);
  }, [bundle?.days, range]);

  const lessonTitle = (id: string) =>
    content.lessons.find((l) => l.id === id)?.title ?? id;

  const retentionSeries = useMemo(() => {
    const lessons = bundle?.lessons ?? [];
    const primary =
      lessons.find((l) => l.retentionBuckets.some((n) => n > 0)) ?? lessons[0];
    if (!primary) return [];
    return primary.retentionBuckets.map((count, pct) => ({
      pct,
      viewers: count,
    }));
  }, [bundle?.lessons]);

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: t("analyticsTabOverview") },
    { id: "engagement", label: t("analyticsTabEngagement") },
    { id: "audience", label: t("analyticsTabAudience") },
    { id: "traffic", label: t("analyticsTabTraffic") },
    { id: "realtime", label: t("analyticsTabRealtime") },
  ];

  const title = selected?.title ?? t("loading");
  const pickerCourses = useMemo(() => {
    if (!selected || courses.some((c) => c.id === selected.id)) return courses;
    return [selected, ...courses];
  }, [courses, selected]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/analytics"
              className="text-xs font-semibold text-muted hover:text-ink"
            >
              ← {t("analyticsTitle")}
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <CoursePicker
              courses={pickerCourses}
              value={courseId}
              onSelectAction={(id) => router.push(`/analytics/${id}`)}
              className="w-full sm:w-80"
            />
            <div className="flex rounded-lg border border-glass-border p-0.5">
              {(["7d", "28d", "90d"] as RangeId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRange(id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    range === id
                      ? "bg-brand/15 text-brand"
                      : "text-muted"
                  }`}
                >
                  {t(`analyticsRange${id}` as "analyticsRange7d")}
                </button>
              ))}
            </div>
          </div>
          <h1 className="mt-3 font-display text-2xl md:text-3xl">{title}</h1>
          {selected ? (
            <Link
              href={`/courses/${selected.id}`}
              className="mt-1 inline-block text-xs font-semibold text-brand"
            >
              {t("contentEdit")} →
            </Link>
          ) : null}
        </div>
      </header>

      {!selected && !loading ? (
        <p className="mt-10 text-sm text-muted">{t("insightsPick")}</p>
      ) : loading && !bundle ? (
        <p className="mt-10 text-sm text-muted">{t("loading")}</p>
      ) : (
        <>
          <div
            className="mt-5 flex flex-wrap gap-1 border-b border-glass-border pb-2"
            role="tablist"
            aria-label={t("analyticsTitle")}
          >
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  tab === item.id
                    ? "bg-ink/10 text-ink dark:bg-white/10"
                    : "text-muted hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-5" role="tabpanel">
            {tab === "overview" ? (
              <OverviewTab
                summary={summary}
                days={days}
                formatWatch={formatWatch}
              />
            ) : null}
            {tab === "engagement" ? (
              <EngagementTab
                bundle={bundle}
                lessons={content.lessons}
                retentionSeries={retentionSeries}
                lessonTitle={lessonTitle}
              />
            ) : null}
            {tab === "audience" ? <AudienceTab bundle={bundle} /> : null}
            {tab === "traffic" ? <TrafficTab bundle={bundle} /> : null}
            {tab === "realtime" ? (
              <RealtimeTab
                bundle={bundle}
                lessonTitle={lessonTitle}
                formatWatch={formatWatch}
              />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

export function AnalyticsHome({
  initialCourseId = null,
}: {
  initialCourseId?: string | null;
}) {
  const { courses, paths } = useAuthorCatalog();

  if (initialCourseId) {
    return (
      <AnalyticsCourseDetail courseId={initialCourseId} courses={courses} />
    );
  }
  return <AnalyticsLanding courses={courses} paths={paths} />;
}

function OverviewTab({
  summary,
  days,
  formatWatch,
}: {
  summary: CourseAnalyticsBundle["summary"] | undefined;
  days: CourseAnalyticsBundle["days"];
  formatWatch: (n: number) => string;
}) {
  const t = useTranslations();
  const window = summary?.window28d;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={t("insightsEnrolled")} value={summary?.enrolled ?? 0} />
        <Kpi label={t("analyticsViews")} value={summary?.views ?? 0} />
        <Kpi
          label={t("analyticsWatchTime")}
          value={formatWatch(summary?.watchSeconds ?? 0)}
        />
        <Kpi
          label={t("analyticsAvgView")}
          value={formatWatch(summary?.avgViewDurationSeconds ?? 0)}
        />
        <Kpi
          label={t("insightsCompletion")}
          value={`${Math.round((summary?.completionRate ?? 0) * 100)}%`}
        />
        <Kpi
          label={t("dashViews28")}
          value={window?.views ?? 0}
          hint={formatWatch(window?.watchSeconds ?? 0)}
        />
      </div>
      <ChartFrame title={t("analyticsViewsOverTime")} empty={days.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={days}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={36} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="views"
              stroke="var(--brand)"
              fill="color-mix(in srgb, var(--brand) 25%, transparent)"
              name={t("analyticsViews")}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>
      <ChartFrame title={t("analyticsWatchOverTime")} empty={days.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={days}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={40} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="watchSeconds"
              stroke="var(--brand)"
              strokeWidth={2}
              dot={false}
              name={t("analyticsWatchTime")}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}

function EngagementTab({
  bundle,
  lessons,
  retentionSeries,
  lessonTitle,
}: {
  bundle: CourseAnalyticsBundle | null;
  lessons: Lesson[];
  retentionSeries: { pct: number; viewers: number }[];
  lessonTitle: (id: string) => string;
}) {
  const t = useTranslations();
  const summary = bundle?.summary;
  const funnel = [
    { step: t("analyticsImpressions"), value: summary?.impressions ?? 0 },
    { step: t("analyticsOpens"), value: summary?.opens ?? 0 },
    { step: t("analyticsViews"), value: summary?.views ?? 0 },
    { step: t("insightsCompleted"), value: summary?.completed ?? 0 },
  ];
  const lessonRows = (bundle?.lessons ?? [])
    .map((row) => {
      const lesson = lessons.find((l) => l.id === row.lessonId);
      return {
        label: lesson?.title ?? row.lessonId,
        started: row.started,
        completed: row.completed,
        watchSeconds: row.watchSeconds,
        quizPass:
          row.quizAttempts > 0
            ? `${Math.round((row.quizPasses / row.quizAttempts) * 100)}%`
            : "—",
      };
    })
    .sort((a, b) => b.started - a.started);

  return (
    <div className="space-y-4">
      <ChartFrame title={t("analyticsFunnel")} empty={funnel.every((f) => !f.value)}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={funnel}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis dataKey="step" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={36} />
            <Tooltip />
            <Bar dataKey="value" fill="var(--brand)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
      <ChartFrame
        title={t("analyticsRetention")}
        empty={!retentionSeries.some((r) => r.viewers > 0)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={retentionSeries}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis dataKey="pct" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={36} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="viewers"
              stroke="var(--brand)"
              strokeWidth={2}
              dot={false}
              name={t("analyticsViewers")}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>
      <section className="studio-panel overflow-hidden">
        <h3 className="border-b border-glass-border px-4 py-3 text-sm font-semibold">
          {t("analyticsLessonPerf")}
        </h3>
        {lessonRows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">{t("analyticsNoData")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2">{t("contentColVideo")}</th>
                  <th className="px-4 py-2">{t("analyticsStarted")}</th>
                  <th className="px-4 py-2">{t("insightsCompleted")}</th>
                  <th className="px-4 py-2">{t("insightsQuizPass")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {lessonRows.map((row) => (
                  <tr key={row.label}>
                    <td className="px-4 py-2">{row.label}</td>
                    <td className="px-4 py-2 tabular-nums">{row.started}</td>
                    <td className="px-4 py-2 tabular-nums">{row.completed}</td>
                    <td className="px-4 py-2 tabular-nums">{row.quizPass}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {bundle?.realtime.topLessonIds?.length ? (
        <p className="sr-only">
          {bundle.realtime.topLessonIds.map(lessonTitle).join(", ")}
        </p>
      ) : null}
    </div>
  );
}

function AudienceTab({ bundle }: { bundle: CourseAnalyticsBundle | null }) {
  const t = useTranslations();
  const audience = bundle?.audience;
  const toRows = (map: Record<string, number> | undefined) =>
    Object.entries(map ?? {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value }));

  const hours = (audience?.byHourUtc ?? []).map((value, hour) => ({
    hour: `${hour}:00`,
    value,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi
          label={t("analyticsUnique")}
          value={audience?.uniqueViewersApprox ?? 0}
        />
        <Kpi
          label={t("analyticsReturning")}
          value={audience?.returningViewersApprox ?? 0}
        />
        <Kpi
          label={t("analyticsCohort")}
          value={ANALYTICS_MIN_COHORT}
          hint={
            audience?.suppressed
              ? t("analyticsSuppressed")
              : t("analyticsCohortHint")
          }
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <RankedList title={t("analyticsByCountry")} rows={toRows(audience?.byCountry)} />
        <RankedList title={t("analyticsByDevice")} rows={toRows(audience?.byDevice)} />
        <RankedList title={t("analyticsByLocale")} rows={toRows(audience?.byLocale)} />
      </div>
      <ChartFrame
        title={t("analyticsByHour")}
        empty={!hours.some((h) => h.value > 0)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={hours}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
            <YAxis tick={{ fontSize: 11 }} width={32} />
            <Tooltip />
            <Bar dataKey="value" fill="var(--brand)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}

function TrafficTab({ bundle }: { bundle: CourseAnalyticsBundle | null }) {
  const t = useTranslations();
  const traffic = bundle?.traffic;
  const rows = Object.entries(traffic?.bySource ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t("analyticsImpressions")} value={traffic?.impressions ?? 0} />
        <Kpi label={t("analyticsOpens")} value={traffic?.opens ?? 0} />
        <Kpi
          label={t("analyticsCtr")}
          value={`${Math.round((traffic?.ctr ?? 0) * 1000) / 10}%`}
        />
        <Kpi label={t("analyticsSources")} value={rows.length} />
      </div>
      <ChartFrame title={t("analyticsTrafficSources")} empty={rows.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="label"
              width={90}
              tick={{ fontSize: 11 }}
            />
            <Tooltip />
            <Bar dataKey="value" fill="var(--brand)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
      <RankedList title={t("analyticsTrafficSources")} rows={rows} />
    </div>
  );
}

function RealtimeTab({
  bundle,
  lessonTitle,
  formatWatch,
}: {
  bundle: CourseAnalyticsBundle | null;
  lessonTitle: (id: string) => string;
  formatWatch: (n: number) => string;
}) {
  const t = useTranslations();
  const rt = bundle?.realtime;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi label={t("dashRealtime")} value={rt?.activeSessions ?? 0} />
        <Kpi label={t("analyticsViews60")} value={rt?.viewsLast60m ?? 0} />
        <Kpi
          label={t("analyticsWatch60")}
          value={formatWatch(rt?.watchSecondsLast60m ?? 0)}
        />
      </div>
      <RankedList
        title={t("analyticsActiveContent")}
        rows={(rt?.topLessonIds ?? []).map((id) => ({
          label: lessonTitle(id),
          value: t("analyticsLive"),
        }))}
      />
      <p className="text-[11px] text-muted">{t("analyticsRealtimeHint")}</p>
    </div>
  );
}
