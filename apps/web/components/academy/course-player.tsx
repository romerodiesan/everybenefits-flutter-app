"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import {
  getStorageUrl,
  progressOf,
  saveLessonProgress,
  watchCourse,
  watchCourseContent,
  watchEnrollment,
} from "@/lib/firebase/courses";
import {
  isLessonUnlocked,
  lessonAfterAccessible,
} from "@/lib/academy-progress";
import { LESSON_COMPLETE_THRESHOLD } from "@/lib/types";
import type { Course, CourseContent, Enrollment, Lesson } from "@/lib/types";
import { EmptyState, LessonTypeIcon, ProgressBar, formatLessonDurationSeconds } from "./shared";
import { QuizStage, ReadingStage } from "./lesson-stages";
import { PlayerSkeleton } from "@/components/ui/skeleton";
import {
  ANALYTICS_HEARTBEAT_SECONDS,
  trackCourseOpen,
  trackLessonComplete,
  trackLessonHeartbeat,
  trackLessonStart,
} from "@/lib/privacy/academy-analytics";

/** Position writes are throttled so scrubbing doesn't hammer Firestore. */
const SAVE_INTERVAL_MS = 5000;

type MediaState = {
  lessonId: string;
  url: string | null;
  state: "idle" | "missing" | "error";
};

export function CoursePlayer({ courseId }: { courseId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const requestedLessonId = searchParams.get("lesson");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedAt = useRef(0);
  const lastHeartbeatAt = useRef(0);
  const lastHeartbeatPos = useRef(0);
  const startedLessons = useRef(new Set<string>());
  const completedTracked = useRef(new Set<string>());
  const openedCourse = useRef(false);
  const enrollmentRef = useRef<Enrollment | null>(null);
  const seekedFor = useRef<string | null>(null);
  const persistRef = useRef<
    ((positionSeconds: number, complete: boolean) => Promise<void>) | null
  >(null);

  const [course, setCourse] = useState<Course | null>(null);
  const [content, setContent] = useState<CourseContent | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [activeId, setActiveId] = useState<string | null>(requestedLessonId);
  const [media, setMedia] = useState<MediaState | null>(null);
  const [liveDurations, setLiveDurations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [lockHint, setLockHint] = useState<string | null>(null);

  const uid = profile?.uid ?? null;

  useEffect(() => {
    enrollmentRef.current = enrollment;
  }, [enrollment]);

  useEffect(() => {
    return watchCourse(
      courseId,
      (next) => {
        setCourse(next);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [courseId]);

  useEffect(() => {
    return watchCourseContent(courseId, setContent, () => setContent(null));
  }, [courseId]);

  useEffect(() => {
    if (!uid) return;
    return watchEnrollment(uid, courseId, setEnrollment, () =>
      setEnrollment(null),
    );
  }, [uid, courseId]);

  useEffect(() => {
    if (!course || openedCourse.current) return;
    openedCourse.current = true;
    trackCourseOpen({
      courseId: course.id,
      source: "direct",
      locale:
        typeof document !== "undefined"
          ? document.documentElement.lang
          : undefined,
    });
  }, [course]);

  const lessons = useMemo(() => content?.lessons ?? [], [content]);
  const completed = useMemo(
    () => new Set(enrollment?.completedLessonIds ?? []),
    [enrollment],
  );

  // Fall back to the resume point, then the first unfinished unlocked lesson.
  const resolvedId = useMemo(() => {
    const unlocked = (lesson: Lesson) =>
      !content || isLessonUnlocked(content, lesson, enrollment);

    if (
      activeId &&
      lessons.some((lesson) => lesson.id === activeId && unlocked(lesson))
    ) {
      return activeId;
    }
    if (lessons.length === 0) return null;
    const last = enrollment?.lastLessonId;
    if (last) {
      const lastLesson = lessons.find((lesson) => lesson.id === last);
      if (lastLesson && unlocked(lastLesson)) return last;
    }
    return (
      lessons.find((lesson) => !completed.has(lesson.id) && unlocked(lesson))
        ?.id ??
      lessons.find((lesson) => unlocked(lesson))?.id ??
      null
    );
  }, [activeId, lessons, enrollment, completed, content]);

  const active = lessons.find((lesson) => lesson.id === resolvedId) ?? null;
  const activeIndex = active ? lessons.indexOf(active) : -1;
  const next =
    content && active
      ? lessonAfterAccessible(content, active.id, enrollment)
      : null;

  useEffect(() => {
    if (!active || !course) return;
    if (startedLessons.current.has(active.id)) return;
    startedLessons.current.add(active.id);
    lastHeartbeatAt.current = Date.now();
    lastHeartbeatPos.current = 0;
    trackLessonStart({
      courseId: course.id,
      lessonId: active.id,
      durationSeconds: active.durationSeconds,
      source: "direct",
    });
  }, [active, course]);

  const isVideo = active?.type === "video";
  const activeVideoPath = isVideo ? (active?.videoPath ?? null) : null;
  const activeVideoUrl = isVideo ? (active?.videoUrl ?? null) : null;

  useEffect(() => {
    if (!resolvedId) return;
    let cancelled = false;
    const load = activeVideoUrl?.trim()
      ? Promise.resolve(activeVideoUrl.trim())
      : activeVideoPath?.trim()
        ? getStorageUrl(activeVideoPath.trim())
        : Promise.resolve(null);
    load
      .then((url) => {
        if (cancelled) return;
        setMedia({
          lessonId: resolvedId,
          url,
          state: url ? "idle" : "missing",
        });
      })
      .catch(() => {
        if (!cancelled) {
          setMedia({ lessonId: resolvedId, url: null, state: "error" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedId, activeVideoPath, activeVideoUrl]);

  const currentMedia = media?.lessonId === resolvedId ? media : null;
  const videoUrl = currentMedia?.url ?? null;
  const videoState = currentMedia?.state ?? "loading";

  const persist = useCallback(
    async (positionSeconds: number, complete: boolean) => {
      const current = enrollmentRef.current;
      if (!uid || !course || !active || !current) return;
      try {
        const saved = await saveLessonProgress({
          uid,
          courseId: course.id,
          lessonCount: course.lessonCount,
          enrollment: current,
          lessonId: active.id,
          positionSeconds,
          completed: complete,
        });
        enrollmentRef.current = saved;
      } catch {
        // The snapshot listener keeps the UI honest; retry on the next tick.
      }
    },
    [uid, course, active],
  );

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !active || !course || !video.duration) return;
    const ratio = video.currentTime / video.duration;
    const shouldComplete =
      ratio >= LESSON_COMPLETE_THRESHOLD && !completed.has(active.id);
    const now = Date.now();
    if (shouldComplete || now - lastSavedAt.current > SAVE_INTERVAL_MS) {
      lastSavedAt.current = now;
      void persist(video.currentTime, shouldComplete);
    }
    if (
      now - lastHeartbeatAt.current >=
      ANALYTICS_HEARTBEAT_SECONDS * 1000
    ) {
      const delta = Math.max(
        0,
        Math.min(120, video.currentTime - lastHeartbeatPos.current),
      );
      lastHeartbeatAt.current = now;
      lastHeartbeatPos.current = video.currentTime;
      if (delta > 0 || shouldComplete) {
        trackLessonHeartbeat({
          courseId: course.id,
          lessonId: active.id,
          positionSeconds: video.currentTime,
          durationSeconds: video.duration,
          watchDeltaSeconds: delta,
        });
      }
    }
    if (shouldComplete && !completedTracked.current.has(active.id)) {
      completedTracked.current.add(active.id);
      trackLessonComplete({
        courseId: course.id,
        lessonId: active.id,
        positionSeconds: video.currentTime,
        durationSeconds: video.duration,
      });
    }
  };

  const onLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video || !active) return;
    const duration = video.duration;
    if (Number.isFinite(duration) && duration > 0) {
      setLiveDurations((prev) => ({
        ...prev,
        [active.id]: Math.round(duration),
      }));
    }
    // Resume only once per lesson, and only where we actually left off.
    if (seekedFor.current === active.id) return;
    seekedFor.current = active.id;
    const resumeAt =
      enrollment?.lastLessonId === active.id
        ? enrollment.lastPositionSeconds
        : 0;
    if (resumeAt > 1 && resumeAt < video.duration - 5) {
      video.currentTime = resumeAt;
      lastHeartbeatPos.current = resumeAt;
    }
  };

  async function enterFullscreen() {
    const video = videoRef.current;
    if (!video) return;
    const webkit = video as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
    };
    if (video.requestFullscreen) {
      await video.requestFullscreen();
    } else if (webkit.webkitEnterFullscreen) {
      webkit.webkitEnterFullscreen();
    }
  }

  async function enterPictureInPicture() {
    const video = videoRef.current;
    if (!video || typeof video.requestPictureInPicture !== "function") return;
    if (document.pictureInPictureElement === video) {
      await document.exitPictureInPicture();
      return;
    }
    await video.requestPictureInPicture();
  }

  const onEnded = () => {
    const video = videoRef.current;
    void persist(video?.duration ?? 0, true);
    if (course && active && !completedTracked.current.has(active.id)) {
      completedTracked.current.add(active.id);
      trackLessonComplete({
        courseId: course.id,
        lessonId: active.id,
        positionSeconds: video?.duration ?? 0,
        durationSeconds: video?.duration ?? active.durationSeconds,
      });
    }
    if (next) {
      setActiveId(next.id);
    }
  };

  const openLesson = (lesson: Lesson) => {
    if (content && !isLessonUnlocked(content, lesson, enrollment)) {
      setLockHint(t("moduleLocked"));
      return;
    }
    setLockHint(null);
    const video = videoRef.current;
    if (video && active) void persist(video.currentTime, false);
    setActiveId(lesson.id);
  };

  // Keep the latest persist without re-running the unmount flush below.
  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  // Save the last position when leaving the player.
  useEffect(() => {
    const flush = () => {
      const video = videoRef.current;
      if (video && video.currentTime > 0) {
        void persistRef.current?.(video.currentTime, false);
      }
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  if (loading) {
    return <PlayerSkeleton />;
  }

  if (!course) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 lg:px-8">
        <EmptyState message={t("courseNotFound")} />
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 lg:px-8">
        <EmptyState message={t("playerEnrollFirst")} />
        <div className="mt-4 text-center">
          <Link
            href={`/academy/${course.id}`}
            className="text-sm font-semibold text-brand"
          >
            {t("playerBackToCourse")}
          </Link>
        </div>
      </div>
    );
  }

  const progress = progressOf(enrollment, course.lessonCount);
  const finished = progress >= 1;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/academy/${course.id}`}
          className="text-xs font-semibold text-muted transition hover:text-ink"
        >
          ← {t("playerBackToCourse")}
        </Link>
        {activeIndex >= 0 && (
          <p className="text-xs font-medium text-muted">
            {t("playerLessonOf", {
              index: activeIndex + 1,
              total: lessons.length,
            })}
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          {active?.type === "reading" ? (
            <ReadingStage
              key={active.id}
              lesson={active}
              completed={completed.has(active.id)}
              onComplete={() => {
                void persist(0, true);
                if (!completedTracked.current.has(active.id)) {
                  completedTracked.current.add(active.id);
                  trackLessonComplete({
                    courseId: course.id,
                    lessonId: active.id,
                    durationSeconds: active.durationSeconds,
                  });
                }
              }}
            />
          ) : active?.type === "quiz" ? (
            <QuizStage key={active.id} courseId={course.id} lesson={active} />
          ) : (
            <div className="overflow-hidden rounded-2xl bg-black">
              {videoUrl ? (
                <div className="relative">
                  <video
                    key={videoUrl}
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    playsInline
                    disablePictureInPicture={false}
                    className="aspect-video w-full"
                    onTimeUpdate={onTimeUpdate}
                    onLoadedMetadata={onLoadedMetadata}
                    onEnded={onEnded}
                    onDoubleClick={() => void enterFullscreen()}
                    onError={() =>
                      setMedia((prev) =>
                        prev ? { ...prev, url: null, state: "error" } : prev,
                      )
                    }
                  />
                  <div className="absolute right-2 top-2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => void enterPictureInPicture()}
                      className="rounded-lg bg-black/55 px-2 py-1 text-[11px] font-semibold text-white"
                    >
                      {t("playerPip")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void enterFullscreen()}
                      className="rounded-lg bg-black/55 px-2 py-1 text-[11px] font-semibold text-white"
                    >
                      {t("playerFullscreen")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center px-6 text-center text-sm text-white/70">
                  {videoState === "error"
                    ? t("playerError")
                    : videoState === "missing"
                      ? t("playerNoVideo")
                      : t("loading")}
                </div>
              )}
            </div>
          )}

          <div className="mt-4">
            <h1 className="font-display text-xl font-bold tracking-tight">
              {active?.title ?? course.title}
            </h1>
            <p className="mt-1 text-sm text-muted">{course.title}</p>
            <div className="mt-4">
              <ProgressBar value={progress} />
              <p className="mt-1.5 text-[11px] font-semibold text-muted">
                {finished
                  ? t("playerCourseCompleted")
                  : t("academyProgress", {
                      percent: Math.round(progress * 100),
                    })}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {next && (
                <button
                  type="button"
                  onClick={() => openLesson(next)}
                  className="inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand transition hover:brightness-110"
                >
                  {t("playerNext")} →
                </button>
              )}
              {!next &&
                active &&
                content &&
                lessons[activeIndex + 1] &&
                !isLessonUnlocked(
                  content,
                  lessons[activeIndex + 1],
                  enrollment,
                ) && (
                  <p className="text-xs font-medium text-muted">
                    {t("moduleLocked")}
                  </p>
                )}
              {!next && finished && (
                <button
                  type="button"
                  onClick={() => router.push(`/academy/${course.id}`)}
                  className="pulse-sheet inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold"
                >
                  {t("playerBackToCourse")}
                </button>
              )}
            </div>
            {lockHint && (
              <p className="mt-2 text-xs font-medium text-[#B42318]">
                {lockHint}
              </p>
            )}
          </div>
        </div>

        <aside>
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted">
            {t("playerLessons")}
          </h2>
          <ul className="pulse-sheet mt-3 overflow-hidden">
            {lessons.map((lesson, index) => {
              const isActive = lesson.id === resolvedId;
              const locked =
                !!content && !isLessonUnlocked(content, lesson, enrollment);
              return (
                <li
                  key={lesson.id}
                  className="border-b border-glass-border last:border-0"
                >
                  <button
                    type="button"
                    onClick={() => openLesson(lesson)}
                    aria-disabled={locked}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                      locked
                        ? "cursor-not-allowed opacity-55"
                        : isActive
                          ? "bg-brand/[0.08]"
                          : "hover:bg-ink/[0.03] dark:hover:bg-white/[0.03]"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        completed.has(lesson.id)
                          ? "bg-brand/16 text-brand"
                          : locked
                            ? "bg-ink/[0.07] text-muted dark:bg-white/[0.08]"
                            : "bg-ink/[0.07] text-muted dark:bg-white/[0.08]"
                      }`}
                    >
                      {completed.has(lesson.id)
                        ? "✓"
                        : locked
                          ? "·"
                          : index + 1}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${
                        isActive && !locked ? "font-semibold text-brand" : ""
                      }`}
                    >
                      {lesson.title}
                    </span>
                    {locked ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                        {t("moduleLockedShort")}
                      </span>
                    ) : (
                      <span className="shrink-0 text-[11px] font-medium text-muted">
                        {formatLessonDurationSeconds(
                          liveDurations[lesson.id] ?? lesson.durationSeconds,
                          t,
                        ) || <LessonTypeIcon type={lesson.type} />}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
}
