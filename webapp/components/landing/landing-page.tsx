"use client";

import { MotionConfig } from "motion/react";
import { LandingHero } from "@/components/landing/hero";
import { LandingMarquee } from "@/components/landing/marquee";
import { LandingManifesto } from "@/components/landing/manifesto";
import { LandingProductStory } from "@/components/landing/product-story";
import { LandingSurfaces } from "@/components/landing/surfaces";
import { LandingCtaFooter } from "@/components/landing/cta-footer";

export function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <main>
        <LandingHero />
        <LandingMarquee />
        <LandingManifesto />
        <LandingProductStory />
        <LandingSurfaces />
        <LandingCtaFooter />
      </main>
    </MotionConfig>
  );
}
