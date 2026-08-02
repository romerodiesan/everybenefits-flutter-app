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

export function LandingMarquee() {
  const t = useTranslations();
  const reduced = useSafeReducedMotion();
  const topics = TOPIC_KEYS.map((key) => t(key));
  const track = [...topics, ...topics];

  return (
    <section
      className="relative overflow-hidden border-y border-glass-border bg-sheet/70 py-2.5 [mask-image:linear-gradient(90deg,transparent,black_7%,black_93%,transparent)]"
      aria-label={t("landingMarqueeLabel")}
    >
      <motion.div
        className="flex w-max items-center gap-6 px-6"
        animate={reduced ? undefined : { x: ["0%", "-50%"] }}
        transition={
          reduced
            ? undefined
            : { duration: 34, ease: "linear", repeat: Infinity }
        }
      >
        {track.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className="flex shrink-0 items-center gap-6 font-display text-sm font-semibold uppercase tracking-[0.14em] text-muted"
          >
            {label}
            <i className="block h-1 w-1 rounded-full bg-brand/60" />
          </span>
        ))}
      </motion.div>
    </section>
  );
}
