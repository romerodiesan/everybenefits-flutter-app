"use client";

import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import { signOutEverywhere } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/primitives";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";

/** Full-page wait state for new users pending admin/manager approval. */
export function PendingApprovalGate() {
  const t = useTranslations();
  const locale = useLocale();
  const reduceMotion = useSafeReducedMotion();

  return (
    <div className="mesh-bg flex min-h-[100svh] items-center justify-center px-4">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="pulse-sheet w-full max-w-md p-6 text-center md:p-8"
      >
        <motion.div
          aria-hidden
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15 text-brand"
          animate={
            reduceMotion
              ? undefined
              : { scale: [1, 1.06, 1], rotate: [0, 2, -2, 0] }
          }
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
            <path
              d="M12 3.5 13.8 9l5.7 1.2-4.5 3.8 1.4 5.7L12 16.8 7.6 19.7l1.4-5.7-4.5-3.8L10.2 9 12 3.5Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
        <h1 className="font-display text-xl font-bold tracking-tight md:text-2xl">
          {t("approvalPendingTitle")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {t("approvalPendingBody")}
        </p>
        <p className="mt-2 text-xs text-muted">{t("approvalPendingHint")}</p>
        <div className="mt-6">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() =>
              void signOutEverywhere({
                current: "pulse",
                locale,
                returnPath: "/login",
              })
            }
          >
            {t("navLogout")}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
