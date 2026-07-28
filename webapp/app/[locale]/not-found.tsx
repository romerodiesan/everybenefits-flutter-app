"use client";

import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Link } from "@/i18n/navigation";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";

export default function NotFound() {
  const t = useTranslations();
  const reduceMotion = useSafeReducedMotion();

  return (
    <div className="mesh-bg flex min-h-[100svh] items-center justify-center px-4">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <motion.p
          className="font-display text-[5rem] font-extrabold leading-none text-brand/80 md:text-[6.5rem]"
          animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        >
          404
        </motion.p>
        <h1 className="mt-2 font-display text-2xl font-bold">
          {t("errorPage404Title")}
        </h1>
        <p className="mt-2 text-sm text-muted">{t("errorPage404Body")}</p>
        <Link
          href="/home"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand transition hover:brightness-110"
        >
          {t("errorPageHome")}
        </Link>
      </motion.div>
    </div>
  );
}
