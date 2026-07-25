"use client";

import { useTranslations } from "next-intl";
import type { SVGProps } from "react";
import { Markdown } from "@/components/academy/markdown";
import type {
  PulseActivity,
  PulseNotice,
  PulseSource,
  PulseSourceType,
} from "@/lib/ai/types";

export function IconSpark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden {...props}>
      <path
        fill="currentColor"
        d="M12 3.5 13.8 9l5.7 1.2-4.5 3.8 1.4 5.7L12 16.8 7.6 19.7l1.4-5.7-4.5-3.8L10.2 9 12 3.5Z"
      />
    </svg>
  );
}

function IconExternal(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden {...props}>
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 4h6v6M20 4l-8.5 8.5M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"
      />
    </svg>
  );
}

export function IconThumb({
  down = false,
  ...props
}: SVGProps<SVGSVGElement> & { down?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      aria-hidden
      style={down ? { transform: "rotate(180deg)" } : undefined}
      {...props}
    >
      <path
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        d="M7 10.5 11 3.5c1.4 0 2.3 1 2.1 2.4l-.5 3.1h4.7c1.3 0 2.2 1.2 1.9 2.4l-1.5 6A2 2 0 0 1 15.8 19H7m0-8.5V19m0-8.5H5.2c-.7 0-1.2.5-1.2 1.2v6.1c0 .7.5 1.2 1.2 1.2H7"
      />
    </svg>
  );
}

export function useSourceLabels() {
  const t = useTranslations();
  return (type: PulseSourceType) => {
    switch (type) {
      case "accepted_forum_answer":
        return t("aiSourceForum");
      case "course":
        return t("aiSourceCourse");
      case "path":
        return t("aiSourcePath");
      case "lesson":
        return t("aiSourceLesson");
      default:
        return t("aiSourceOfficial");
    }
  };
}

function isExternal(url: string) {
  return /^https?:\/\//i.test(url);
}

const CHIP_CLASS =
  "mx-0.5 inline-flex h-4 min-w-4 translate-y-[-1px] items-center justify-center rounded-[5px] px-1 align-middle text-[10px] font-bold";

/** The number on a chip is the ref itself, so cards never renumber mid-stream. */
export function refNumber(ref: string): string {
  return ref.replace(/^S/, "");
}

/** Inline `[S1]` marker: a compact, clickable jump to the matching card. */
export function CitationChip({
  refId,
  source,
}: {
  refId: string;
  source: PulseSource | null;
}) {
  if (!source) {
    // Sources land when the answer finishes; keep the slot until then.
    return (
      <span className={`${CHIP_CLASS} bg-ink/[0.07] text-muted dark:bg-white/10`}>
        {refNumber(refId)}
      </span>
    );
  }
  const external = isExternal(source.url);
  return (
    <a
      href={source.url}
      title={source.title}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={`${CHIP_CLASS} bg-brand/16 text-brand transition hover:bg-brand/28`}
    >
      {refNumber(source.ref)}
    </a>
  );
}

export function SourceCard({ source }: { source: PulseSource }) {
  const label = useSourceLabels();
  const external = isExternal(source.url);

  return (
    <a
      href={source.url}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="pulse-sheet group flex min-w-0 flex-col gap-1.5 p-3 transition hover:border-brand/40"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-[5px] bg-brand/16 px-1 text-[10px] font-bold text-brand">
          {refNumber(source.ref)}
        </span>
        <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted">
          {source.publisher ?? label(source.type)}
        </span>
        {external && <IconExternal className="ml-auto shrink-0 text-muted" />}
      </div>
      <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
        {source.title}
      </p>
      <p className="line-clamp-2 text-xs leading-relaxed text-muted">
        {source.excerpt}
      </p>
    </a>
  );
}

/** Readable trace of what the agent looked at, in place of raw reasoning. */
export function ActivityTrail({ activities }: { activities: PulseActivity[] }) {
  const t = useTranslations();
  if (!activities.length) return null;

  const labelFor = (activity: PulseActivity) => {
    switch (activity.kind) {
      case "forum":
        return t("aiActivityForum");
      case "academy":
        return t("aiActivityAcademy");
      case "official":
        return t("aiActivityOfficial");
      case "web":
        return t("aiActivityWeb");
      default:
        return t("aiActivityProfile");
    }
  };

  return (
    <ul className="mb-2 space-y-1">
      {activities.map((activity) => (
        <li
          key={activity.id}
          className="flex items-center gap-2 text-xs text-muted"
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              activity.status === "running"
                ? "animate-pulse bg-brand"
                : activity.status === "error"
                  ? "bg-[#B42318]"
                  : activity.status === "empty"
                    ? "bg-ink/25 dark:bg-white/25"
                    : "bg-brand/60"
            }`}
          />
          <span className="truncate">
            {labelFor(activity)}
            {activity.query ? ` · “${activity.query}”` : ""}
          </span>
          {activity.status !== "running" && (
            <span className="ml-auto shrink-0 text-[11px] font-semibold">
              {activity.status === "done"
                ? t("aiActivityResults", { count: activity.resultCount })
                : activity.status === "empty"
                  ? t("aiActivityNone")
                  : t("aiActivityFailed")}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function NoticeBanner({ notice }: { notice: PulseNotice }) {
  const t = useTranslations();
  const copy =
    notice.kind === "refusal"
      ? notice.reason === "legal_advice"
        ? t("aiNoticeLegal")
        : t("aiNoticeScope")
      : notice.kind === "compliance"
        ? t("aiNoticeCompliance")
        : t("aiNoticeNoSources");

  const tone =
    notice.kind === "compliance"
      ? "border-[#FFB84D]/45 bg-[#FFB84D]/10 text-[#8A5200] dark:text-[#FFCF8A]"
      : "border-glass-border bg-ink/[0.03] text-muted dark:bg-white/[0.04]";

  return (
    <p className={`mt-3 rounded-xl border px-3 py-2 text-xs leading-relaxed ${tone}`}>
      {copy}
    </p>
  );
}

/** Assistant prose with `[S1]` markers resolved against the run's sources. */
export function AnswerBody({
  text,
  sources,
}: {
  text: string;
  sources: PulseSource[];
}) {
  return (
    <Markdown
      source={text}
      className="space-y-2.5 text-[15px] leading-relaxed text-ink"
      renderCitation={(ref) => (
        <CitationChip
          refId={ref}
          source={sources.find((source) => source.ref === ref) ?? null}
        />
      )}
    />
  );
}
