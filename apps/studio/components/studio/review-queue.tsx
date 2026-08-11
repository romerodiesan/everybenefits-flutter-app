"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth, useAccess } from "@/lib/providers/auth-provider";
import { canManageCourses } from "@/lib/roles";
import {
  setCourseStatus,
  setPathStatus,
  watchCoursesInStatuses,
  watchPathsInStatuses,
} from "@/lib/firebase/courses";
import type { Course, LearningPath } from "@/lib/types";
import { Button } from "@/components/ui/primitives";
import { StatusChip, useLevelLabels } from "@/components/academy/shared";

/** Admin-only queue of courses and paths waiting to be published. */
export function ReviewQueue() {
  const t = useTranslations();
  const router = useRouter();
  const { profile, loading } = useAuth();
  const access = useAccess();
  const levelLabel = useLevelLabels();
  const [courses, setCourses] = useState<Course[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = canManageCourses(access);

  useEffect(() => {
    if (!isAdmin) return;
    const stops = [
      watchCoursesInStatuses(["pending"], setCourses, () => setCourses([])),
      watchPathsInStatuses(["pending"], setPaths, () => setPaths([])),
    ];
    return () => stops.forEach((stop) => stop());
  }, [isAdmin]);

  useEffect(() => {
    if (loading) return;
    if (profile && !isAdmin) router.replace("/");
  }, [loading, profile, isAdmin, router]);

  if (loading || !profile) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        {t("loading")}
      </div>
    );
  }

  if (!isAdmin) return null;

  const approveCourse = async (courseId: string) => {
    setBusyId(courseId);
    try {
      await setCourseStatus(courseId, "published");
    } finally {
      setBusyId(null);
    }
  };

  const rejectCourse = async (courseId: string) => {
    setBusyId(courseId);
    try {
      await setCourseStatus(courseId, "draft");
    } finally {
      setBusyId(null);
    }
  };

  const approvePath = async (pathId: string) => {
    setBusyId(pathId);
    try {
      await setPathStatus(pathId, "published");
    } finally {
      setBusyId(null);
    }
  };

  const rejectPath = async (pathId: string) => {
    setBusyId(pathId);
    try {
      await setPathStatus(pathId, "draft");
    } finally {
      setBusyId(null);
    }
  };

  const empty = courses.length === 0 && paths.length === 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header>
        <h1 className="font-display text-3xl">{t("reviewTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t("reviewSubtitle")}</p>
      </header>

      {empty ? (
        <p className="mt-10 text-sm text-muted">{t("reviewEmpty")}</p>
      ) : (
        <div className="mt-8 space-y-8">
          {courses.length > 0 ? (
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {t("tabCourses")}
              </h2>
              <ul className="mt-3 space-y-2">
                {courses.map((course) => (
                  <li
                    key={course.id}
                    className="studio-panel flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/courses/${course.id}`}
                          className="truncate font-display text-lg hover:text-brand"
                        >
                          {course.title}
                        </Link>
                        <StatusChip status={course.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {course.teacherName} · {levelLabel(course.level)} ·{" "}
                        {course.lessonCount} lessons
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busyId === course.id}
                        onClick={() => void approveCourse(course.id)}
                      >
                        {t("reviewApprove")}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busyId === course.id}
                        onClick={() => void rejectCourse(course.id)}
                      >
                        {t("reviewReject")}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {paths.length > 0 ? (
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {t("tabPaths")}
              </h2>
              <ul className="mt-3 space-y-2">
                {paths.map((path) => (
                  <li
                    key={path.id}
                    className="studio-panel flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/paths/${path.id}`}
                          className="truncate font-display text-lg hover:text-brand"
                        >
                          {path.title}
                        </Link>
                        <StatusChip status={path.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {levelLabel(path.level)} · {path.courseIds.length} courses
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busyId === path.id}
                        onClick={() => void approvePath(path.id)}
                      >
                        {t("reviewApprove")}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busyId === path.id}
                        onClick={() => void rejectPath(path.id)}
                      >
                        {t("reviewReject")}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
