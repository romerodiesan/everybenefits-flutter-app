"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { canEditPath, canManageCourses } from "@/lib/roles";
import {
  deletePath,
  setPathCourseIds,
  setPathStatus,
  updatePathMeta,
  watchPath,
  watchPublishedCourses,
} from "@/lib/firebase/courses";
import { COURSE_LEVELS } from "@/lib/types";
import type { Course, CourseLevel, LearningPath } from "@/lib/types";
import { Button, Input, Label, TextArea } from "@/components/ui/primitives";
import {
  EmptyState,
  StatusChip,
  useLevelLabels,
} from "@/components/academy/shared";

/** Live single-path listener used by the Studio editor. */
function useWatchPath(pathId: string) {
  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return watchPath(
      pathId,
      (next) => {
        setPath(next);
        setLoading(false);
      },
      () => {
        setPath(null);
        setLoading(false);
      },
    );
  }, [pathId]);

  return { path, loading };
}

export function StudioPathEditor({ pathId }: { pathId: string }) {
  const t = useTranslations();
  const { profile, loading: authLoading } = useAuth();
  const { path, loading } = useWatchPath(pathId);

  const isAdmin = canManageCourses(profile?.role ?? "guest");
  const editable = path && profile ? canEditPath(path, profile) : false;

  if (authLoading || loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 text-sm text-muted lg:px-8">
        {t("loading")}
      </div>
    );
  }

  if (!path) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 lg:px-8">
        <EmptyState message={t("studioPathNotFound")} />
      </div>
    );
  }

  if (!editable || !profile) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 lg:px-8">
        <EmptyState message={t("studioReadOnly")} />
        <div className="mt-4 text-center">
          <Link href="/studio" className="text-sm font-semibold text-brand">
            {t("studioBackToList")}
          </Link>
        </div>
      </div>
    );
  }

  // Remount when the path doc identity changes so form state re-inits cleanly.
  return (
    <PathEditorBody
      key={path.id}
      path={path}
      isAdmin={isAdmin}
    />
  );
}

function PathEditorBody({
  path,
  isAdmin,
}: {
  path: LearningPath;
  isAdmin: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const levelLabel = useLevelLabels();

  const [title, setTitle] = useState(path.title);
  const [description, setDescription] = useState(path.description);
  const [level, setLevel] = useState<CourseLevel>(path.level);
  const [pendingIds, setPendingIds] = useState<string[] | null>(null);
  const [published, setPublished] = useState<Course[]>([]);
  const [pickId, setPickId] = useState("");
  const [busy, setBusy] = useState(false);

  const courseIds = pendingIds ?? path.courseIds;

  useEffect(() => {
    return watchPublishedCourses(setPublished, () => setPublished([]));
  }, []);

  const byId = useMemo(
    () => new Map(published.map((course) => [course.id, course])),
    [published],
  );

  const assigned = useMemo(
    () =>
      courseIds
        .map((id) => byId.get(id))
        .filter((course): course is Course => Boolean(course)),
    [courseIds, byId],
  );

  const available = useMemo(
    () => published.filter((course) => !courseIds.includes(course.id)),
    [published, courseIds],
  );

  const saveMeta = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await updatePathMeta({
        pathId: path.id,
        title,
        description,
        level,
      });
    } finally {
      setBusy(false);
    }
  };

  const saveCourses = async (nextIds: string[]) => {
    setBusy(true);
    setPendingIds(nextIds);
    try {
      await setPathCourseIds(path.id, nextIds);
    } finally {
      setPendingIds(null);
      setBusy(false);
    }
  };

  const moveCourse = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= courseIds.length) return;
    const next = [...courseIds];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    void saveCourses(next);
  };

  const addCourse = () => {
    if (!pickId || courseIds.includes(pickId)) return;
    void saveCourses([...courseIds, pickId]);
    setPickId("");
  };

  const removeCourse = (id: string) => {
    void saveCourses(courseIds.filter((entry) => entry !== id));
  };

  const changeStatus = async (status: LearningPath["status"]) => {
    setBusy(true);
    try {
      await setPathStatus(path.id, status);
    } finally {
      setBusy(false);
    }
  };

  const removePath = async () => {
    if (!window.confirm(t("studioDeletePathConfirm", { title: path.title }))) {
      return;
    }
    setBusy(true);
    try {
      await deletePath(path.id);
      router.push("/studio");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/studio"
          className="text-xs font-semibold text-muted transition hover:text-ink"
        >
          ← {t("studioBackToList")}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={path.status} />
          {path.status === "draft" && !isAdmin && (
            <Button
              className="h-9 px-3 text-xs"
              onClick={() => void changeStatus("pending")}
              disabled={busy}
            >
              {t("studioSubmitPathReview")}
            </Button>
          )}
          {isAdmin && path.status !== "published" && (
            <Button
              className="h-9 px-3 text-xs"
              onClick={() => void changeStatus("published")}
              disabled={busy}
            >
              {t("studioPublishPath")}
            </Button>
          )}
          {isAdmin && path.status === "pending" && (
            <Button
              variant="secondary"
              className="h-9 px-3 text-xs"
              onClick={() => void changeStatus("draft")}
              disabled={busy}
            >
              {t("studioRejectPathToDraft")}
            </Button>
          )}
          {isAdmin && path.status === "published" && (
            <Button
              variant="secondary"
              className="h-9 px-3 text-xs"
              onClick={() => void changeStatus("draft")}
              disabled={busy}
            >
              {t("studioRejectPathToDraft")}
            </Button>
          )}
          {(isAdmin || path.status !== "published") && (
            <Button
              variant="secondary"
              className="h-9 px-3 text-xs"
              onClick={() => void removePath()}
              disabled={busy}
            >
              {t("studioDeletePath")}
            </Button>
          )}
        </div>
      </div>

      <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
        {path.title || t("studioNewPath")}
      </h1>

      <section className="pulse-sheet mt-6 space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>{t("studioFieldTitle")}</Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div>
            <Label>{t("studioFieldLevel")}</Label>
            <select
              value={level}
              onChange={(event) =>
                setLevel(event.target.value as CourseLevel)
              }
              className="h-10 w-full rounded-xl border border-glass-border bg-sheet px-3 text-sm text-ink outline-none focus:border-brand"
            >
              {COURSE_LEVELS.map((option) => (
                <option key={option} value={option}>
                  {levelLabel(option)}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label>{t("studioFieldDescription")}</Label>
            <TextArea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </div>
        <Button onClick={() => void saveMeta()} disabled={busy || !title.trim()}>
          {t("studioSaveMeta")}
        </Button>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold">
          {t("studioPathCourses")}
        </h2>

        <ul className="pulse-sheet mt-3 overflow-hidden">
          {assigned.length === 0 ? (
            <li className="px-4 py-6 text-sm text-muted">
              {t("studioPathNoCourses")}
            </li>
          ) : (
            assigned.map((course, index) => (
              <li
                key={course.id}
                className="flex flex-wrap items-center gap-2 border-b border-glass-border px-4 py-3 last:border-0"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink/[0.07] text-[11px] font-bold text-muted dark:bg-white/[0.08]">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{course.title}</p>
                  <p className="text-[11px] text-muted">
                    {t("academyLessonsCount", { count: course.lessonCount })}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={t("studioMoveUp")}
                  disabled={busy || index === 0}
                  onClick={() => moveCourse(index, -1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-ink/[0.05] disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={t("studioMoveDown")}
                  disabled={busy || index === assigned.length - 1}
                  onClick={() => moveCourse(index, 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-ink/[0.05] disabled:opacity-40"
                >
                  ↓
                </button>
                <Button
                  variant="secondary"
                  className="h-8 px-2.5 text-xs"
                  disabled={busy}
                  onClick={() => removeCourse(course.id)}
                >
                  {t("studioRemoveCourseFromPath")}
                </Button>
              </li>
            ))
          )}
        </ul>

        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={pickId}
            onChange={(event) => setPickId(event.target.value)}
            aria-label={t("studioPathPickCourse")}
            className="h-10 min-w-[220px] flex-1 rounded-xl border border-glass-border bg-sheet px-3 text-sm text-ink outline-none focus:border-brand"
          >
            <option value="">{t("studioPathPickCourse")}</option>
            {available.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            onClick={addCourse}
            disabled={busy || !pickId}
          >
            {t("studioAddCourseToPath")}
          </Button>
        </div>
      </section>
    </div>
  );
}
