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
    offset: ["start 0.85", "end 0.45"],
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
      className="relative border-t border-glass-border bg-sheet/40 px-6 py-24 md:py-36"
    >
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
          {t("landingManifestoKicker")}
        </p>
        <p className="mt-6 font-display text-3xl font-extrabold leading-[1.15] tracking-tight md:text-5xl md:leading-[1.12]">
          {words.map((word, index) => (
            <span
              key={`${word.text}-${index}`}
              className={`transition-colors duration-300 ${
                index < visible
                  ? word.highlighted
                    ? "text-brand"
                    : "text-ink"
                  : "text-ink/15"
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
