"use client";

import { useTranslations } from "next-intl";

export function AdminShellSkeleton({ hint }: { hint?: string }) {
  const t = useTranslations();
  return (
    <div className="admin-bg flex h-[100svh] overflow-hidden">
      <aside className="hidden h-full w-72 shrink-0 flex-col border-r border-glass-border bg-sheet lg:flex">
        <div className="border-b border-glass-border px-3 pb-3 pt-3.5">
          <p className="px-1 font-display text-lg font-bold tracking-tight">
            {t("brandShort")}
          </p>
          <p className="mt-1 px-1 text-[11px] text-muted">
            {hint ?? t("bootPreparing")}
          </p>
          <div className="mt-3 h-[52px] animate-pulse rounded-xl bg-white/[0.05]" />
        </div>
        <div className="flex-1 space-y-1.5 px-2.5 py-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-xl bg-white/[0.05]"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
        <div className="space-y-2 border-t border-glass-border px-2.5 py-3">
          <div className="h-9 animate-pulse rounded-xl bg-white/[0.05]" />
          <div className="h-9 animate-pulse rounded-xl bg-white/[0.05]" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-glass-border px-3 py-3 lg:hidden">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-white/[0.05]" />
          <div className="h-8 flex-1 animate-pulse rounded-lg bg-white/[0.05]" />
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-6xl space-y-4">
            <p className="text-sm text-muted lg:hidden">{hint ?? t("bootPreparing")}</p>
            <div className="h-9 w-56 animate-pulse rounded-lg bg-white/[0.06]" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl bg-white/[0.05]"
                />
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[16/10] animate-pulse rounded-xl bg-white/[0.05]"
                  style={{ animationDelay: `${i * 70}ms` }}
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
