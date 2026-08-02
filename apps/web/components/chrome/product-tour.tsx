"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { updateUserProfile } from "@/lib/firebase/users";
import {
  markLocalTourDone,
  PRODUCT_TOUR_VERSION,
  shouldShowProductTour,
} from "@/lib/product-tour";
import type { UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/primitives";

export type TourTargetId =
  | "shell-apps"
  | "nav-home"
  | "nav-chats"
  | "nav-academy"
  | "nav-ai"
  | "nav-profile";

type StepDef = {
  id: TourTargetId;
  titleKey:
    | "tourWelcomeTitle"
    | "tourCommunityTitle"
    | "tourChatsTitle"
    | "tourAcademyTitle"
    | "tourAiTitle"
    | "tourYouTitle";
  bodyKey:
    | "tourWelcomeBody"
    | "tourCommunityBody"
    | "tourChatsBody"
    | "tourAcademyBody"
    | "tourAiBody"
    | "tourYouBody"
    | "tourYouBodyAgent";
  requireAi?: boolean;
};

const ALL_STEPS: StepDef[] = [
  {
    id: "shell-apps",
    titleKey: "tourWelcomeTitle",
    bodyKey: "tourWelcomeBody",
  },
  {
    id: "nav-home",
    titleKey: "tourCommunityTitle",
    bodyKey: "tourCommunityBody",
  },
  {
    id: "nav-chats",
    titleKey: "tourChatsTitle",
    bodyKey: "tourChatsBody",
  },
  {
    id: "nav-academy",
    titleKey: "tourAcademyTitle",
    bodyKey: "tourAcademyBody",
  },
  {
    id: "nav-ai",
    titleKey: "tourAiTitle",
    bodyKey: "tourAiBody",
    requireAi: true,
  },
  {
    id: "nav-profile",
    titleKey: "tourYouTitle",
    bodyKey: "tourYouBody",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

function readTargetRect(id: TourTargetId): Rect | null {
  if (typeof document === "undefined") return null;
  // Prefer the visible instance (desktop sidebar vs mobile tab bar).
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`),
  ).filter((el) => {
    const r = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return (
      r.width > 0 &&
      r.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none"
    );
  });
  if (!nodes.length) return null;
  const r = nodes[0]!.getBoundingClientRect();
  const pad = 8;
  return {
    top: Math.max(8, r.top - pad),
    left: Math.max(8, r.left - pad),
    width: Math.min(window.innerWidth - 16, r.width + pad * 2),
    height: Math.min(window.innerHeight - 16, r.height + pad * 2),
  };
}

function tooltipPlacement(rect: Rect): {
  top: number;
  left: number;
  maxWidth: number;
} {
  const gap = 14;
  const maxWidth = Math.min(360, window.innerWidth - 24);
  const spaceBelow = window.innerHeight - (rect.top + rect.height);
  const preferBelow = spaceBelow > 180 || rect.top < 140;
  const top = preferBelow
    ? rect.top + rect.height + gap
    : Math.max(12, rect.top - gap - 160);
  const left = Math.min(
    Math.max(12, rect.left + rect.width / 2 - maxWidth / 2),
    window.innerWidth - maxWidth - 12,
  );
  return { top, left, maxWidth };
}

export function ProductTour({
  profile,
  pulseAiEnabled,
  onCompleted,
}: {
  profile: UserProfile;
  pulseAiEnabled: boolean;
  onCompleted?: (next: UserProfile) => void;
}) {
  const t = useTranslations();
  const titleId = useId();
  const [open, setOpen] = useState(() => shouldShowProductTour(profile));
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);

  const isAgent =
    profile.role === "agent" ||
    profile.role === "admin" ||
    profile.role === "instructor" ||
    profile.role === "manager";

  const steps = useMemo(
    () =>
      ALL_STEPS.filter((s) => !s.requireAi || pulseAiEnabled).map((s) =>
        s.id === "nav-profile" && isAgent
          ? { ...s, bodyKey: "tourYouBodyAgent" as const }
          : s,
      ),
    [pulseAiEnabled, isAgent],
  );

  useEffect(() => {
    setOpen(shouldShowProductTour(profile));
  }, [profile]);

  useEffect(() => {
    if (step >= steps.length) setStep(Math.max(0, steps.length - 1));
  }, [steps.length, step]);

  const measure = useCallback(() => {
    const current = steps[step];
    if (!current) {
      setRect(null);
      return;
    }
    setRect(readTargetRect(current.id));
  }, [step, steps]);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    const timer = window.setInterval(measure, 400);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      window.clearInterval(timer);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !steps.length) return null;

  const current = steps[step]!;
  const isLast = step === steps.length - 1;
  const tip = rect ? tooltipPlacement(rect) : null;

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    markLocalTourDone();
    const next = {
      ...profile,
      productTourVersion: PRODUCT_TOUR_VERSION,
    };
    try {
      await updateUserProfile(profile, {
        productTourVersion: PRODUCT_TOUR_VERSION,
      });
      onCompleted?.(next);
    } catch (error) {
      console.error("product tour save failed", error);
      onCompleted?.(next);
    } finally {
      setOpen(false);
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Dim + spotlight hole */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <mask id={`${titleId}-mask`}>
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx={14}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(12,13,16,0.72)"
          mask={`url(#${titleId}-mask)`}
        />
      </svg>

      {rect && (
        <motion.div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-brand shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand)_28%,transparent)]"
          initial={false}
          animate={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}

      <AnimatePresence mode="wait">
        {tip && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute z-[81] rounded-2xl border border-glass-border bg-[color:var(--mesh-deep)] p-4 shadow-2xl"
            style={{
              top: tip.top,
              left: tip.left,
              width: tip.maxWidth,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">
                {t("tourEyebrow")}
              </p>
              <button
                type="button"
                className="text-xs font-semibold text-muted transition hover:text-ink disabled:opacity-50"
                disabled={busy}
                onClick={() => void finish()}
              >
                {t("tourSkip")}
              </button>
            </div>
            <p className="mt-2 text-xs font-semibold tabular-nums text-muted">
              {t("tourStep", { current: step + 1, total: steps.length })}
            </p>
            <h2
              id={titleId}
              className="mt-1 font-display text-lg font-bold tracking-tight text-ink"
            >
              {t(current.titleKey)}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t(current.bodyKey)}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="mr-auto flex items-center gap-1.5" aria-hidden>
                {steps.map((s, i) => (
                  <span
                    key={s.id}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step
                        ? "w-5 bg-brand"
                        : i < step
                          ? "w-2.5 bg-brand/45"
                          : "w-2.5 bg-ink/15 dark:bg-white/20"
                    }`}
                  />
                ))}
              </div>
              {step > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 px-3 text-sm"
                  disabled={busy}
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                >
                  {t("tourBack")}
                </Button>
              )}
              <Button
                type="button"
                className="h-9 min-w-[7.5rem] px-3 text-sm"
                disabled={busy}
                onClick={() => {
                  if (isLast) void finish();
                  else setStep((s) => Math.min(steps.length - 1, s + 1));
                }}
              >
                {isLast ? t("tourDone") : t("tourNext")}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!rect && (
        <div className="absolute inset-x-0 bottom-8 flex justify-center px-4">
          <div className="pulse-sheet max-w-sm p-4 text-sm text-muted">
            {t("tourWaitingTarget")}
            <div className="mt-3 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-9"
                onClick={() => void finish()}
              >
                {t("tourSkip")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
