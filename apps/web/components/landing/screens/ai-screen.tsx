"use client";

import type { SVGProps } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@pulse/ui";
import {
  AnswerBody,
  IconSpark,
  IconThumb,
  SourceCard,
} from "@/components/ai/pulse-parts";
import {
  LANDING_AI_REPLY,
  LANDING_AI_SOURCES,
  LANDING_AI_USER,
} from "@/lib/landing/fixtures";

function IconSend(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden {...props}>
      <path
        fill="currentColor"
        d="M4.4 19.6 20.5 12 4.4 4.4 4.4 10.2 15 12 4.4 13.8Z"
      />
    </svg>
  );
}

function IconPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden {...props}>
      <path
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        d="M12 5.5v13M5.5 12h13"
      />
    </svg>
  );
}

export function AiScreen() {
  const t = useTranslations();

  return (
    <div className="flex h-full flex-col overflow-hidden px-3 pt-2">
      <header className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/14 text-brand">
            <IconSpark width={14} height={14} />
          </span>
          <p className="font-display text-sm font-bold">{t("navAi")}</p>
        </div>
        <span className="pulse-sheet flex h-8 items-center gap-1 rounded-xl px-2.5 text-[10px] font-semibold text-muted">
          <IconPlus />
          {t("aiNewChat")}
        </span>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-hidden pb-2">
        <div className="flex justify-end">
          <div className="bubble-mine max-w-[88%] px-3 py-2">
            <p className="text-[12px] leading-snug">{LANDING_AI_USER}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand/14 text-brand">
            <IconSpark width={12} height={12} />
          </span>
          <div className="min-w-0 flex-1">
            <AnswerBody text={LANDING_AI_REPLY} sources={LANDING_AI_SOURCES} />
            <section className="mt-2.5">
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                {t("aiSources")}
              </h3>
              <div className="grid gap-1.5">
                {LANDING_AI_SOURCES.map((source) => (
                  <SourceCard key={source.ref} source={source} />
                ))}
              </div>
            </section>
            <div className="mt-2 flex items-center gap-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand/14 text-brand">
                <IconThumb width={12} height={12} />
              </span>
              <span className="flex h-6 w-6 items-center justify-center rounded-lg text-muted">
                <IconThumb down width={12} height={12} />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="pb-1">
        <div className="pulse-sheet flex items-end gap-1.5 p-1.5">
          <span className="min-h-8 flex-1 px-2 py-1.5 text-[11px] text-muted">
            {t("aiPlaceholder")}
          </span>
          <Button
            type="button"
            className="h-8 w-8 !px-0"
            aria-label={t("chatsSend")}
          >
            <IconSend />
          </Button>
        </div>
        <p className="mt-1.5 line-clamp-1 text-[9px] leading-relaxed text-muted">
          {t("aiDisclaimer")}
        </p>
      </div>
    </div>
  );
}
