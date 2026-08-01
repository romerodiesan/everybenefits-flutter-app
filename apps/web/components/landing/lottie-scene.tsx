"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";

type LottieSceneProps = {
  src: string;
  className?: string;
  loop?: boolean;
  /** Accessible name; decorative scenes omit this and stay aria-hidden. */
  label?: string;
};

export function LottieScene({
  src,
  className,
  loop = true,
  label,
}: LottieSceneProps) {
  const reduced = useSafeReducedMotion();

  return (
    <div
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      <DotLottieReact
        src={src}
        autoplay
        loop={Boolean(loop && !reduced)}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
