"use client";

import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/primitives";
import { useAuth } from "@/lib/providers/auth-provider";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";
import { PhoneMock } from "@/components/landing/phone-mock";
import { AiScreen } from "@/components/landing/screens/ai-screen";

const RISE = [0.22, 1, 0.36, 1] as const;

const ROTATING_KEYS = [
  "landingHowForumsTitle",
  "landingHowChatsTitle",
  "landingHowAcademyTitle",
  "landingHowAiTitle",
] as const;

export function LandingHero() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const signedIn = Boolean(user && profile);
  const reduced = useSafeReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [word, setWord] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const typeY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 90]);
  const accentY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, reduced ? 0 : -70],
  );

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setWord((prev) => (prev + 1) % ROTATING_KEYS.length);
    }, 2400);
    return () => window.clearInterval(id);
  }, [reduced]);

  const brand = t("brand").trim();
  const brandParts = brand.split(/\s+/);
  const brandFirst = brandParts[0] ?? "Pulse";
  const brandSecond = brandParts.slice(1).join(" ");

  return (
    <section
      ref={sectionRef}
      className="cine-bg grain relative min-h-[100svh] overflow-hidden"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-1/3 h-[30rem] w-[30rem] rounded-full bg-brand/20 blur-3xl"
        animate={reduced ? undefined : { x: [0, 40, 0], y: [0, 24, 0] }}
        transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
      />

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
          </div>
        </header>

        <div className="relative flex flex-1 flex-col justify-center py-14">
          <motion.div style={{ y: typeY }} className="relative z-10">
            <motion.p
              className={`select-none font-display text-[clamp(4.5rem,17vw,13rem)] font-extrabold uppercase leading-[0.82] tracking-[-0.03em] ${
                brandSecond ? "text-outline" : "text-ink"
              }`}
              initial={reduced ? false : { opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: RISE }}
            >
              {brandFirst}
            </motion.p>
            {brandSecond ? (
              <motion.p
                className="select-none font-display text-[clamp(4.5rem,17vw,13rem)] font-extrabold uppercase leading-[0.82] tracking-[-0.03em] text-ink"
                initial={reduced ? false : { opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.08, ease: RISE }}
              >
                {brandSecond}
              </motion.p>
            ) : null}

            <motion.div
              className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1"
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18, ease: RISE }}
            >
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                {t("landingStoryKicker")}
              </span>
              <span className="relative inline-flex h-[1.3em] min-w-40 overflow-hidden font-display text-3xl font-extrabold tracking-tight text-brand md:text-5xl">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={ROTATING_KEYS[word]}
                    initial={reduced ? false : { y: "100%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    exit={reduced ? { opacity: 0 } : { y: "-100%", opacity: 0 }}
                    transition={{ duration: 0.4, ease: RISE }}
                    className="whitespace-nowrap"
                  >
                    {t(ROTATING_KEYS[word])}
                  </motion.span>
                </AnimatePresence>
              </span>
            </motion.div>

            <motion.p
              className="mt-5 max-w-md text-sm leading-relaxed text-muted md:text-base"
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.26, ease: RISE }}
            >
              {t("heroSub")}
            </motion.p>

            {!loading && !signedIn && (
              <motion.div
                className="mt-7 flex flex-wrap gap-2.5"
                initial={reduced ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.34, ease: RISE }}
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
          </motion.div>

          <motion.div
            style={{ y: accentY }}
            className="pointer-events-none absolute -bottom-24 right-[-8%] hidden w-[220px] sm:block lg:right-[2%] lg:w-[240px]"
          >
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 60, rotate: 12 }}
              animate={{ opacity: 1, y: 0, rotate: 9 }}
              transition={{ duration: 0.9, delay: 0.3, ease: RISE }}
            >
              <PhoneMock activeTab="ai" className="landing-phone-glow">
                <AiScreen />
              </PhoneMock>
            </motion.div>
          </motion.div>
        </div>

        <div className="flex items-center justify-between pb-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">
          <span>{t("landingScrollHint")} ↓</span>
          <span>{t("tagline")}</span>
        </div>
      </div>
    </section>
  );
}
