"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";

export function AiScreen() {
  const t = useTranslations();
  const reduced = useSafeReducedMotion();

  return (
    <div className="flex h-full flex-col px-4">
      <div className="flex items-center gap-2 pb-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-[11px] text-on-brand">
          ✦
        </span>
        <p className="font-display text-[13px] font-bold text-ink">
          {t("landingMockAiTitle")}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-2.5">
        <motion.p
          className="bubble-mine ml-auto max-w-[86%] px-2.5 py-2 text-[10.5px] leading-snug"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          {t("landingMockAiPrompt")}
        </motion.p>

        <motion.div
          className="mock-ai-answer rounded-xl px-2.5 py-2"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
        >
          <p className="text-[10.5px] leading-snug text-ink">
            {t("landingMockAiReply")}
            <motion.span
              className="ml-0.5 inline-block h-[11px] w-[2px] translate-y-[2px] bg-brand"
              animate={reduced ? undefined : { opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </p>
        </motion.div>

        <div className="mt-auto flex flex-wrap gap-1.5 pb-2">
          {(
            [
              "landingMockAiChip1",
              "landingMockAiChip2",
              "landingMockAiChip3",
            ] as const
          ).map((key, i) => (
            <motion.span
              key={key}
              className="rounded-full border border-glass-border bg-sheet px-2 py-1 text-[9px] font-medium text-muted"
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.55 + i * 0.08 }}
            >
              {t(key)}
            </motion.span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pb-1">
        <span className="flex h-8 flex-1 items-center rounded-full border border-glass-border bg-sheet px-3 text-[10px] text-muted">
          {t("landingMockComposer")}
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[11px] text-on-brand">
          ↑
        </span>
      </div>
    </div>
  );
}
