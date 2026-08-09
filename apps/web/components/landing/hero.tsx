"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/primitives";
import { useCachedSignedInHint } from "@/lib/use-cached-signed-in-hint";
import { switchLocale } from "@/lib/i18n/switch-locale";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";
import { PulseField } from "@/components/landing/pulse-field";

const RISE = [0.22, 1, 0.36, 1] as const;

export function LandingHero() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const signedIn = useCachedSignedInHint();
  const reduced = useSafeReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const typeY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 70]);
  const fieldScale = useTransform(
    scrollYProgress,
    [0, 1],
    [1, reduced ? 1 : 1.12],
  );

  return (
    <section
      ref={sectionRef}
      className="grain relative min-h-[100svh] overflow-hidden bg-mesh"
    >
      <motion.div style={{ scale: fieldScale }} className="absolute inset-0">
        <PulseField />
      </motion.div>

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col px-6 pt-5">
        <header className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="font-display text-sm font-extrabold uppercase tracking-[0.2em] text-ink/80"
          >
            {t("brandShort")}
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-full border border-glass-border bg-sheet/70 p-0.5">
              {(["es", "en"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase transition ${
                    locale === code
                      ? "bg-brand text-on-brand"
                      : "text-muted hover:text-ink"
                  }`}
                  onClick={() => switchLocale(router, pathname, code)}
                >
                  {code}
                </button>
              ))}
            </div>
            {!signedIn && (
              <Link href="/login">
                <Button variant="secondary">{t("navLogin")}</Button>
              </Link>
            )}
            {signedIn && (
              <Link href="/home">
                <Button>{t("ctaOpenApp")}</Button>
              </Link>
            )}
          </div>
        </header>

        <div className="relative flex flex-1 flex-col justify-center py-16 md:py-20">
          <motion.div style={{ y: typeY }} className="relative z-10 max-w-4xl">
            <motion.p
              className="text-xs font-semibold uppercase tracking-[0.28em] text-brand"
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: RISE }}
            >
              {t("landingFieldKicker")}
            </motion.p>

            <motion.h1
              className="mt-4 select-none font-display text-[clamp(4.75rem,18vw,13.5rem)] font-extrabold uppercase leading-[0.8] tracking-[-0.04em] text-ink"
              initial={reduced ? false : { opacity: 0, y: 44 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: RISE }}
            >
              {t("brand")}
            </motion.h1>

            <motion.p
              className="mt-6 max-w-xl font-display text-2xl font-bold leading-snug tracking-tight text-ink md:text-4xl md:leading-tight"
              initial={reduced ? false : { opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12, ease: RISE }}
            >
              {t("heroHeadline")}
            </motion.p>

            <motion.p
              className="mt-4 max-w-md text-sm leading-relaxed text-muted md:text-base"
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.22, ease: RISE }}
            >
              {t("heroSub")}
            </motion.p>

            {!signedIn && (
              <motion.div
                className="mt-8 flex flex-wrap gap-2.5"
                initial={reduced ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.32, ease: RISE }}
              >
                <Link href="/register">
                  <Button className="min-w-36">{t("ctaJoin")}</Button>
                </Link>
                <Link href="/login">
                  <Button variant="secondary" className="min-w-36">
                    {t("ctaEnter")}
                  </Button>
                </Link>
              </motion.div>
            )}

            {signedIn && (
              <motion.div
                className="mt-8"
                initial={reduced ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.32, ease: RISE }}
              >
                <Link href="/home">
                  <Button className="min-w-40">{t("ctaOpenApp")}</Button>
                </Link>
              </motion.div>
            )}
          </motion.div>
        </div>

        <div className="flex items-center justify-between pb-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">
          <span className="inline-flex items-center gap-2">
            <span className="pulse-scroll-dot inline-block h-1.5 w-1.5 rounded-full bg-brand" />
            {t("landingScrollHint")}
          </span>
          <span className="max-w-[14rem] text-right leading-relaxed sm:max-w-none">
            {t("tagline")}
          </span>
        </div>
      </div>
    </section>
  );
}
