"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";

const THREADS = [
  {
    titleKey: "landingMockThread1" as const,
    tagKey: "landingTopicMedicare" as const,
    score: 24,
    replies: 8,
  },
  {
    titleKey: "landingMockThread2" as const,
    tagKey: "landingTopicLife" as const,
    score: 17,
    replies: 5,
  },
  {
    titleKey: "landingMockThread3" as const,
    tagKey: "landingTopicObamacare" as const,
    score: 11,
    replies: 3,
  },
  {
    titleKey: "landingMockThread4" as const,
    tagKey: "landingTopicAnnuities" as const,
    score: 9,
    replies: 4,
  },
];

const CHIP_KEYS = [
  "landingTopicMedicare",
  "landingTopicLife",
  "landingTopicHealth",
  "landingTopicAnnuities",
] as const;

export function ForumsScreen() {
  const t = useTranslations();
  const reduced = useSafeReducedMotion();

  return (
    <div className="flex h-full flex-col px-4">
      <div className="flex items-center justify-between pb-3">
        <p className="font-display text-lg font-extrabold tracking-tight text-ink">
          {t("landingHowForumsTitle")}
        </p>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/16 text-[10px] font-bold text-brand">
          AR
        </span>
      </div>

      <div className="flex gap-1.5 pb-3">
        {CHIP_KEYS.map((key, i) => (
          <span
            key={key}
            className={`rounded-md px-2 py-1 text-[9px] font-semibold ${
              i === 0
                ? "bg-brand text-on-brand"
                : "border border-glass-border bg-sheet text-muted"
            }`}
          >
            {t(key)}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {THREADS.map((thread, i) => (
          <motion.div
            key={thread.titleKey}
            className="pulse-row flex gap-2 p-2.5"
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.09 }}
          >
            <div className="flex w-7 shrink-0 flex-col items-center rounded-lg border border-glass-border bg-mesh py-1">
              <span className="text-[8px] leading-none text-brand">▲</span>
              <span className="mt-0.5 font-display text-[11px] font-bold tabular-nums text-ink">
                {thread.score}
              </span>
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-ink">
                {t(thread.titleKey)}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[9px] text-muted">
                <span className="rounded bg-brand/12 px-1 py-0.5 font-semibold text-brand">
                  {t(thread.tagKey)}
                </span>
                <span>{t("landingMockReplies", { count: thread.replies })}</span>
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
