"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { canManageCourses } from "@/lib/roles";
import {
  createPath,
  watchAuthoredCourses,
  watchAuthoredPaths,
  watchCoursesInStatuses,
  watchPathsInStatuses,
} from "@/lib/firebase/courses";
import { fetchAuthorDashboardStats } from "@/lib/firebase/analytics";
import {
  COURSE_LEVELS,
  type Course,
  type CourseAnalyticsSummary,
  type CourseLevel,
  type CourseStatus,
  type LearningPath,
} from "@/lib/types";
import { Button, Input, Label, TextArea } from "@/components/ui/primitives";
import {
  CourseCover,
  StatusChip,
  useLevelLabels,
} from "@/components/academy/shared";
import { CreateCoursesWizard } from "@/components/studio/create-courses-wizard";

const LIBRARY_PAGE_SIZE = 40;

type Tab = "courses" | "paths";
type CreateKind = "course" | "path" | null;
type StatusFilter = "all" | CourseStatus;
type SortKey = "updated" | "title" | "students" | "views";

const emptyPathForm = {
  title: "",
  description: "",
  level: "basic" as CourseLevel,
};

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return value.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function LibraryHome() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const levelLabel = useLevelLabels();

  const [tab, setTab] = useState<Tab>("courses");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");
  const [courses, setCourses] = useState<Course[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [statsByCourse, setStatsByCourse] = useState<
    Record<string, CourseAnalyticsSummary>
  >({});
  const [listReady, setListReady] = useState(false);
  const [visibleCount, setVisibleCount] = useState(LIBRARY_PAGE_SIZE);
  const [creating, setCreating] = useState<CreateKind>(null);
  const [busy, setBusy] = useState(false);
  const [pathForm, setPathForm] = useState(emptyPathForm);

  const uid = profile?.uid ?? "";
  const isAdmin = canManageCourses(profile?.role ?? "guest");

  useEffect(() => {
    const create = searchParams.get("create");
    if (create === "course" || create === "path") {
      setCreating(create);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!uid) return;
    setListReady(false);
    const onCourses = (next: Course[]) => {
      setCourses(next);
      setListReady(true);
    };
    const onPaths = (next: LearningPath[]) => {
      setPaths(next);
    };
    if (isAdmin) {
      const stops = [
        watchCoursesInStatuses(
          ["draft", "pending", "published"],
          onCourses,
          () => {
            setCourses([]);
            setListReady(true);
          },
        ),
        watchPathsInStatuses(
          ["draft", "pending", "published"],
          onPaths,
          () => setPaths([]),
        ),
      ];
      return () => stops.forEach((s) => s());
    }
    const stops = [
      watchAuthoredCourses(uid, onCourses, () => {
        setCourses([]);
        setListReady(true);
      }),
      watchAuthoredPaths(uid, onPaths, () => setPaths([])),
    ];
    return () => stops.forEach((s) => s());
  }, [uid, isAdmin]);

  useEffect(() => {
    if (courses.length === 0) {
      setStatsByCourse({});
      return;
    }
    let cancelled = false;
    fetchAuthorDashboardStats(courses.map((c) => c.id).slice(0, 24))
      .then((stats) => {
        if (!cancelled) setStatsByCourse(stats.byCourse);
      })
      .catch(() => {
        if (!cancelled) setStatsByCourse({});
      });
    return () => {
      cancelled = true;
    };
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = courses.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.teacherName.toLowerCase().includes(q)
      );
    });
    return list.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "students") return b.studentCount - a.studentCount;
      if (sort === "views") {
        return (
          (statsByCourse[b.id]?.views ?? 0) - (statsByCourse[a.id]?.views ?? 0)
        );
      }
      const aTime = a.updatedAt?.getTime() ?? 0;
      const bTime = b.updatedAt?.getTime() ?? 0;
      return bTime - aTime;
    });
  }, [courses, filter, query, sort, statsByCourse]);

  const visibleCourses = filteredCourses.slice(0, visibleCount);

  const filteredPaths = useMemo(() => {
    const q = query.trim().toLowerCase();
    return paths.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (!q) return true;
      return p.title.toLowerCase().includes(q);
    });
  }, [paths, filter, query]);

  const kpis = useMemo(() => {
    const list = tab === "courses" ? courses : paths;
    return {
      drafts: list.filter((x) => x.status === "draft").length,
      pending: list.filter((x) => x.status === "pending").length,
      published: list.filter((x) => x.status === "published").length,
      students: courses.reduce((sum, c) => sum + (c.studentCount ?? 0), 0),
    };
  }, [tab, courses, paths]);

  const createPathDisabled = busy || !pathForm.title.trim();

  const createPathOnly = async () => {
    if (!profile || !pathForm.title.trim()) return;
    setBusy(true);
    try {
      const id = await createPath({
        title: pathForm.title.trim(),
        description: pathForm.description.trim(),
        level: pathForm.level,
        createdBy: profile.uid,
      });
      setCreating(null);
      setPathForm(emptyPathForm);
      router.push(`/paths/${id}`);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    setVisibleCount(LIBRARY_PAGE_SIZE);
  }, [filter, query, sort, tab]);

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "all", label: t("libraryFilterAll") },
    { id: "draft", label: t("libraryFilterDraft") },
    { id: "pending", label: t("libraryFilterPending") },
    { id: "published", label: t("libraryFilterPublished") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl">
            {t("contentTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("contentSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setCreating("path")}>
            {t("libraryNewPath")}
          </Button>
          <Button onClick={() => setCreating("course")}>
            {t("libraryNewCourse")}
          </Button>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          [t("kpiDrafts"), kpis.drafts],
          [t("kpiPending"), kpis.pending],
          [t("kpiPublished"), kpis.published],
          [t("kpiStudents"), kpis.students],
        ].map(([label, value]) => (
          <div key={String(label)} className="studio-panel px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-muted">
              {label}
            </p>
            <p className="mt-1 font-display text-2xl">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-glass-border p-0.5">
          {(["courses", "paths"] as Tab[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === id ? "bg-brand/15 text-brand" : "text-muted"
              }`}
            >
              {id === "courses" ? t("tabCourses") : t("tabPaths")}
            </button>
          ))}
        </div>
        <Input
          className="w-full sm:max-w-xs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("librarySearch")}
        />
        <div className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                filter === f.id
                  ? "bg-ink/10 text-ink dark:bg-white/10"
                  : "text-muted hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {tab === "courses" ? (
          <label className="ml-auto flex items-center gap-2 text-xs text-muted">
            {t("contentSort")}
            <select
              className="h-8 rounded-lg border border-glass-border bg-sheet px-2 text-xs text-ink"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="updated">{t("contentSortUpdated")}</option>
              <option value="title">{t("contentSortTitle")}</option>
              <option value="students">{t("contentSortStudents")}</option>
              <option value="views">{t("contentSortViews")}</option>
            </select>
          </label>
        ) : null}
      </div>

      {tab === "courses" ? (
        <div className="mt-5 overflow-hidden rounded-xl border border-glass-border bg-panel">
          {!listReady ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-lg bg-ink/[0.04]"
                />
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">
              {t("libraryEmpty")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <caption className="sr-only">{t("contentTitle")}</caption>
                <thead className="border-b border-glass-border bg-rail/60 text-[11px] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">
                      {t("contentColVideo")}
                    </th>
                    <th className="px-3 py-2.5 font-semibold">
                      {t("contentColVisibility")}
                    </th>
                    <th className="hidden px-3 py-2.5 font-semibold md:table-cell">
                      {t("contentColDate")}
                    </th>
                    <th className="px-3 py-2.5 font-semibold tabular-nums">
                      {t("kpiStudents")}
                    </th>
                    <th className="hidden px-3 py-2.5 font-semibold tabular-nums lg:table-cell">
                      {t("analyticsViews")}
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
                  {visibleCourses.map((course) => {
                    const stats = statsByCourse[course.id];
                    return (
                      <tr
                        key={course.id}
                        className="hover:bg-ink/[0.025] dark:hover:bg-white/[0.025]"
                      >
                        <td className="px-3 py-2.5">
                          <Link
                            href={`/courses/${course.id}`}
                            className="flex items-center gap-3"
                          >
                            <CourseCover
                              course={course}
                              className="h-12 w-[5.25rem] shrink-0 rounded-md"
                              showLevel={false}
                            />
                            <div className="min-w-0">
                              <p className="truncate font-semibold">
                                {course.title}
                              </p>
                              <p className="truncate text-[11px] text-muted">
                                {course.teacherName || levelLabel(course.level)}
                                {" · "}
                                {t("academyLessonsCount", {
                                  count: course.lessonCount,
                                })}
                              </p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusChip status={course.status} />
                        </td>
                        <td className="hidden px-3 py-2.5 text-xs text-muted md:table-cell">
                          {formatDate(course.updatedAt)}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {course.studentCount}
                        </td>
                        <td className="hidden px-3 py-2.5 tabular-nums lg:table-cell">
                          {(stats?.views ?? 0).toLocaleString()}
                        </td>
                        <td className="hidden px-3 py-2.5 tabular-nums lg:table-cell">
                          {Math.round((stats?.completionRate ?? 0) * 100)}%
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/courses/${course.id}`}
                              className="text-xs font-semibold text-brand"
                            >
                              {t("contentEdit")}
                            </Link>
                            <Link
                              href={`/analytics/${course.id}`}
                              className="text-xs font-semibold text-muted hover:text-ink"
                            >
                              {t("navAnalytics")}
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filteredCourses.length > visibleCount ? (
            <div className="mt-3 flex justify-center">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setVisibleCount((n) => n + LIBRARY_PAGE_SIZE)
                }
              >
                {t("analyticsShowMore", {
                  remaining: filteredCourses.length - visibleCount,
                })}
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPaths.length === 0 ? (
            <p className="col-span-full text-sm text-muted">
              {t("libraryEmptyPaths")}
            </p>
          ) : (
            filteredPaths.map((path) => (
              <Link
                key={path.id}
                href={`/paths/${path.id}`}
                className="studio-panel p-4 transition hover:border-brand/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-base font-bold">
                    {path.title}
                  </h2>
                  <StatusChip status={path.status} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted">
                  {path.description || t("pathEmpty")}
                </p>
                <p className="mt-3 text-[11px] font-medium text-muted">
                  {t("pathCourses")}: {path.courseIds.length}
                </p>
              </Link>
            ))
          )}
        </div>
      )}

      {creating === "course" && profile ? (
        <CreateCoursesWizard
          paths={paths}
          createdBy={profile.uid}
          defaultTeacherName={
            profile.displayName || profile.email || "Instructor"
          }
          onClose={() => setCreating(null)}
        />
      ) : null}

      {creating === "path" ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
          onClick={() => !busy && setCreating(null)}
        >
          <div
            className="studio-panel w-full max-w-lg p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-xl">{t("createPathTitle")}</h2>
            <div className="mt-4 space-y-3">
              <div>
                <Label>{t("fieldTitle")}</Label>
                <Input
                  value={pathForm.title}
                  onChange={(e) =>
                    setPathForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>{t("fieldDescription")}</Label>
                <TextArea
                  value={pathForm.description}
                  onChange={(e) =>
                    setPathForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>{t("fieldLevel")}</Label>
                <select
                  className="h-10 w-full rounded-xl border border-glass-border bg-sheet px-3 text-sm"
                  value={pathForm.level}
                  onChange={(e) =>
                    setPathForm((f) => ({
                      ...f,
                      level: e.target.value as CourseLevel,
                    }))
                  }
                >
                  {COURSE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {levelLabel(level)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => setCreating(null)}
              >
                {t("actionCancel")}
              </Button>
              <Button
                disabled={createPathDisabled}
                onClick={() => void createPathOnly()}
              >
                {t("actionCreate")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
