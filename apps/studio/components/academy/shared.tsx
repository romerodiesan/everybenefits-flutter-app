"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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

export function useDurationLabel() {
  return (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };
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

export function LevelFilters({
  value,
  onChange,
}: {
  value: CourseLevel | "all";
  onChange: (next: CourseLevel | "all") => void;
}) {
  const t = useTranslations();
  const options: { id: CourseLevel | "all"; label: string }[] = [
    { id: "all", label: t("academyFilterAll") },
    { id: "basic", label: t("academyLevelBasic") },
    { id: "intermediate", label: t("academyLevelIntermediate") },
    { id: "advanced", label: t("academyLevelAdvanced") },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`h-8 rounded-lg px-3 text-xs font-semibold transition ${
              active
                ? "bg-brand/14 text-brand"
                : "pulse-sheet text-muted hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function CourseCard({
  course,
  progress,
  showStatus = false,
  href,
}: {
  course: Course;
  progress?: number;
  showStatus?: boolean;
  href: string;
}) {
  const t = useTranslations();
  const duration = useDurationLabel();

  return (
    <Link
      href={href}
      className="pulse-sheet group flex flex-col overflow-hidden transition hover:border-brand/40"
    >
      <CourseCover course={course} />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-display text-base font-bold leading-snug">
            {course.title}
          </h2>
          {showStatus && course.status !== "published" && (
            <StatusChip status={course.status} />
          )}
        </div>
        {course.teacherName && (
          <p className="mt-1 text-sm text-muted">{course.teacherName}</p>
        )}
        <p className="mt-2 text-[11px] font-medium text-muted">
          {[
            t("academyLessonsCount", { count: course.lessonCount }),
            course.durationMinutes > 0 ? duration(course.durationMinutes) : null,
            t("academyStudentsCount", { count: course.studentCount }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {typeof progress === "number" && (
          <div className="mt-3">
            <ProgressBar value={progress} />
            <p className="mt-1.5 text-[11px] font-semibold text-muted">
              {progress >= 1
                ? t("academyCompleted")
                : t("academyProgress", { percent: Math.round(progress * 100) })}
            </p>
          </div>
        )}
        <span className="mt-auto pt-4 text-xs font-semibold text-brand opacity-0 transition group-hover:opacity-100">
          {t("academyViewCourse")} →
        </span>
      </div>
    </Link>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="pulse-sheet px-4 py-10 text-center text-sm text-muted">
      {message}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-glass-border pb-5">
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
        )}
      </div>
      {actions}
    </header>
  );
}
