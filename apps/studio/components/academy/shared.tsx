"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { getStorageUrl } from "@/lib/firebase/courses";
import type {
  Course,
  CourseLevel,
  CourseStatus,
  LessonType,
} from "@/lib/types";

/** Cover palette: courses without artwork still read as distinct cards. */
const COVER_PALETTE = [
  "#98CA3F",
  "#33B1FF",
  "#FF6B6B",
  "#FFB84D",
  "#B388FF",
  "#4DD0C1",
];

export function coverColorFor(seed: string) {
  if (!seed) return COVER_PALETTE[0];
  let hash = 7;
  for (const code of seed) hash = hash * 31 + code.charCodeAt(0);
  return COVER_PALETTE[Math.abs(hash) % COVER_PALETTE.length];
}

export function useLevelLabels() {
  const t = useTranslations();
  return (level: CourseLevel) => {
    if (level === "intermediate") return t("levelIntermediate");
    if (level === "advanced") return t("levelAdvanced");
    return t("levelBasic");
  };
}

export function useLessonTypeLabels() {
  const t = useTranslations();
  return (type: LessonType) => {
    if (type === "reading") return t("lessonReading");
    if (type === "quiz") return t("lessonQuiz");
    return t("lessonVideo");
  };
}

/** Compact glyph so playlists read at a glance: watch, read, or answer. */
export function LessonTypeIcon({
  type,
  className = "",
}: {
  type: LessonType;
  className?: string;
}) {
  const typeLabel = useLessonTypeLabels();
  const glyph = type === "reading" ? "¶" : type === "quiz" ? "?" : "▶";

  return (
    <span
      aria-label={typeLabel(type)}
      title={typeLabel(type)}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand/14 text-[11px] font-bold text-brand ${className}`}
    >
      {glyph}
    </span>
  );
}

/** Resolves a Storage cover path to a download URL, keyed by the path. */
export function useCoverUrl(course: Course) {
  const [resolved, setResolved] = useState<{ path: string; url: string } | null>(
    null,
  );
  const directUrl = course.coverUrl?.trim() || null;
  const coverPath = course.coverPath?.trim() || null;

  useEffect(() => {
    if (directUrl || !coverPath) return;
    let cancelled = false;
    getStorageUrl(coverPath)
      .then((url) => {
        if (!cancelled) setResolved({ path: coverPath, url });
      })
      .catch(() => {
        // Keep the gradient placeholder.
      });
    return () => {
      cancelled = true;
    };
  }, [coverPath, directUrl]);

  if (directUrl) return directUrl;
  return resolved?.path === coverPath ? resolved.url : null;
}

export function CourseCover({
  course,
  className = "h-[104px]",
  showLevel = true,
}: {
  course: Course;
  className?: string;
  showLevel?: boolean;
}) {
  const levelLabel = useLevelLabels();
  const url = useCoverUrl(course);
  const color = coverColorFor(course.id);

  return (
    <div
      className={`relative shrink-0 overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(145deg, ${color}2E, transparent 70%), color-mix(in srgb, ${color} 18%, var(--mesh-deep))`,
      }}
    >
      {url && (
        <Image
          src={url}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 320px"
          className="object-cover"
          unoptimized={url.includes("127.0.0.1") || url.includes("localhost")}
        />
      )}
      {showLevel && (
        <span
          className="absolute left-3 top-3 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink backdrop-blur-sm"
          style={{
            backgroundColor: `color-mix(in srgb, ${color} 34%, transparent)`,
          }}
        >
          {levelLabel(course.level)}
        </span>
      )}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10">
      <div
        className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function StatusChip({ status }: { status: CourseStatus }) {
  const t = useTranslations();
  const label =
    status === "published"
      ? t("statusPublished")
      : status === "pending"
        ? t("statusPending")
        : t("statusDraft");
  const tone =
    status === "published"
      ? "bg-brand/14 text-brand"
      : status === "pending"
        ? "bg-warn/18 text-warn"
        : "bg-white/[0.08] text-muted";

  return (
    <span
      className={`inline-flex shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone}`}
    >
      {label}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="pulse-sheet px-4 py-10 text-center text-sm text-muted">
      {message}
    </div>
  );
}
