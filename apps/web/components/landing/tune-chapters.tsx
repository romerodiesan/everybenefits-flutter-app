"use client";

import { type ReactNode, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "motion/react";
import { useTranslations } from "next-intl";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";
import { PhoneMock, type PhoneTab } from "@/components/landing/phone-mock";
import { ForumsScreen } from "@/components/landing/screens/forums-screen";
import { ChatsScreen } from "@/components/landing/screens/chats-screen";
import { AcademyScreen } from "@/components/landing/screens/academy-screen";
import { PulseField } from "@/components/landing/pulse-field";

type Channel = {
  id: string;
  freq: string;
  titleKey:
    | "landingHowForumsTitle"
    | "landingHowChatsTitle"
    | "landingHowAcademyTitle";
  bodyKey:
    | "landingHowForumsBody"
    | "landingHowChatsBody"
    | "landingHowAcademyBody";
  tab: PhoneTab;
  screen: ReactNode;
};

const CHANNELS: Channel[] = [
  {
    id: "forums",
    freq: "98.1",
    titleKey: "landingHowForumsTitle",
    bodyKey: "landingHowForumsBody",
    tab: "home",
    screen: <ForumsScreen />,
  },
  {
    id: "chats",
    freq: "101.4",
    titleKey: "landingHowChatsTitle",
    bodyKey: "landingHowChatsBody",
    tab: "chats",
    screen: <ChatsScreen />,
  },
  {
    id: "academy",
    freq: "104.7",
    titleKey: "landingHowAcademyTitle",
    bodyKey: "landingHowAcademyBody",
    tab: "academy",
    screen: <AcademyScreen />,
  },
];

const RISE = [0.22, 1, 0.36, 1] as const;

export function LandingTuneChapters() {
  const t = useTranslations();
  const reduced = useSafeReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const next = Math.min(
      CHANNELS.length - 1,
      Math.max(0, Math.floor(value * CHANNELS.length)),
    );
    setActive(next);
  });

  const dialRotate = useTransform(
    scrollYProgress,
    [0, 1],
    [0, reduced ? 0 : 270],
  );

  const channel = CHANNELS[active];

  return (
    <section ref={sectionRef} className="relative h-[400vh] bg-mesh">
      <div className="sticky top-0 flex h-[100svh] overflow-hidden border-t border-glass-border">
        <PulseField intensity="soft" className="opacity-60" />

        <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col px-6 py-10 md:flex-row md:items-center md:gap-12 md:py-14 lg:gap-16">
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
              {t("landingTuneKicker")}
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink md:text-5xl">
              {t("landingTuneTitle")}
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted md:text-base">
              {t("landingTuneSub")}
            </p>

            <div className="mt-8 flex items-center gap-4 md:mt-10">
              <motion.div
                aria-hidden
                style={{ rotate: dialRotate }}
                className="tune-dial relative hidden h-16 w-16 shrink-0 sm:block"
              >
                <span className="absolute inset-2 rounded-full border border-brand/30" />
                <span className="absolute left-1/2 top-1.5 h-2.5 w-0.5 -translate-x-1/2 rounded-full bg-brand" />
              </motion.div>
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-muted">
                  {t("landingTuneLocked")}
                </p>
                <p className="mt-0.5 font-display text-2xl font-extrabold tabular-nums tracking-tight text-brand md:text-3xl">
                  {channel.freq}
                  <span className="ml-1 text-sm font-semibold text-muted">
                    MHz
                  </span>
                </p>
              </div>
            </div>

            <ol className="mt-8 space-y-1 border-t border-glass-border pt-6">
              {CHANNELS.map((item, index) => {
                const locked = index === active;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`group flex w-full items-start gap-4 rounded-xl px-2 py-3 text-left transition ${
                        locked ? "bg-brand/8" : "hover:bg-sheet/80"
                      }`}
                      onClick={() => {
                        const el = sectionRef.current;
                        if (!el) return;
                        const rect = el.getBoundingClientRect();
                        const top =
                          window.scrollY +
                          rect.top +
                          (index / CHANNELS.length) * el.offsetHeight;
                        window.scrollTo({
                          top,
                          behavior: reduced ? "auto" : "smooth",
                        });
                      }}
                    >
                      <span
                        className={`select-none font-display text-sm font-extrabold tabular-nums tracking-tight ${
                          locked ? "text-brand" : "text-ink/25"
                        }`}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                          <h3
                            className={`font-display text-xl font-extrabold tracking-tight transition md:text-2xl ${
                              locked ? "text-ink" : "text-ink/35"
                            }`}
                          >
                            {t(item.titleKey)}
                          </h3>
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
                              locked ? "text-brand" : "text-transparent"
                            }`}
                          >
                            {t("landingTuneSignal")}
                          </span>
                        </div>
                        <AnimatePresence initial={false}>
                          {locked && (
                            <motion.p
                              initial={
                                reduced ? false : { opacity: 0, height: 0 }
                              }
                              animate={{ opacity: 1, height: "auto" }}
                              exit={
                                reduced
                                  ? { opacity: 0 }
                                  : { opacity: 0, height: 0 }
                              }
                              transition={{ duration: 0.35, ease: RISE }}
                              className="overflow-hidden text-sm leading-relaxed text-muted"
                            >
                              <span className="block pt-2">
                                {t(item.bodyKey)}
                              </span>
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="relative mx-auto mt-6 w-[min(100%,220px)] shrink-0 sm:w-[240px] md:mx-0 md:mt-0">
            <motion.div
              animate={
                reduced
                  ? undefined
                  : { rotate: active % 2 === 0 ? 3 : -3, y: [0, -6, 0] }
              }
              transition={{
                rotate: { duration: 0.5, ease: RISE },
                y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              <PhoneMock activeTab={channel.tab} className="landing-phone-glow">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={channel.id}
                    className="absolute inset-0"
                    initial={reduced ? false : { opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, y: -18 }}
                    transition={{ duration: 0.35, ease: RISE }}
                  >
                    {channel.screen}
                  </motion.div>
                </AnimatePresence>
              </PhoneMock>
            </motion.div>

            <div
              aria-hidden
              className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-brand/10 blur-3xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
