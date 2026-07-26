"use client";

import { useTranslations } from "next-intl";

/** Lightweight chrome that matches AppShell layout while auth/profile settles. */
export function AppShellSkeleton({ hint }: { hint?: string }) {
  const t = useTranslations();
  return (
    <div className="mesh-bg flex h-[100svh] flex-col overflow-hidden lg:flex-row">
      <aside className="hidden h-full w-72 shrink-0 flex-col border-r border-glass-border bg-sheet lg:flex">
        <div className="border-b border-glass-border px-3 pb-3 pt-3.5">
          <p className="px-1 font-display text-lg font-bold tracking-tight">
            {t("brandShort")}
          </p>
          <p className="mt-1 px-1 text-[11px] text-muted">
            {hint ?? t("bootPreparing")}
          </p>
          <div className="mt-3 h-12 animate-pulse rounded-xl bg-ink/[0.06] dark:bg-white/[0.06]" />
        </div>
        <div className="flex-1 space-y-2 px-2.5 py-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-xl bg-ink/[0.05] dark:bg-white/[0.05]"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-glass-border px-4 py-3 lg:hidden">
          <p className="font-display text-base font-bold">{t("brandShort")}</p>
          <p className="text-xs text-muted">{t("bootPreparing")}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4 lg:p-6">
          <div className="mx-auto max-w-3xl space-y-3">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-ink/[0.06] dark:bg-white/[0.06]" />
            <div className="h-4 w-72 animate-pulse rounded bg-ink/[0.04] dark:bg-white/[0.04]" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-ink/[0.05] dark:bg-white/[0.05]"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
