"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";

const TOPIC_KEYS = [
  "landingTopicMedicare",
  "landingTopicLife",
  "landingTopicHealth",
  "landingTopicNpn",
  "landingTopicObamacare",
  "landingTopicAnnuities",
  "landingTopicCompliance",
  "landingTopicAuto",
] as const;

/** Polar placement: angle deg, radius % of container. */
const ORBITS: { angle: number; radius: number; size: "sm" | "md" | "lg" }[] = [
  { angle: 0, radius: 38, size: "lg" },
  { angle: 45, radius: 42, size: "md" },
  { angle: 90, radius: 36, size: "sm" },
  { angle: 135, radius: 44, size: "md" },
  { angle: 180, radius: 40, size: "lg" },
  { angle: 225, radius: 46, size: "sm" },
  { angle: 270, radius: 34, size: "md" },
  { angle: 315, radius: 42, size: "sm" },
];

const SIZE_CLASS = {
  sm: "text-xs px-3 py-1.5",
  md: "text-sm px-3.5 py-2",
  lg: "text-base px-4 py-2.5",
} as const;

export function LandingTopicOrbit() {
  const t = useTranslations();
  const reduced = useSafeReducedMotion();

  return (
    <section className="relative overflow-hidden border-t border-glass-border bg-sheet/50 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
            {t("landingOrbitKicker")}
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink md:text-5xl">
            {t("landingOrbitTitle")}
          </h2>
          <p className="mt-3 text-muted md:text-lg">{t("landingOrbitSub")}</p>
        </div>

        <div className="relative mx-auto mt-14 aspect-square w-full max-w-lg md:mt-20 md:max-w-xl">
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand/15"
          />
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 h-[48%] w-[48%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-brand/20"
          />
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 h-[24%] w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand/25"
          />

          <motion.div
            className="absolute inset-0"
            animate={reduced ? undefined : { rotate: 360 }}
            transition={{
              duration: 80,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {TOPIC_KEYS.map((key, i) => {
              const orbit = ORBITS[i];
              const rad = (orbit.angle * Math.PI) / 180;
              const x = 50 + Math.cos(rad) * orbit.radius;
              const y = 50 + Math.sin(rad) * orbit.radius;

              return (
                <motion.span
                  key={key}
                  className={`topic-orbit-chip absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-glass-border bg-sheet font-semibold text-ink shadow-sm ${SIZE_CLASS[orbit.size]}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  animate={
                    reduced
                      ? undefined
                      : { rotate: -360 }
                  }
                  transition={{
                    duration: 80,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  {t(key)}
                </motion.span>
              );
            })}
          </motion.div>

          <div className="absolute left-1/2 top-1/2 z-10 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-brand text-center text-on-brand shadow-[0_0_40px_12px_rgba(31,107,74,0.25)] md:h-28 md:w-28">
            <span className="font-display text-xs font-bold uppercase tracking-[0.18em] opacity-80">
              {t("landingOrbitCore")}
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight md:text-xl">
              {t("brandShort")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
