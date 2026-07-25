"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useTranslations } from "next-intl";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";
import { PhoneMock, type PhoneTab } from "@/components/landing/phone-mock";
import { ForumsScreen } from "@/components/landing/screens/forums-screen";
import { ChatsScreen } from "@/components/landing/screens/chats-screen";
import { AiScreen } from "@/components/landing/screens/ai-screen";

type Chapter = {
  id: string;
  titleKey: "landingHowForumsTitle" | "landingHowChatsTitle" | "landingHowAcademyTitle";
  featureKey: "landingFeatureForums" | "landingFeatureChats" | "landingFeatureAcademy";
  bodyKey: "landingHowForumsBody" | "landingHowChatsBody" | "landingHowAcademyBody";
  tab: PhoneTab;
  screen: ReactNode;
};

const CHAPTERS: Chapter[] = [
  {
    id: "forums",
    titleKey: "landingHowForumsTitle",
    featureKey: "landingFeatureForums",
    bodyKey: "landingHowForumsBody",
    tab: "home",
    screen: <ForumsScreen />,
  },
  {
    id: "chats",
    titleKey: "landingHowChatsTitle",
    featureKey: "landingFeatureChats",
    bodyKey: "landingHowChatsBody",
    tab: "chats",
    screen: <ChatsScreen />,
  },
  {
    id: "academy",
    titleKey: "landingHowAcademyTitle",
    featureKey: "landingFeatureAcademy",
    bodyKey: "landingHowAcademyBody",
    tab: "ai",
    screen: <AiScreen />,
  },
];

export function LandingProductStory() {
  const t = useTranslations();
  const reduced = useSafeReducedMotion();
  const trackRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start center", "end center"],
  });
  const railScale = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    restDelta: 0.001,
  });
  const phoneTilt = useTransform(
    scrollYProgress,
    [0, 1],
    reduced ? [0, 0] : [3.5, -3.5],
  );
  const phoneLift = useTransform(
    scrollYProgress,
    [0, 1],
    reduced ? [0, 0] : [16, -16],
  );

  const chapter = CHAPTERS[active];

  return (
    <section className="cine-vignette relative border-t border-glass-border bg-sheet/40">
      <div className="relative mx-auto max-w-4xl px-6">
        <motion.header
          className="max-w-xl pt-12 md:pt-16"
          initial={reduced ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            {t("landingStoryKicker")}
          </p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink md:text-5xl">
            {t("landingHowTitle")}
          </h2>
          <p className="mt-2 text-muted md:text-lg">{t("landingHowSub")}</p>
        </motion.header>

        <div className="grid gap-6 pb-10 pt-8 md:pt-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-12">
          <div className="relative">
            <span
              aria-hidden
              className="absolute left-0 top-0 hidden h-full w-px bg-glass-border lg:block"
            >
              <motion.i
                className="block h-full w-full origin-top bg-brand"
                style={{ scaleY: railScale }}
              />
            </span>

            <ol ref={trackRef} className="lg:pl-8">
              {CHAPTERS.map((item, index) => (
                <motion.li
                  key={item.id}
                  className="flex min-h-[46vh] flex-col justify-center py-8 lg:min-h-[58vh] lg:py-0"
                  onViewportEnter={() => setActive(index)}
                  viewport={{ margin: "-45% 0px -45% 0px", amount: "some" }}
                  animate={{
                    opacity: reduced || index === active ? 1 : 0.42,
                  }}
                  transition={{ duration: 0.35 }}
                >
                  <span className="font-display text-sm font-bold tabular-nums text-brand">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink md:text-4xl">
                    {t(item.titleKey)}
                  </h3>
                  <p className="mt-2 max-w-lg text-sm font-semibold text-brand md:text-base">
                    {t(item.featureKey)}
                  </p>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted md:text-base">
                    {t(item.bodyKey)}
                  </p>

                  <div className="mt-7 w-[212px] lg:hidden">
                    <PhoneMock activeTab={item.tab}>{item.screen}</PhoneMock>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>

          <motion.div
            className="sticky top-[12vh] hidden self-start lg:block"
            style={{ rotate: phoneTilt, y: phoneLift }}
          >
            <PhoneMock activeTab={chapter.tab}>
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
    </section>
  );
}
