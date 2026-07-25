"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";

export function ChatsScreen() {
  const t = useTranslations();
  const reduced = useSafeReducedMotion();

  return (
    <div className="flex h-full flex-col px-4">
      <div className="flex items-center gap-2 border-b border-glass-border pb-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/16 text-[10px] font-bold text-brand">
          TM
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-[13px] font-bold text-ink">
            {t("landingMockChatName")}
          </p>
          <p className="flex items-center gap-1 text-[9px] text-muted">
            <i className="block h-1.5 w-1.5 rounded-full bg-brand" />
            {t("landingMockChatOnline")}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-end gap-2 py-3">
        <motion.p
          className="bubble-other max-w-[82%] px-2.5 py-2 text-[10.5px] leading-snug"
          initial={reduced ? false : { opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          {t("landingMockMsgFirst")}
        </motion.p>
        <motion.p
          className="bubble-mine ml-auto max-w-[82%] px-2.5 py-2 text-[10.5px] leading-snug"
          initial={reduced ? false : { opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.14 }}
        >
          {t("landingMockMsgSecond")}
        </motion.p>
        <motion.p
          className="bubble-other max-w-[82%] px-2.5 py-2 text-[10.5px] leading-snug"
          initial={reduced ? false : { opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.22 }}
        >
          {t("landingMockMsgOther")}
        </motion.p>
        <motion.p
          className="bubble-mine ml-auto max-w-[82%] px-2.5 py-2 text-[10.5px] leading-snug"
          initial={reduced ? false : { opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
        >
          {t("landingMockMsgMine")}
        </motion.p>
        <motion.span
          className="bubble-other flex w-fit items-center gap-1 px-2.5 py-2.5"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          {[0, 1, 2].map((dot) => (
            <motion.i
              key={dot}
              className="block h-1.5 w-1.5 rounded-full bg-muted"
              animate={reduced ? undefined : { opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: dot * 0.18,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.span>
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
