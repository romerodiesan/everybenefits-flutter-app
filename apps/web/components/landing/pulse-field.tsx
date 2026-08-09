"use client";

import { motion } from "motion/react";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";

const RINGS = [18, 32, 48, 66, 86] as const;

/** Soft topographic contour paths (viewBox 0 0 100 100). */
const CONTOURS = [
  "M-5 72 C18 66, 28 78, 48 74 S78 62, 105 70",
  "M-5 58 C22 52, 34 64, 52 58 S82 48, 105 56",
  "M-5 44 C20 38, 38 50, 55 44 S80 34, 105 42",
  "M-5 30 C24 26, 40 36, 58 30 S84 22, 105 28",
  "M-5 84 C16 80, 30 90, 50 86 S76 76, 105 82",
] as const;

type PulseFieldProps = {
  className?: string;
  /** Softer / smaller field for nested sections. */
  intensity?: "hero" | "soft";
};

export function PulseField({
  className = "",
  intensity = "hero",
}: PulseFieldProps) {
  const reduced = useSafeReducedMotion();
  const soft = intensity === "soft";

  return (
    <div
      aria-hidden
      className={`pulse-field pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div className="pulse-field-wash absolute inset-0" />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="pulse-ring-fade" cx="50%" cy="42%" r="55%">
            <stop offset="0%" stopColor="#1f6b4a" stopOpacity={soft ? 0.08 : 0.14} />
            <stop offset="70%" stopColor="#1f6b4a" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#1f6b4a" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse
          cx="50"
          cy="42"
          rx="48"
          ry="38"
          fill="url(#pulse-ring-fade)"
        />

        {CONTOURS.map((d, i) => (
          <motion.path
            key={d}
            d={d}
            fill="none"
            stroke="#1f6b4a"
            strokeWidth={soft ? 0.12 : 0.18}
            strokeOpacity={soft ? 0.12 : 0.18 - i * 0.02}
            vectorEffect="non-scaling-stroke"
            initial={false}
            animate={
              reduced
                ? undefined
                : {
                    strokeDashoffset: [0, -24],
                    opacity: soft
                      ? [0.1, 0.18, 0.1]
                      : [0.14, 0.28, 0.14],
                  }
            }
            transition={{
              strokeDashoffset: {
                duration: 28 + i * 4,
                repeat: Infinity,
                ease: "linear",
              },
              opacity: {
                duration: 7 + i,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
            strokeDasharray="6 10"
          />
        ))}
      </svg>

      <div className="absolute left-1/2 top-[42%] aspect-square w-[min(140vw,72rem)] -translate-x-1/2 -translate-y-1/2">
        {RINGS.map((size, i) => (
          <motion.span
            key={size}
            className="pulse-ring absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: `${size}%`,
              height: `${size}%`,
              borderColor: i === 2 ? "rgba(184, 224, 106, 0.35)" : undefined,
            }}
            initial={false}
            animate={
              reduced
                ? { opacity: soft ? 0.25 : 0.4, scale: 1 }
                : {
                    opacity: soft
                      ? [0.15, 0.35, 0.15]
                      : [0.22, 0.55, 0.22],
                    scale: [1, 1.03 + i * 0.008, 1],
                  }
            }
            transition={{
              duration: 4.2 + i * 0.55,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.28,
            }}
          />
        ))}

        <motion.span
          className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand shadow-[0_0_28px_8px_rgba(31,107,74,0.35)]"
          animate={
            reduced
              ? undefined
              : {
                  scale: [1, 1.35, 1],
                  boxShadow: [
                    "0 0 20px 6px rgba(31,107,74,0.28)",
                    "0 0 36px 14px rgba(184,224,106,0.35)",
                    "0 0 20px 6px rgba(31,107,74,0.28)",
                  ],
                }
          }
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
