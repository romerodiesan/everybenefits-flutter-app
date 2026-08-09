"use client";

import dynamic from "next/dynamic";
import { MotionConfig } from "motion/react";
import { LandingHero } from "@/components/landing/hero";

const LandingTuneChapters = dynamic(
  () =>
    import("@/components/landing/tune-chapters").then(
      (m) => m.LandingTuneChapters,
    ),
  { ssr: false },
);
const LandingManifesto = dynamic(
  () =>
    import("@/components/landing/manifesto").then((m) => m.LandingManifesto),
  { ssr: false },
);
const LandingTopicOrbit = dynamic(
  () =>
    import("@/components/landing/topic-orbit").then((m) => m.LandingTopicOrbit),
  { ssr: false },
);
const LandingCtaFooter = dynamic(
  () =>
    import("@/components/landing/cta-footer").then((m) => m.LandingCtaFooter),
  { ssr: false },
);

export function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <main>
        <LandingHero />
        <LandingTuneChapters />
        <LandingManifesto />
        <LandingTopicOrbit />
        <LandingCtaFooter />
      </main>
    </MotionConfig>
  );
}
