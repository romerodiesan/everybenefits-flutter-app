"use client";

import { MotionConfig } from "motion/react";
import { LandingHero } from "@/components/landing/hero";
import { LandingMarquee } from "@/components/landing/marquee";
import { LandingProductStory } from "@/components/landing/product-story";
import { LandingCtaFooter } from "@/components/landing/cta-footer";

export function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <main>
        <LandingHero />
        <LandingMarquee />
        <LandingProductStory />
        <LandingCtaFooter />
      </main>
    </MotionConfig>
  );
}
