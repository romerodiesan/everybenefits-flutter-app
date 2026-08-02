"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Link } from "@/i18n/navigation";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();
  const reduceMotion = useSafeReducedMotion();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mesh-bg flex min-h-[100svh] items-center justify-center px-4">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <motion.p
          className="font-display text-[5rem] font-extrabold leading-none text-red-400/80 md:text-[6.5rem]"
          animate={reduceMotion ? undefined : { rotate: [0, -2, 2, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          500
        </motion.p>
        <h1 className="mt-2 font-display text-2xl font-bold">
          {t("errorPage500Title")}
        </h1>
        <p className="mt-2 text-sm text-muted">{t("errorPage500Body")}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand transition hover:brightness-110"
          >
            {t("errorPageRetry")}
          </button>
          <Link
            href="/home"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-glass-border px-4 text-sm font-semibold transition hover:bg-ink/[0.04]"
          >
            {t("errorPageHome")}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
