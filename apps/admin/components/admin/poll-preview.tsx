"use client";

import type { ReactNode } from "react";
import {
  localizePollText,
  pollOptionShare,
  type Poll,
  type PollLocalizedString,
  type PollOption,
  type PollSurface,
} from "@pulse/shared";

type Locale = "en" | "es";

function PollCardShell({
  surface,
  children,
}: {
  surface: PollSurface;
  children: ReactNode;
}) {
  const width = surface === "rail" ? "max-w-[320px]" : "max-w-[640px]";
  return (
    <div className={`mx-auto w-full ${width}`}>
      <div className="overflow-hidden rounded-2xl border border-glass-border bg-sheet">
        {children}
      </div>
    </div>
  );
}

export function PollComposeCard({
  locale,
  surface,
  question,
  options,
  onQuestionChange,
  onOptionChange,
  questionPlaceholder,
  optionPlaceholder,
}: {
  locale: Locale;
  surface: PollSurface;
  question: PollLocalizedString;
  options: PollOption[];
  onQuestionChange: (value: string) => void;
  onOptionChange: (index: number, value: string) => void;
  questionPlaceholder: string;
  optionPlaceholder: (index: number) => string;
}) {
  return (
    <PollCardShell surface={surface}>
      <div className="border-b border-glass-border px-5 py-5">
        <textarea
          value={question[locale]}
          onChange={(event) => onQuestionChange(event.target.value)}
          placeholder={questionPlaceholder}
          rows={3}
          className="w-full resize-none bg-transparent font-display text-xl font-semibold leading-snug tracking-tight text-ink outline-none placeholder:text-muted/55"
        />
      </div>
      <div className="space-y-2 p-4">
        {options.map((option, index) => (
          <div
            key={option.id}
            className="flex items-center gap-3 rounded-xl border border-glass-border bg-panel px-3 py-2.5"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-glass-border text-[10px] font-semibold text-muted">
              {String.fromCharCode(65 + index)}
            </span>
            <input
              value={option.label[locale]}
              onChange={(event) => onOptionChange(index, event.target.value)}
              placeholder={optionPlaceholder(index)}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-muted/55"
            />
          </div>
        ))}
      </div>
    </PollCardShell>
  );
}

export function PollLearnerPreview({
  locale,
  surface,
  question,
  options,
  poll,
  emptyHint,
}: {
  locale: Locale;
  surface: PollSurface;
  question: PollLocalizedString;
  options: PollOption[];
  poll: Pick<Poll, "counts" | "voteCount">;
  emptyHint: string;
}) {
  const title = localizePollText(question, locale) || emptyHint;
  const showResults = poll.voteCount > 0;
  return (
    <PollCardShell surface={surface}>
      <div className="px-5 py-5">
        <p className="font-display text-base font-semibold leading-snug text-ink">
          {title}
        </p>
        <p className="mt-1 text-[11px] font-medium text-muted">
          {poll.voteCount.toLocaleString()} · {surface}
        </p>
        <div className="mt-3 grid gap-2">
          {options.map((option) => {
            const share = pollOptionShare(poll, option.id);
            const percent = Math.round(share * 100);
            const label =
              localizePollText(option.label, locale) || option.id;
            return (
              <div
                key={option.id}
                className="relative overflow-hidden rounded-xl border border-glass-border px-3 py-2 text-sm"
              >
                {showResults ? (
                  <div
                    className="absolute inset-y-0 left-0 bg-brand/10"
                    style={{ width: `${percent}%` }}
                  />
                ) : null}
                <div className="relative flex items-center justify-between gap-3">
                  <span className="font-medium">{label}</span>
                  {showResults ? (
                    <span className="tabular-nums text-xs text-muted">
                      {percent}%
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PollCardShell>
  );
}

export function PollResultsPanel({
  locale,
  options,
  poll,
  emptyLabel,
  updatedLabel,
}: {
  locale: Locale;
  options: PollOption[];
  poll: Pick<Poll, "counts" | "voteCount" | "updatedAt">;
  emptyLabel: string;
  updatedLabel: string;
}) {
  if (poll.voteCount <= 0) {
    return (
      <div className="flex min-h-[240px] items-center justify-center px-6 text-center text-sm text-muted">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        <span className="font-semibold tabular-nums text-ink">
          {poll.voteCount.toLocaleString()}
        </span>{" "}
        · {updatedLabel}
        {poll.updatedAt
          ? ` ${new Date(poll.updatedAt).toLocaleString()}`
          : ""}
      </p>
      <div className="space-y-3">
        {options.map((option) => {
          const count = Math.max(0, Number(poll.counts[option.id] ?? 0));
          const percent = Math.round(pollOptionShare(poll, option.id) * 100);
          return (
            <div key={option.id}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-ink">
                  {localizePollText(option.label, locale) || option.id}
                </span>
                <span className="tabular-nums text-muted">
                  {count.toLocaleString()} · {percent}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-rail">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PollPreviewSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-glass-border bg-sheet p-5">
      <div className="h-3 w-24 rounded-full bg-rail" />
      <div className="mt-6 h-16 rounded-2xl bg-rail" />
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-12 rounded-2xl bg-rail" />
        ))}
      </div>
    </div>
  );
}
