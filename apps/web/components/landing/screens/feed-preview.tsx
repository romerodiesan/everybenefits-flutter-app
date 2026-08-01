"use client";

import type { SVGProps } from "react";
import { useTranslations } from "next-intl";
import { Avatar } from "@pulse/ui";
import type { ForumThread } from "@/lib/types";

function IconHeart({
  filled,
  ...props
}: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" {...props}>
      <path
        d="M12 20.3 4.7 13a4.6 4.6 0 0 1 6.5-6.5l.8.8.8-.8A4.6 4.6 0 1 1 19.3 13L12 20.3Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.8}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconComment(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" {...props}>
      <path
        d="M6.5 5h11A2.5 2.5 0 0 1 20 7.5v6A2.5 2.5 0 0 1 17.5 16H10l-4 3v-3H6.5A2.5 2.5 0 0 1 4 13.5v-6A2.5 2.5 0 0 1 6.5 5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconShare(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" {...props}>
      <path
        d="M14 6.5 20 12l-6 5.5V14H9.5A3.5 3.5 0 0 0 6 17.5V19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatRelative(date: Date | null | undefined, justNow: string) {
  if (!date) return justNow;
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (mins < 1) return justNow;
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function ActionChip({
  children,
  active = false,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg text-[11px] font-semibold ${
        active ? "text-brand" : "text-muted"
      }`}
    >
      {children}
    </span>
  );
}

export function FeedThreadCardPreview({
  thread,
  liked = false,
  compact = false,
}: {
  thread: ForumThread;
  liked?: boolean;
  compact?: boolean;
}) {
  const t = useTranslations();
  const isHot = thread.score >= 3 || thread.replyCount >= 3;
  const likeCount = Math.max(0, thread.score);

  return (
    <article
      className={`feed-card group relative overflow-hidden ${
        isHot ? "feed-card-hot" : ""
      }`}
    >
      <div className={compact ? "px-3 pb-1.5 pt-3" : "px-4 pb-2 pt-4"}>
        <div className="flex items-start gap-2.5">
          <div
            className={`relative ${
              isHot
                ? "rounded-full ring-2 ring-brand/35 ring-offset-2 ring-offset-[var(--mesh-deep)]"
                : ""
            }`}
          >
            <Avatar
              name={thread.authorName}
              photoUrl={thread.authorPhotoUrl}
              size={compact ? 36 : 44}
            />
            {isHot && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] text-on-brand">
                ★
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-bold">
                {thread.authorName}
              </span>
              <span className="text-muted/50">·</span>
              <span className="shrink-0 text-xs tabular-nums text-muted">
                {formatRelative(thread.createdAt, t("forumsJustNow"))}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {isHot && (
                <span className="rounded-md bg-brand/12 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                  {t("forumsHot")}
                </span>
              )}
              {thread.acceptedReplyId && (
                <span className="rounded-md bg-brand/12 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                  {t("threadAccepted")}
                </span>
              )}
              {thread.tags.slice(0, 3).map((item) => (
                <span
                  key={item}
                  className="rounded-md px-1 py-0.5 text-[11px] font-medium text-muted"
                >
                  #{item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-2.5">
          <h3
            className={`font-display font-bold leading-snug tracking-tight ${
              compact ? "text-[14px]" : "text-[17px]"
            }`}
          >
            {thread.title}
          </h3>
          <p
            className={`mt-1 leading-relaxed text-muted ${
              compact ? "line-clamp-2 text-[12px]" : "line-clamp-3 text-[14px]"
            }`}
          >
            {thread.body}
          </p>
        </div>

        {(likeCount > 0 || thread.replyCount > 0) && (
          <div className="mt-2.5 flex items-center gap-3 text-[11px] font-semibold text-muted">
            {likeCount > 0 && (
              <span>{t("forumsLikesCount", { count: likeCount })}</span>
            )}
            {thread.replyCount > 0 && (
              <span>
                {t("forumsCommentsCount", { count: thread.replyCount })}
              </span>
            )}
          </div>
        )}
      </div>

      <div
        className={`mb-1.5 flex items-center gap-0.5 border-t border-glass-border/80 pt-1 ${
          compact ? "mx-2" : "mx-3 md:mx-4"
        }`}
      >
        <ActionChip active={liked}>
          <IconHeart filled={liked} />
          {likeCount > 0 ? likeCount : t("forumsLike")}
        </ActionChip>
        <ActionChip>
          <IconComment />
          {thread.replyCount > 0 ? thread.replyCount : t("forumsComment")}
        </ActionChip>
        <ActionChip>
          <IconShare />
          {t("forumsShare")}
        </ActionChip>
      </div>
    </article>
  );
}

export function ForumsFeedChrome({
  threads,
  compact = false,
  showComposer = true,
  topicCounts,
  activeTag = "",
}: {
  threads: ForumThread[];
  compact?: boolean;
  showComposer?: boolean;
  topicCounts: { tag: string; count: number }[];
  activeTag?: string;
}) {
  const t = useTranslations();

  return (
    <div
      className={`flex h-full flex-col overflow-hidden ${
        compact ? "px-2.5 pt-2" : "px-4 pt-3"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p
            className={`truncate font-display font-extrabold tracking-tight text-ink ${
              compact ? "text-base" : "text-xl"
            }`}
          >
            {t("forumsHelloAfternoon", { name: "Alex" })}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-brand px-2.5 py-1 text-[10px] font-semibold text-on-brand">
          {t("forumsAsk")}
        </span>
      </div>

      <div className="feed-segment mb-2.5 self-start">
        {(
          [
            ["fresh", "forumsModeFresh"],
            ["pulse", "forumsModePulse"],
            ["saved", "forumsModeSaved"],
          ] as const
        ).map(([id, key], i) => (
          <span
            key={id}
            className={`relative rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              i === 0 ? "text-ink" : "text-muted"
            }`}
          >
            {i === 0 && (
              <span className="absolute inset-0 rounded-full bg-brand/14" />
            )}
            <span className="relative z-10">{t(key)}</span>
          </span>
        ))}
      </div>

      <div className="mb-2.5 flex gap-1.5 overflow-hidden">
        <span
          className={`feed-topic shrink-0 !h-7 !px-2.5 !text-[10px] ${
            !activeTag ? "feed-topic-active" : ""
          }`}
        >
          {t("forumsAllTags")}
        </span>
        {topicCounts.slice(0, compact ? 3 : 5).map(({ tag, count }) => (
          <span
            key={tag}
            className={`feed-topic shrink-0 !h-7 !px-2.5 !text-[10px] ${
              activeTag === tag ? "feed-topic-active" : ""
            }`}
          >
            <span>#{tag}</span>
            <span className="ml-1 rounded-full bg-ink/8 px-1 py-px text-[9px] font-bold tabular-nums dark:bg-white/10">
              {count}
            </span>
          </span>
        ))}
      </div>

      {showComposer && (
        <div className="feed-card mb-2.5 flex items-center gap-2.5 p-2.5">
          <Avatar name="Alex" size={compact ? 32 : 36} />
          <span className="flex h-9 flex-1 items-center rounded-2xl border border-dashed border-glass-border bg-mesh/60 px-3 text-[11px] text-muted">
            {t("forumsComposerPrompt")}
          </span>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-2.5 overflow-hidden">
        {threads.map((thread, i) => (
          <FeedThreadCardPreview
            key={thread.id}
            thread={thread}
            liked={i === 1}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}
