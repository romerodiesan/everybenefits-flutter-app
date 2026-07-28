"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { canManageCourses } from "@/lib/roles";
import {
  createCourse,
  createPath,
  watchAuthoredCourses,
  watchAuthoredPaths,
  watchCoursesInStatuses,
  watchPathsInStatuses,
} from "@/lib/firebase/courses";
import {
  COURSE_LEVELS,
  type Course,
  type CourseLevel,
  type CourseStatus,
  type LearningPath,
} from "@/lib/types";
import { Button, Input, Label, TextArea } from "@/components/ui/primitives";
import { CourseCover, StatusChip, useLevelLabels } from "@/components/academy/shared";

type Tab = "courses" | "paths";
type CreateKind = "course" | "path" | null;
type StatusFilter = "all" | CourseStatus;

export function LibraryHome() {
  const t = useTranslations();
  const router = useRouter();
  const { profile } = useAuth();
  const levelLabel = useLevelLabels();

  const [tab, setTab] = useState<Tab>("courses");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [listReady, setListReady] = useState(false);
  const [creating, setCreating] = useState<CreateKind>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    teacherName: "",
    level: "basic" as CourseLevel,
  });

  const uid = profile?.uid ?? "";
  const isAdmin = canManageCourses(profile?.role ?? "guest");

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

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.teacherName.toLowerCase().includes(q)
      );
    });
  }, [courses, filter, query]);

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

  const create = async () => {
    if (!profile || !form.title.trim()) return;
    setBusy(true);
    try {
      if (creating === "course") {
        const id = await createCourse({
          title: form.title.trim(),
          description: form.description.trim(),
          teacherName:
            form.teacherName.trim() ||
            profile.displayName ||
            profile.email ||
            "Instructor",
          level: form.level,
          createdBy: profile.uid,
        });
        router.push(`/courses/${id}`);
      } else if (creating === "path") {
        const id = await createPath({
          title: form.title.trim(),
          description: form.description.trim(),
          level: form.level,
          createdBy: profile.uid,
        });
        router.push(`/paths/${id}`);
      }
    } finally {
      setBusy(false);
      setCreating(null);
      setForm({
        title: "",
        description: "",
        teacherName: "",
        level: "basic",
      });
    }
  };

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "all", label: t("libraryFilterAll") },
    { id: "draft", label: t("libraryFilterDraft") },
    { id: "pending", label: t("libraryFilterPending") },
    { id: "published", label: t("libraryFilterPublished") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">{t("libraryTitle")}</h1>
          <p className="mt-1 text-sm text-muted">{t("librarySubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setCreating("path")}
          >
            {t("libraryNewPath")}
          </Button>
          <Button onClick={() => setCreating("course")}>
            {t("libraryNewCourse")}
          </Button>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
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

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-glass-border p-0.5">
          {(["courses", "paths"] as Tab[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === id ? "bg-brand/20 text-brand" : "text-muted"
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
                  ? "bg-white/10 text-ink"
                  : "text-muted hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "courses" ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {!listReady ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[16/10] animate-pulse rounded-xl bg-white/[0.05]"
              />
            ))
          ) : filteredCourses.length === 0 ? (
            <p className="col-span-full text-sm text-muted">
              {t("libraryEmpty")}
            </p>
          ) : (
            filteredCourses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="studio-panel group overflow-hidden transition hover:border-brand/40"
              >
                <div className="aspect-[16/9] overflow-hidden bg-mesh">
                  <CourseCover course={course} className="h-full w-full object-cover" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-lg leading-snug group-hover:text-brand">
                      {course.title}
                    </h2>
                    <StatusChip status={course.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">
                    {course.description || course.teacherName}
                  </p>
                  <p className="mt-3 text-[11px] text-muted">
                    {levelLabel(course.level)} · {course.lessonCount} lessons ·{" "}
                    {course.studentCount} students
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
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
                  <h2 className="font-display text-lg">{path.title}</h2>
                  <StatusChip status={path.status} />
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted">
                  {path.description}
                </p>
                <p className="mt-3 text-[11px] text-muted">
                  {levelLabel(path.level)} · {path.courseIds.length} courses
                </p>
              </Link>
            ))
          )}
        </div>
      )}

      {creating ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="studio-panel w-full max-w-md p-6">
            <h2 className="font-display text-xl">
              {creating === "course"
                ? t("createCourseTitle")
                : t("createPathTitle")}
            </h2>
            <div className="mt-4 space-y-3">
              <div>
                <Label>{t("fieldTitle")}</Label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>{t("fieldDescription")}</Label>
                <TextArea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              {creating === "course" ? (
                <div>
                  <Label>{t("fieldTeacher")}</Label>
                  <Input
                    value={form.teacherName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, teacherName: e.target.value }))
                    }
                  />
                </div>
              ) : null}
              <div>
                <Label>{t("fieldLevel")}</Label>
                <select
                  className="h-10 w-full rounded-xl border border-glass-border bg-sheet px-3 text-sm"
                  value={form.level}
                  onChange={(e) =>
                    setForm((f) => ({
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
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setCreating(null)}
                disabled={busy}
              >
                {t("actionCancel")}
              </Button>
              <Button onClick={create} disabled={busy || !form.title.trim()}>
                {t("actionCreate")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
