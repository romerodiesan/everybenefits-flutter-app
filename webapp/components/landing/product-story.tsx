"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";
import { PhoneMock, type PhoneTab } from "@/components/landing/phone-mock";
import { ForumsScreen } from "@/components/landing/screens/forums-screen";
import { ChatsScreen } from "@/components/landing/screens/chats-screen";
import { AcademyScreen } from "@/components/landing/screens/academy-screen";
import { AiScreen } from "@/components/landing/screens/ai-screen";

type Chapter = {
  id: string;
  titleKey:
    | "landingHowForumsTitle"
    | "landingHowChatsTitle"
    | "landingHowAcademyTitle"
    | "landingHowAiTitle";
  bodyKey:
    | "landingHowForumsBody"
    | "landingHowChatsBody"
    | "landingHowAcademyBody"
    | "landingHowAiBody";
  tab: PhoneTab;
  screen: ReactNode;
};

const CHAPTERS: Chapter[] = [
  {
    id: "forums",
    titleKey: "landingHowForumsTitle",
    bodyKey: "landingHowForumsBody",
    tab: "home",
    screen: <ForumsScreen />,
  },
  {
    id: "chats",
    titleKey: "landingHowChatsTitle",
    bodyKey: "landingHowChatsBody",
    tab: "chats",
    screen: <ChatsScreen />,
  },
  {
    id: "academy",
    titleKey: "landingHowAcademyTitle",
    bodyKey: "landingHowAcademyBody",
    tab: "academy",
    screen: <AcademyScreen />,
  },
  {
    id: "ai",
    titleKey: "landingHowAiTitle",
    bodyKey: "landingHowAiBody",
    tab: "ai",
    screen: <AiScreen />,
  },
];

export function LandingProductStory() {
  const t = useTranslations();
  const reduced = useSafeReducedMotion();
  const [active, setActive] = useState(0);

  const chapter = CHAPTERS[active];

  return (
    <section className="grain relative border-t border-glass-border bg-mesh">
      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-14 md:pt-20">
        <motion.header
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
            {t("landingIndexKicker")}
          </p>
          <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink md:text-6xl">
            {t("landingHowTitle")}
          </h2>
          <p className="mt-2 max-w-lg text-muted md:text-lg">
            {t("landingHowSub")}
          </p>
        </motion.header>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-16">
          <ol>
            {CHAPTERS.map((item, index) => {
              const isActive = index === active;
              return (
                <motion.li
                  key={item.id}
                  className="group cursor-default border-t border-glass-border py-9 last:border-b md:py-12"
                  onViewportEnter={() => setActive(index)}
                  viewport={{ margin: "-40% 0px -40% 0px", amount: "some" }}
                  onMouseEnter={() => setActive(index)}
                >
                  <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-5 md:gap-9">
                    <span
                      className={`select-none font-display text-5xl font-extrabold tabular-nums leading-none tracking-[-0.04em] transition-colors duration-300 md:text-8xl ${
                        isActive ? "text-brand" : "text-outline"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3
                        className={`font-display text-3xl font-extrabold tracking-tight transition-colors duration-300 md:text-6xl ${
                          isActive ? "text-ink" : "text-ink/30"
                        }`}
                      >
                        {t(item.titleKey)}
                      </h3>
                      <AnimatePresence initial={false}>
                        {isActive && (
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
                            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            className="max-w-md overflow-hidden text-sm leading-relaxed text-muted md:text-base"
                          >
                            <span className="block pt-3">{t(item.bodyKey)}</span>
                          </motion.p>
                        )}
                      </AnimatePresence>

                      {/* Mobile: accent preview inline under the active row */}
                      <AnimatePresence initial={false}>
                        {isActive && (
                          <motion.div
                            initial={
                              reduced ? false : { opacity: 0, height: 0 }
                            }
                            animate={{ opacity: 1, height: "auto" }}
                            exit={
                              reduced
                                ? { opacity: 0 }
                                : { opacity: 0, height: 0 }
                            }
                            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden lg:hidden"
                          >
                            <div className="w-[170px] rotate-2 pt-5">
                              <PhoneMock activeTab={item.tab}>
                                {item.screen}
                              </PhoneMock>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ol>

          <div className="sticky top-[16vh] hidden self-start lg:block">
            <motion.div
              animate={reduced ? undefined : { rotate: active % 2 === 0 ? 4 : -4 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <PhoneMock activeTab={chapter.tab} className="landing-phone-glow">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={chapter.id}
                    className="absolute inset-0"
                    initial={reduced ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, y: -14 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {chapter.screen}
                  </motion.div>
                </AnimatePresence>
              </PhoneMock>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
