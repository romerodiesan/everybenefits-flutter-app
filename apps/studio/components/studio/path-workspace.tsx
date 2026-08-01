"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { canEditPath, canManageCourses } from "@pulse/shared";
import { useAutosave } from "@/lib/hooks/use-autosave";
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
import { Button, Input, Label, TextArea } from "@pulse/ui";
import { PathWorkspaceSkeleton } from "@/components/ui/skeleton";
import {
  EmptyState,
  StatusChip,
  useLevelLabels,
} from "@/components/academy/shared";

export function PathWorkspace({ pathId }: { pathId: string }) {
  const t = useTranslations();
  const { profile, loading: authLoading } = useAuth();
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

  const isAdmin = canManageCourses(profile?.role ?? "guest");
  const editable = path && profile ? canEditPath(path, profile) : false;

  if (authLoading || loading) {
    return <PathWorkspaceSkeleton />;
  }

  if (!path) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <EmptyState message={t("libraryEmptyPaths")} />
        <div className="mt-4 text-center">
          <Link href="/" className="text-sm font-semibold text-brand">
            {t("navLibrary")}
          </Link>
        </div>
      </div>
    );
  }

  if (!editable) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <EmptyState message={t("noAccessBody")} />
        <div className="mt-4 text-center">
          <Link href="/" className="text-sm font-semibold text-brand">
            {t("navLibrary")}
          </Link>
        </div>
      </div>
    );
  }

  return <PathWorkspaceBody key={path.id} path={path} isAdmin={isAdmin} />;
}

function PathWorkspaceBody({
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
  const [courseIds, setCourseIds] = useState(path.courseIds);
  const [published, setPublished] = useState<Course[]>([]);
  const [pickId, setPickId] = useState("");
  const [busy, setBusy] = useState(false);
  const idsSynced = useRef(path.courseIds.join(","));

  useEffect(() => {
    const key = path.courseIds.join(",");
    if (key === idsSynced.current) return;
    idsSynced.current = key;
    setCourseIds(path.courseIds);
  }, [path.courseIds]);

  useEffect(() => {
    return watchPublishedCourses(setPublished, () => setPublished([]));
  }, []);

  const saveMeta = useCallback(async () => {
    if (!title.trim()) return;
    await updatePathMeta({
      pathId: path.id,
      title,
      description,
      level,
    });
  }, [path.id, title, description, level]);

  const metaSnapshot = `${title}\0${description}\0${level}`;
  const { status: syncStatus } = useAutosave(metaSnapshot, saveMeta, true);

  const byId = useMemo(
    () => new Map(published.map((course) => [course.id, course])),
    [published],
  );

  const assigned = useMemo(
    () =>
      courseIds.map((id) => ({
        id,
        course: byId.get(id) ?? null,
      })),
    [courseIds, byId],
  );

  const available = useMemo(
    () => published.filter((course) => !courseIds.includes(course.id)),
    [published, courseIds],
  );

  const persistIds = async (next: string[]) => {
    setBusy(true);
    setCourseIds(next);
    idsSynced.current = next.join(",");
    try {
      await setPathCourseIds(path.id, next);
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= courseIds.length) return;
    const next = [...courseIds];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    void persistIds(next);
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
    if (!window.confirm(`${t("actionDelete")}: ${path.title}?`)) return;
    setBusy(true);
    try {
      await deletePath(path.id);
      router.push("/");
    } finally {
      setBusy(false);
    }
  };

  const syncDot =
    syncStatus === "saving"
      ? "bg-warn"
      : syncStatus === "error"
        ? "bg-danger"
        : syncStatus === "saved"
          ? "bg-ok"
          : "bg-white/20";

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-[11px] font-semibold text-muted hover:text-ink"
            >
              ← {t("navLibrary")}
            </Link>
            <span className={`inline-block h-2 w-2 rounded-full ${syncDot}`} />
            {syncStatus === "saving" ? (
              <span className="text-[11px] text-muted">{t("syncSaving")}</span>
            ) : syncStatus === "saved" ? (
              <span className="text-[11px] text-muted">{t("syncSaved")}</span>
            ) : syncStatus === "error" ? (
              <span className="text-[11px] text-muted">{t("syncError")}</span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl">{path.title}</h1>
            <StatusChip status={path.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {path.status === "draft" && !isAdmin ? (
            <Button
              className="h-9 px-3 text-xs"
              disabled={busy}
              onClick={() => void changeStatus("pending")}
            >
              {t("actionSubmit")}
            </Button>
          ) : null}
          {isAdmin && path.status !== "published" ? (
            <Button
              className="h-9 px-3 text-xs"
              disabled={busy}
              onClick={() => void changeStatus("published")}
            >
              {t("actionPublish")}
            </Button>
          ) : null}
          {isAdmin && path.status === "pending" ? (
            <Button
              variant="secondary"
              className="h-9 px-3 text-xs"
              disabled={busy}
              onClick={() => void changeStatus("draft")}
            >
              {t("actionReject")}
            </Button>
          ) : null}
          {isAdmin && path.status === "published" ? (
            <Button
              variant="secondary"
              className="h-9 px-3 text-xs"
              disabled={busy}
              onClick={() => void changeStatus("draft")}
            >
              {t("actionUnpublish")}
            </Button>
          ) : null}
          <Button
            variant="danger"
            className="h-9 px-3 text-xs"
            disabled={busy}
            onClick={() => void removePath()}
          >
            {t("actionDelete")}
          </Button>
        </div>
      </header>

      <div className="studio-panel mt-6 space-y-3 p-4">
        <div>
          <Label>{t("fieldTitle")}</Label>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div>
          <Label>{t("fieldDescription")}</Label>
          <TextArea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div>
          <Label>{t("fieldLevel")}</Label>
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value as CourseLevel)}
            className="h-10 w-full rounded-xl border border-glass-border bg-sheet px-3 text-sm"
          >
            {COURSE_LEVELS.map((option) => (
              <option key={option} value={option}>
                {levelLabel(option)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg">{t("pathCourses")}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={pickId}
            onChange={(event) => setPickId(event.target.value)}
            className="h-10 min-w-[220px] flex-1 rounded-xl border border-glass-border bg-sheet px-3 text-sm"
          >
            <option value="">{t("pathAddCourse")}</option>
            {available.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            disabled={busy || !pickId}
            onClick={() => {
              if (!pickId) return;
              void persistIds([...courseIds, pickId]);
              setPickId("");
            }}
          >
            {t("pathAddCourse")}
          </Button>
        </div>

        {assigned.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{t("pathEmpty")}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {assigned.map((entry, index) => (
              <li
                key={entry.id}
                className="studio-panel flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {entry.course?.title ?? entry.id}
                  </p>
                  {entry.course ? (
                    <p className="text-[11px] text-muted">
                      {levelLabel(entry.course.level)} · {entry.course.lessonCount}{" "}
                      lessons
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    className="h-8 w-8 px-0 text-xs"
                    disabled={busy || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 px-0 text-xs"
                    disabled={busy || index === assigned.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-8 px-2 text-xs text-danger"
                    disabled={busy}
                    onClick={() =>
                      void persistIds(courseIds.filter((id) => id !== entry.id))
                    }
                  >
                    {t("actionDelete")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
