"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { canAuthorCourses, canManageCourses } from "@/lib/roles";
import {
  createCourse,
  createPath,
  setCourseStatus,
  setPathStatus,
  watchAuthoredCourses,
  watchAuthoredPaths,
  watchCoursesInStatuses,
  watchPathsInStatuses,
} from "@/lib/firebase/courses";
import {
  COURSE_LEVELS,
  type Course,
  type CourseLevel,
  type LearningPath,
} from "@/lib/types";
import { Button, Input, Label, TextArea } from "@/components/ui/primitives";
import {
  CourseCover,
  EmptyState,
  PageHeader,
  StatusChip,
  useLevelLabels,
} from "@/components/academy/shared";

type CreateKind = "course" | "path" | null;

export function StudioHome() {
  const t = useTranslations();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const levelLabel = useLevelLabels();

  const [mine, setMine] = useState<Course[]>([]);
  const [studioCourses, setStudioCourses] = useState<Course[]>([]);

  const [myPaths, setMyPaths] = useState<LearningPath[]>([]);
  const [studioPaths, setStudioPaths] = useState<LearningPath[]>([]);

  const [creating, setCreating] = useState<CreateKind>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    teacherName: "",
    level: "basic" as CourseLevel,
  });

  const uid = profile?.uid ?? null;
  const role = profile?.role ?? "guest";
  const isAuthor = canAuthorCourses(role);
  const isAdmin = canManageCourses(role);

  useEffect(() => {
    if (!uid || !isAuthor || isAdmin) return;
    return watchAuthoredCourses(uid, setMine, () => setMine([]));
  }, [uid, isAuthor, isAdmin]);

  useEffect(() => {
    if (!uid || !isAuthor || isAdmin) return;
    return watchAuthoredPaths(uid, setMyPaths, () => setMyPaths([]));
  }, [uid, isAuthor, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const stops = [
      watchCoursesInStatuses(
        ["draft", "pending", "published"],
        setStudioCourses,
        () => setStudioCourses([]),
      ),
      watchPathsInStatuses(
        ["draft", "pending", "published"],
        setStudioPaths,
        () => setStudioPaths([]),
      ),
    ];
    return () => stops.forEach((stop) => stop());
  }, [isAdmin]);

  const pending = useMemo(
    () => studioCourses.filter((course) => course.status === "pending"),
    [studioCourses],
  );

  const pathPending = useMemo(
    () => studioPaths.filter((path) => path.status === "pending"),
    [studioPaths],
  );

  const allCourses = useMemo(() => {
    if (!isAdmin) return mine;
    return studioCourses;
  }, [isAdmin, mine, studioCourses]);

  const allPaths = useMemo(() => {
    if (!isAdmin) return myPaths;
    return studioPaths;
  }, [isAdmin, myPaths, studioPaths]);

  const reviewQueue = useMemo(() => {
    if (isAdmin) return pending;
    return mine.filter((course) => course.status === "pending");
  }, [isAdmin, pending, mine]);

  const pathReviewQueue = useMemo(() => {
    if (isAdmin) return pathPending;
    return myPaths.filter((path) => path.status === "pending");
  }, [isAdmin, pathPending, myPaths]);

  if (authLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 text-sm text-muted lg:px-8">
        {t("loading")}
      </div>
    );
  }

  if (!isAuthor) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 lg:px-8">
        <EmptyState message={t("studioNoAccess")} />
      </div>
    );
  }

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      teacherName: "",
      level: "basic",
    });
  };

  const submitCourse = async () => {
    if (!uid || !form.title.trim()) return;
    setBusyId("new-course");
    try {
      const id = await createCourse({ ...form, createdBy: uid });
      setCreating(null);
      resetForm();
      router.push(`/studio/${id}`);
    } finally {
      setBusyId(null);
    }
  };

  const submitPath = async () => {
    if (!uid || !form.title.trim()) return;
    setBusyId("new-path");
    try {
      const id = await createPath({
        title: form.title,
        description: form.description,
        level: form.level,
        createdBy: uid,
      });
      setCreating(null);
      resetForm();
      router.push(`/studio/paths/${id}`);
    } finally {
      setBusyId(null);
    }
  };

  const approveCourse = async (course: Course) => {
    setBusyId(course.id);
    try {
      await setCourseStatus(course.id, "published");
    } finally {
      setBusyId(null);
    }
  };

  const rejectCourse = async (course: Course) => {
    setBusyId(course.id);
    try {
      await setCourseStatus(course.id, "draft");
    } finally {
      setBusyId(null);
    }
  };

  const approvePath = async (path: LearningPath) => {
    setBusyId(path.id);
    try {
      await setPathStatus(path.id, "published");
    } finally {
      setBusyId(null);
    }
  };

  const rejectPath = async (path: LearningPath) => {
    setBusyId(path.id);
    try {
      await setPathStatus(path.id, "draft");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        title={t("studioTitle")}
        subtitle={t("studioSubtitle")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant={creating === "course" ? "secondary" : "primary"}
              onClick={() =>
                setCreating((prev) => (prev === "course" ? null : "course"))
              }
            >
              {creating === "course" ? t("studioCancel") : t("studioNewCourse")}
            </Button>
            <Button
              variant={creating === "path" ? "secondary" : "primary"}
              onClick={() =>
                setCreating((prev) => (prev === "path" ? null : "path"))
              }
            >
              {creating === "path" ? t("studioCancel") : t("studioNewPath")}
            </Button>
          </div>
        }
      />

      {creating && (
        <div className="pulse-sheet mt-5 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>{t("studioFieldTitle")}</Label>
              <Input
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                autoFocus
              />
            </div>
            {creating === "course" && (
              <div>
                <Label>{t("studioFieldTeacher")}</Label>
                <Input
                  value={form.teacherName}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      teacherName: event.target.value,
                    }))
                  }
                />
              </div>
            )}
            <div className="sm:col-span-2">
              <Label>{t("studioFieldDescription")}</Label>
              <TextArea
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>{t("studioFieldLevel")}</Label>
              <select
                value={form.level}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    level: event.target.value as CourseLevel,
                  }))
                }
                className="h-10 w-full rounded-xl border border-glass-border bg-sheet px-3 text-sm text-ink outline-none focus:border-brand"
              >
                {COURSE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {levelLabel(level)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() =>
                void (creating === "path" ? submitPath() : submitCourse())
              }
              disabled={
                busyId === "new-course" ||
                busyId === "new-path" ||
                !form.title.trim()
              }
            >
              {t("studioCreate")}
            </Button>
            <Button variant="secondary" onClick={() => setCreating(null)}>
              {t("studioCancel")}
            </Button>
          </div>
        </div>
      )}

      {reviewQueue.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold">
            {t("studioReviewQueue")}
          </h2>
          <div className="mt-3 space-y-2">
            {reviewQueue.map((course) => (
              <div
                key={course.id}
                className="pulse-sheet flex flex-wrap items-center gap-3 p-3"
              >
                <CourseCover
                  course={course}
                  className="h-12 w-20 rounded-lg"
                  showLevel={false}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {course.title}
                  </p>
                  <p className="text-[11px] text-muted">
                    {t("academyLessonsCount", { count: course.lessonCount })}
                  </p>
                </div>
                <Link
                  href={`/studio/${course.id}`}
                  className="text-xs font-semibold text-brand"
                >
                  {t("studioOpenEditor")}
                </Link>
                {isAdmin && (
                  <>
                    <Button
                      className="h-9 px-3 text-xs"
                      onClick={() => void approveCourse(course)}
                      disabled={busyId === course.id}
                    >
                      {t("studioPublish")}
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-9 px-3 text-xs"
                      onClick={() => void rejectCourse(course)}
                      disabled={busyId === course.id}
                    >
                      {t("studioRejectToDraft")}
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {pathReviewQueue.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold">
            {t("studioPathReviewQueue")}
          </h2>
          <div className="mt-3 space-y-2">
            {pathReviewQueue.map((path) => (
              <div
                key={path.id}
                className="pulse-sheet flex flex-wrap items-center gap-3 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{path.title}</p>
                  <p className="text-[11px] text-muted">
                    {t("pathMeta", {
                      courses: path.courseIds.length,
                      hours: 0,
                    })}
                  </p>
                </div>
                <StatusChip status={path.status} />
                <Link
                  href={`/studio/paths/${path.id}`}
                  className="text-xs font-semibold text-brand"
                >
                  {t("studioOpenPathEditor")}
                </Link>
                {isAdmin && (
                  <>
                    <Button
                      className="h-9 px-3 text-xs"
                      onClick={() => void approvePath(path)}
                      disabled={busyId === path.id}
                    >
                      {t("studioPublishPath")}
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-9 px-3 text-xs"
                      onClick={() => void rejectPath(path)}
                      disabled={busyId === path.id}
                    >
                      {t("studioRejectPathToDraft")}
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold">
          {isAdmin ? t("studioAllCourses") : t("studioMyCourses")}
        </h2>
        {allCourses.length === 0 ? (
          <div className="mt-3">
            <EmptyState message={t("studioEmpty")} />
          </div>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {allCourses.map((course) => (
              <Link
                key={course.id}
                href={`/studio/${course.id}`}
                className="pulse-sheet flex flex-col overflow-hidden transition hover:border-brand/40"
              >
                <CourseCover course={course} className="h-24" />
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-base font-bold leading-snug">
                      {course.title}
                    </h3>
                    <StatusChip status={course.status} />
                  </div>
                  <p className="mt-2 text-[11px] font-medium text-muted">
                    {[
                      t("academyLessonsCount", { count: course.lessonCount }),
                      t("academyStudentsCount", { count: course.studentCount }),
                    ].join(" · ")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-bold">
          {isAdmin ? t("studioAllPaths") : t("studioMyPaths")}
        </h2>
        {allPaths.length === 0 ? (
          <div className="mt-3">
            <EmptyState message={t("studioNoPaths")} />
          </div>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {allPaths.map((path) => (
              <Link
                key={path.id}
                href={`/studio/paths/${path.id}`}
                className="pulse-sheet flex flex-col p-4 transition hover:border-brand/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-base font-bold leading-snug">
                    {path.title}
                  </h3>
                  <StatusChip status={path.status} />
                </div>
                {path.description && (
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted">
                    {path.description}
                  </p>
                )}
                <p className="mt-3 text-[11px] font-medium text-muted">
                  {t("pathMeta", {
                    courses: path.courseIds.length,
                    hours: 0,
                  })}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
