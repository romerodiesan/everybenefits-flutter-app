"use client";

import { useScroll, useMotionValueEvent } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";

type Word = { text: string; highlighted: boolean };

function parseWords(source: string): Word[] {
  return source.split(/\s+/).map((raw) => {
    const highlighted = raw.startsWith("*");
    return { text: raw.replaceAll("*", ""), highlighted };
  });
}

export function LandingManifesto() {
  const t = useTranslations();
  const reduced = useSafeReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.85", "end 0.4"],
  });
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setProgress(value);
  });

  const words = useMemo(() => parseWords(t("landingManifesto")), [t]);
  const visible = reduced
    ? words.length
    : Math.floor(progress * (words.length + 4));

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden border-t border-glass-border px-6 py-24 md:py-40"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-brand/10 blur-3xl"
      />
      <div
        aria-hidden
        className="text-outline pointer-events-none absolute -left-4 top-8 select-none font-display text-[18vw] font-extrabold uppercase leading-none tracking-[-0.06em] opacity-30 md:top-12"
      >
        {t("landingManifestoKicker")}
      </div>

      <div className="relative mx-auto max-w-4xl pt-16 md:pt-24">
        <p className="font-display text-[clamp(1.75rem,4.5vw,3.25rem)] font-extrabold leading-[1.18] tracking-tight">
          {words.map((word, index) => (
            <span
              key={`${word.text}-${index}`}
              className={`transition-colors duration-300 ${
                index < visible
                  ? word.highlighted
                    ? "text-brand"
                    : "text-ink"
                  : "text-ink/12"
              }`}
            >
              {word.text}{" "}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
