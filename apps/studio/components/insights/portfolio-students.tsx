"use client";

import { useMemo, useState, Fragment } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CatalogStudentRow } from "@/lib/firebase/insights";
import { Input } from "@pulse/ui";

function relativeTime(ms: number | null, locale: string): string {
  if (ms == null) return "—";
  const delta = Date.now() - ms;
  const minutes = Math.round(delta / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.round(hours / 24);
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    -days,
    "day",
  );
}

export function PortfolioStudents({
  students,
}: {
  students: CatalogStudentRow[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((row) => {
      const hay =
        `${row.displayName ?? ""} ${row.email ?? ""} ${row.uid}`.toLowerCase();
      return hay.includes(q);
    });
  }, [students, query]);

  return (
    <section className="studio-panel mt-8 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-glass-border px-4 py-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {t("insightsPortfolioStudents")}
        </h2>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("insightsSearchLearners")}
          className="h-9 w-52"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted">
          {t("insightsNoActiveStudents")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2 font-semibold">
                  {t("insightsColLearner")}
                </th>
                <th className="px-4 py-2 font-semibold">
                  {t("insightsColCoursesInProgress")}
                </th>
                <th className="px-4 py-2 font-semibold">
                  {t("insightsColProgress")}
                </th>
                <th className="px-4 py-2 font-semibold">
                  {t("insightsColActivity")}
                </th>
                <th className="px-4 py-2 font-semibold">
                  {t("insightsColStatus")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const name =
                  row.displayName || row.email || row.uid.slice(0, 8);
                const open = expanded === row.uid;
                const inProgressCourses = row.courses.filter(
                  (c) => c.completedAtMs == null,
                );
                return (
                  <Fragment key={row.uid}>
                    <tr
                      className="cursor-pointer border-t border-glass-border/80 hover:bg-brand/[0.04]"
                      onClick={() =>
                        setExpanded((prev) =>
                          prev === row.uid ? null : row.uid,
                        )
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {row.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.photoUrl}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand">
                              {name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium">{name}</p>
                            {row.email ? (
                              <p className="truncate text-xs text-muted">
                                {row.email}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {row.coursesInProgress}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted/20">
                            <div
                              className="h-full rounded-full bg-brand"
                              style={{
                                width: `${Math.round(row.avgProgress * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="tabular-nums text-xs">
                            {Math.round(row.avgProgress * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {relativeTime(row.updatedAtMs, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            row.atRisk
                              ? "bg-warn/18 text-warn"
                              : "bg-brand/14 text-brand"
                          }`}
                        >
                          {row.atRisk
                            ? t("insightsStatusAtRisk")
                            : t("insightsStatusActive")}
                        </span>
                      </td>
                    </tr>
                    {open ? (
                      <tr className="border-t border-glass-border/40 bg-brand/[0.02]">
                        <td colSpan={5} className="px-4 py-3">
                          <ul className="space-y-2">
                            {inProgressCourses.map((course) => (
                              <li
                                key={course.courseId}
                                className="flex flex-wrap items-center justify-between gap-2 text-sm"
                              >
                                <Link
                                  href={`/insights/${course.courseId}`}
                                  className="font-medium text-ink hover:text-brand"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {course.title}
                                </Link>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted/20">
                                      <div
                                        className="h-full rounded-full bg-brand"
                                        style={{
                                          width: `${Math.round(course.progress * 100)}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="tabular-nums text-xs">
                                      {Math.round(course.progress * 100)}%
                                    </span>
                                  </div>
                                  {course.stalled ? (
                                    <span className="text-[10px] font-semibold uppercase text-warn">
                                      {t("insightsStatusAtRisk")}
                                    </span>
                                  ) : null}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
