"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";
import { FeedThreadCardPreview } from "@/components/landing/screens/feed-preview";
import { IconSpark } from "@/components/ai/pulse-parts";
import {
  LANDING_AI_REPLY,
  LANDING_AI_USER,
  LANDING_THREADS,
} from "@/lib/landing/fixtures";

const STATS = [
  { value: "04", labelKey: "landingStatSpaces" as const },
  { value: "02", labelKey: "landingStatLanguages" as const },
  { value: "01", labelKey: "landingStatCommunity" as const },
];

export function LandingSurfaces() {
  const t = useTranslations();
  const reduced = useSafeReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const cardOneY = useTransform(
    scrollYProgress,
    [0, 1],
    reduced ? [0, 0] : [60, -40],
  );
  const cardTwoY = useTransform(
    scrollYProgress,
    [0, 1],
    reduced ? [0, 0] : [100, -70],
  );

  const aiReplyPlain = LANDING_AI_REPLY.replace(/\s*\[S\d+\]/g, "");

  return (
    <section
      ref={sectionRef}
      className="cine-bg grain relative overflow-hidden border-t border-glass-border"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 md:py-36">
        <div className="relative">
          <motion.header
            className="relative z-10 max-w-3xl"
            initial={reduced ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55 }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
              {t("landingSurfacesKicker")}
            </p>
            <h2 className="mt-4 font-display text-4xl font-extrabold leading-[0.95] tracking-tight text-ink md:text-7xl">
              {t("landingSurfacesTitle")}
            </h2>
            <p className="mt-5 max-w-xl text-muted md:text-lg">
              {t("landingSurfacesBody")}
            </p>
          </motion.header>

          <motion.div
            style={{ y: cardOneY }}
            className="pointer-events-none relative z-0 mt-14 w-[min(88vw,22rem)] -rotate-3 md:absolute md:right-[14%] md:top-[-6%] md:mt-0"
            aria-hidden
          >
            <div className="landing-accent-card overflow-hidden">
              <FeedThreadCardPreview thread={LANDING_THREADS[1]} liked compact />
            </div>
          </motion.div>

          <motion.div
            style={{ y: cardTwoY }}
            className="pointer-events-none relative z-0 ml-auto mt-8 w-[min(80vw,20rem)] rotate-2 md:absolute md:bottom-[-30%] md:right-[2%] md:mt-0"
            aria-hidden
          >
            <div className="landing-accent-card space-y-2.5 p-4">
              <div className="bubble-mine ml-auto w-fit max-w-full px-3 py-2">
                <p className="text-xs leading-snug">{LANDING_AI_USER}</p>
              </div>
              <div className="flex gap-2">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand/14 text-brand">
                  <IconSpark width={12} height={12} />
                </span>
                <p className="text-xs leading-relaxed text-ink">
                  {aiReplyPlain}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-24 grid grid-cols-3 gap-6 border-t border-glass-border pt-10 md:mt-40">
          {STATS.map((stat, index) => (
            <motion.div
              key={stat.labelKey}
              initial={reduced ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
            >
              <p className="text-outline-brand select-none font-display text-5xl font-extrabold tabular-nums leading-none md:text-8xl">
                {stat.value}
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                {t(stat.labelKey)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
