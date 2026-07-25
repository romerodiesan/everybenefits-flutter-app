"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/primitives";
import { useAuth } from "@/lib/providers/auth-provider";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";
import { LottieScene } from "@/components/landing/lottie-scene";
import { PhoneMock } from "@/components/landing/phone-mock";
import { ForumsScreen } from "@/components/landing/screens/forums-screen";

const RISE = [0.22, 1, 0.36, 1] as const;

export function LandingHero() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const signedIn = Boolean(user && profile);
  const reduced = useSafeReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const atmosphereY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, reduced ? 0 : 120],
  );
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -60]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 40]);

  return (
    <section
      ref={sectionRef}
      className="cine-bg cine-vignette relative min-h-[100svh] overflow-hidden"
    >
      <motion.div
        aria-hidden
        style={{ y: atmosphereY }}
        className="pointer-events-none absolute -top-[14vh] left-1/2 h-[88vh] w-[88vh] -translate-x-1/2 opacity-[0.055] blur-[2px] grayscale dark:opacity-[0.1]"
      >
        <LottieScene src="/lottie/shield.json" className="h-full w-full" />
      </motion.div>
      <motion.div
        aria-hidden
        style={{ y: atmosphereY }}
        className="pointer-events-none absolute -left-24 top-32 h-72 w-72 rounded-full bg-brand/20 blur-3xl"
        animate={reduced ? undefined : { x: [0, 26, 0], y: [0, 16, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-20 bottom-8 h-80 w-80 rounded-full bg-brand/12 blur-3xl"
        animate={reduced ? undefined : { x: [0, -20, 0], y: [0, -12, 0] }}
        transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col px-6 pt-5">
        <header className="flex items-center justify-end gap-3">
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
                onClick={() => router.replace(pathname, { locale: code })}
              >
                {code}
              </button>
            ))}
          </div>
          {!loading && !signedIn && (
            <Link href="/login">
              <Button variant="secondary">{t("navLogin")}</Button>
            </Link>
          )}
          {!loading && signedIn && (
            <Link href="/home">
              <Button>{t("ctaOpenApp")}</Button>
            </Link>
          )}
        </header>

        <div className="grid flex-1 items-end gap-2 pt-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8 lg:pt-2">
          <motion.div style={{ y: copyY }} className="pb-8 lg:pb-20">
            <motion.p
              className="text-xs font-semibold uppercase tracking-[0.2em] text-brand"
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: RISE }}
            >
              {t("landingHeroKicker")}
            </motion.p>
            <motion.p
              className="mt-3 font-display text-[3.5rem] font-extrabold leading-[0.92] tracking-[-0.04em] text-ink sm:text-7xl lg:text-[6.5rem]"
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05, ease: RISE }}
            >
              {t("brand")}
            </motion.p>
            <motion.h1
              className="mt-4 max-w-md font-display text-xl font-semibold leading-snug text-ink/90 md:text-2xl"
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12, ease: RISE }}
            >
              {t("heroHeadline")}
            </motion.h1>
            <motion.p
              className="mt-3 max-w-md text-sm leading-relaxed text-muted md:text-base"
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18, ease: RISE }}
            >
              {t("heroSub")}
            </motion.p>
            <motion.div
              className="mt-6 flex flex-wrap gap-2.5"
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24, ease: RISE }}
            >
              {signedIn ? (
                <Link href="/home">
                  <Button className="min-w-40">{t("ctaOpenApp")}</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button className="min-w-36">{t("ctaEnter")}</Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="secondary" className="min-w-36">
                      {t("ctaRegister")}
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>
          </motion.div>

          <motion.div
            style={{ y: phoneY }}
            className="mx-auto w-[208px] translate-y-6 sm:w-[248px] lg:w-[300px] lg:translate-y-14"
          >
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1, ease: RISE }}
            >
              <PhoneMock activeTab="home">
                <ForumsScreen />
              </PhoneMock>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
