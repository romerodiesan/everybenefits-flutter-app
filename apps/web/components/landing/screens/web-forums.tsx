"use client";

import { useTranslations } from "next-intl";
import {
  LANDING_THREADS,
  LANDING_TOPIC_COUNTS,
} from "@/lib/landing/fixtures";
import { ForumsFeedChrome } from "@/components/landing/screens/feed-preview";

const NAV = [
  { key: "navHome" as const, active: true },
  { key: "navChats" as const, active: false, badge: "3" },
  { key: "navAi" as const, active: false },
  { key: "navAcademy" as const, active: false },
  { key: "navProfile" as const, active: false },
];

export function WebForumsPreview() {
  const t = useTranslations();

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-48 shrink-0 flex-col border-r border-glass-border bg-sheet sm:flex">
        <div className="border-b border-glass-border px-2.5 pb-2 pt-2.5">
          <p className="px-1 font-display text-sm font-bold tracking-tight">
            {t("brandShort")}
          </p>
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-ink/[0.035] px-2 py-1.5 dark:bg-white/[0.04]">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 font-display text-[11px] font-bold text-brand"
              aria-hidden
            >
              A
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold leading-tight">
                Alex Rivera
              </p>
              <span className="mt-0.5 inline-flex rounded bg-brand/10 px-1 py-px text-[8px] font-bold uppercase tracking-wide text-brand">
                {t("roleAgent")}
              </span>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-2 py-2">
          {NAV.map((item) => (
            <span
              key={item.key}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium ${
                item.active
                  ? "bg-brand/10 text-ink shadow-[inset_2px_0_0_0_var(--brand)]"
                  : "text-muted"
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{t(item.key)}</span>
              {"badge" in item && item.badge ? (
                <span className="inline-flex min-w-[1rem] items-center justify-center rounded bg-brand px-1 py-px text-[8px] font-bold text-on-brand">
                  {item.badge}
                </span>
              ) : null}
            </span>
          ))}
        </nav>
        <div className="mt-auto grid grid-cols-2 gap-1 border-t border-glass-border px-2 py-2">
          <div className="rounded-lg bg-ink/[0.035] px-1.5 py-1.5 dark:bg-white/[0.04]">
            <p className="text-[7px] font-bold uppercase tracking-wide text-muted">
              {t("navStatUnreadShort")}
            </p>
            <p className="font-display text-sm font-bold tabular-nums leading-none">
              3
            </p>
          </div>
          <div className="rounded-lg bg-ink/[0.035] px-1.5 py-1.5 dark:bg-white/[0.04]">
            <p className="text-[7px] font-bold uppercase tracking-wide text-muted">
              {t("navStatLearningShort")}
            </p>
            <p className="font-display text-sm font-bold tabular-nums leading-none">
              2
            </p>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1 overflow-hidden">
        <ForumsFeedChrome
          threads={LANDING_THREADS}
          topicCounts={LANDING_TOPIC_COUNTS}
          compact={false}
        />
      </div>
    </div>
  );
}
