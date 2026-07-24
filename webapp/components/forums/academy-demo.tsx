"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { demoCourses, type DemoCourse } from "@/lib/demo";
import { Badge, Button } from "@/components/ui/primitives";

type LevelFilter = "all" | DemoCourse["level"];

export function AcademyDemo() {
  const t = useTranslations();
  const [level, setLevel] = useState<LevelFilter>("all");

  const filters: { id: LevelFilter; label: string }[] = [
    { id: "all", label: t("academyFilterAll") },
    { id: "basic", label: t("academyLevelBasic") },
    { id: "intermediate", label: t("academyLevelIntermediate") },
    { id: "advanced", label: t("academyLevelAdvanced") },
  ];

  const courses = useMemo(
    () =>
      level === "all"
        ? demoCourses
        : demoCourses.filter((course) => course.level === level),
    [level],
  );

  function levelLabel(value: DemoCourse["level"]) {
    if (value === "intermediate") return t("academyLevelIntermediate");
    if (value === "advanced") return t("academyLevelAdvanced");
    return t("academyLevelBasic");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-glass-border pb-5">
        <div className="max-w-2xl">
          <div className="mb-2 flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
              {t("academyTitle")}
            </h1>
            <Badge>{t("academyDemoBadge")}</Badge>
          </div>
          <p className="text-sm leading-relaxed text-muted">
            {t("academySubtitle")}
          </p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {filters.map((filter) => {
          const active = level === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setLevel(filter.id)}
              className={`h-8 rounded-lg px-3 text-xs font-semibold transition ${
                active
                  ? "bg-brand/14 text-brand"
                  : "pulse-sheet text-muted hover:text-ink"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <article
            key={course.id}
            className="pulse-sheet flex flex-col overflow-hidden"
          >
            <div
              className="relative h-[100px] shrink-0"
              style={{
                background: `linear-gradient(145deg, ${course.color}2E, transparent 70%), color-mix(in srgb, ${course.color} 18%, var(--mesh-deep))`,
              }}
            >
              <span
                className="absolute left-3 top-3 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink"
                style={{
                  backgroundColor: `color-mix(in srgb, ${course.color} 28%, transparent)`,
                }}
              >
                {levelLabel(course.level)}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <h2 className="font-display text-base font-bold leading-snug">
                {course.title}
              </h2>
              <p className="mt-1 text-sm text-muted">{course.teacher}</p>
              <p className="mt-2 text-[11px] font-medium text-muted">
                {levelLabel(course.level)} · {course.hours} ·{" "}
                {t("academyStudentsCount", { count: course.students })}
              </p>
              {typeof course.progress === "number" && (
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${course.progress * 100}%` }}
                  />
                </div>
              )}
              <div className="mt-auto pt-4">
                <Button
                  variant="secondary"
                  className="w-full"
                  type="button"
                  disabled
                >
                  {t("academyViewCourse")}
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {!courses.length && (
        <p className="mt-8 text-sm text-muted">{t("academyEmptyFilter")}</p>
      )}
    </div>
  );
}
