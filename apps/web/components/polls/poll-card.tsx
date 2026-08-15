"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import {
  localizePollText,
  pollOptionShare,
  type Poll,
  type PollSurface,
} from "@pulse/shared";
import { usePolls } from "@/lib/hooks/use-polls";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";

function PollView({
  poll,
  myOptionId,
  canVote,
  busy,
  onVote,
  onDismiss,
}: {
  poll: Poll;
  myOptionId: string | null;
  canVote: boolean;
  busy: boolean;
  onVote: (optionId: string) => void;
  onDismiss: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const question = localizePollText(poll.question, locale);
  const showResults =
    Boolean(myOptionId) || poll.showResultsBeforeVote || !canVote;
  const canChange = Boolean(myOptionId) && poll.allowChange && canVote;

  return (
    <aside
      aria-label={t("pollRegion")}
      className="pulse-sheet relative overflow-hidden p-4"
    >
      {poll.dismissible ? (
        <button
          type="button"
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-ink/5 hover:text-ink dark:hover:bg-white/10"
          aria-label={t("pollDismiss")}
          onClick={onDismiss}
        >
          ×
        </button>
      ) : null}
      <p className="pr-8 font-display text-base font-bold leading-snug">
        {question}
      </p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {t("pollVoteCount", { count: poll.voteCount })}
      </p>
      <div className="mt-3 grid gap-2" role="list">
        {poll.options.map((option) => {
          const selected = myOptionId === option.id;
          const share = pollOptionShare(poll, option.id);
          const percent = Math.round(share * 100);
          const disabled =
            busy ||
            !canVote ||
            (Boolean(myOptionId) && !poll.allowChange);
          return (
            <button
              key={option.id}
              type="button"
              role="listitem"
              disabled={disabled && !selected}
              aria-pressed={selected}
              onClick={() => {
                if (disabled && !canChange) return;
                if (selected && !poll.allowChange) return;
                onVote(option.id);
              }}
              className={`relative overflow-hidden rounded-xl border px-3 py-2 text-left text-sm transition ${
                selected
                  ? "border-brand bg-brand/10 font-semibold"
                  : "border-glass-border hover:border-brand/40"
              } ${disabled && !selected ? "opacity-70" : ""}`}
            >
              {showResults ? (
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 bg-brand/15"
                  style={{ width: `${percent}%` }}
                />
              ) : null}
              <span className="relative z-[1] flex items-center justify-between gap-3">
                <span>{localizePollText(option.label, locale)}</span>
                {showResults ? (
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    {percent}%
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      {!canVote ? (
        <p className="mt-2 text-xs text-muted">{t("pollSignIn")}</p>
      ) : null}
    </aside>
  );
}

function SurfacePoll({ surface }: { surface: PollSurface }) {
  const t = useTranslations();
  const reduceMotion = useSafeReducedMotion();
  const {
    poll,
    polls,
    myOptionId,
    index,
    count,
    busy,
    dismiss,
    vote,
    goTo,
    next,
    prev,
    canVote,
  } = usePolls(surface);
  const [paused, setPaused] = useState(false);
  const hoverRef = useRef(false);

  useEffect(() => {
    if (count < 2 || reduceMotion || paused) return;
    const id = window.setInterval(() => {
      if (hoverRef.current) return;
      next();
    }, 8000);
    return () => window.clearInterval(id);
  }, [count, reduceMotion, paused, next]);

  if (!poll) return null;

  return (
    <div
      className="promo-banner-carousel"
      onMouseEnter={() => {
        hoverRef.current = true;
        setPaused(true);
      }}
      onMouseLeave={() => {
        hoverRef.current = false;
        setPaused(false);
      }}
    >
      <div className="promo-banner-carousel-stage grid overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={`${poll.id}-${poll.version}`}
            className="col-start-1 row-start-1 w-full min-w-0"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
          >
            <PollView
              poll={poll}
              myOptionId={myOptionId}
              canVote={canVote}
              busy={busy}
              onVote={(optionId) => void vote(optionId)}
              onDismiss={dismiss}
            />
          </motion.div>
        </AnimatePresence>
      </div>
      {count > 1 ? (
        <div className="mt-2 flex items-center justify-center gap-2">
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted"
            aria-label={t("pollPrev")}
            onClick={prev}
          >
            ‹
          </button>
          {polls.map((item, i) => (
            <button
              key={`${item.id}-${item.version}`}
              type="button"
              aria-label={t("pollSlide", { current: i + 1, total: count })}
              className={`h-1.5 rounded-full ${
                i === index ? "w-5 bg-brand" : "w-1.5 bg-ink/20 dark:bg-white/25"
              }`}
              onClick={() => goTo(i)}
            />
          ))}
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted"
            aria-label={t("pollNext")}
            onClick={next}
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function HomePoll() {
  return <SurfacePoll surface="home" />;
}

export function RailPoll() {
  return <SurfacePoll surface="rail" />;
}

export function AcademyPoll() {
  return <SurfacePoll surface="academy" />;
}
