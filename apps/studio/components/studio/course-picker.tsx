"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Course } from "@/lib/types";

const DROPDOWN_LIMIT = 50;

type Props = {
  courses: Course[];
  value: string | null;
  onSelectAction: (courseId: string) => void;
  disabled?: boolean;
  className?: string;
};

export function CoursePicker({
  courses,
  value,
  onSelectAction,
  disabled,
  className = "",
}: Props) {
  const t = useTranslations();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = courses.find((c) => c.id === value) ?? null;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? courses.filter((course) => {
          const title = course.title.toLowerCase();
          const teacher = (course.teacherName ?? "").toLowerCase();
          return title.includes(needle) || teacher.includes(needle);
        })
      : courses;
    return list;
  }, [courses, query]);

  const visible = filtered.slice(0, DROPDOWN_LIMIT);
  const hiddenCount = Math.max(0, filtered.length - visible.length);

  const summary = selected?.title ?? t("analyticsPickCourse");

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled || courses.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t("analyticsPickCourse")}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-8 w-full max-w-md items-center justify-between gap-2 rounded-lg border border-glass-border bg-sheet px-2.5 text-left text-xs text-ink outline-none transition hover:border-brand/40 focus:border-brand disabled:opacity-50"
      >
        <span
          className={`min-w-0 flex-1 truncate ${selected ? "" : "text-muted"}`}
        >
          {summary}
        </span>
        <svg
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path
            d="M5 7.5 10 12.5 15 7.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && !disabled ? (
        <div
          id={listId}
          role="listbox"
          aria-label={t("analyticsPickCourse")}
          className="absolute z-30 mt-1.5 w-full min-w-[16rem] max-w-md overflow-hidden rounded-xl border border-glass-border bg-sheet shadow-lg"
        >
          <div className="border-b border-glass-border p-2">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("librarySearch")}
              className="h-9 w-full rounded-lg border border-glass-border bg-transparent px-2.5 text-sm outline-none placeholder:text-muted focus:border-brand"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {visible.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted">
                {t("analyticsNoCourseMatch")}
              </li>
            ) : (
              visible.map((course) => {
                const active = course.id === value;
                return (
                  <li key={course.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition ${
                        active
                          ? "bg-brand/12 text-brand"
                          : "text-ink hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]"
                      }`}
                      onClick={() => {
                        onSelectAction(course.id);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <span className="truncate font-medium">{course.title}</span>
                      <span className="text-[11px] opacity-80">
                        {course.studentCount} {t("kpiStudents").toLowerCase()}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          {hiddenCount > 0 ? (
            <p className="border-t border-glass-border px-3 py-2 text-[11px] text-muted">
              {t("analyticsMoreResults", { count: hiddenCount })}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
