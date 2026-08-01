"use client";

import { type ReactNode, type RefObject, type SVGProps } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ForumThread, UserProfile } from "@/lib/types";
import { Avatar } from "@pulse/ui";
import { FeedSkeleton } from "@/components/ui/skeleton";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";
import type { FeedMode } from "@/components/forums/use-forums-feed";

export function formatRelative(
  date: Date | null | undefined,
  justNow: string,
  locale?: string,
) {
  if (!date) return justNow;
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return justNow;
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return justNow;
  }
}

export function IconHeart({
  filled,
  ...props
}: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
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

export function IconComment(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
      <path
        d="M6.5 5h11A2.5 2.5 0 0 1 20 7.5v6A2.5 2.5 0 0 1 17.5 16H10l-4 3v-3H6.5A2.5 2.5 0 0 1 4 13.5v-6A2.5 2.5 0 0 1 6.5 5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconShare(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
      <path
        d="M4 12v6.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V12M12 3.5v11M8 7l4-3.5L16 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBookmark({
  filled,
  ...props
}: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...props}>
      <path
        d="M6.5 4.5h11A1.5 1.5 0 0 1 19 6v14.2l-7-3.6-7 3.6V6A1.5 1.5 0 0 1 6.5 4.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.8}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSpark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" {...props}>
      <path
        d="M12 3.5 13.8 9l5.7 1.2-4.5 3.8 1.4 5.7L12 16.8 7.6 19.7l1.4-5.7-4.5-3.8L10.2 9 12 3.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ActionButton({
  children,
  onClick,
  href,
  active,
  disabled,
  className = "",
  label,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  active?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
}) {
  const base = `group/act relative flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-semibold transition disabled:opacity-40 ${
    active ? "text-brand" : "text-muted hover:bg-brand/[0.06] hover:text-ink"
  } ${className}`;
  if (href) {
    return (
      <Link href={href} className={base} aria-label={label}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={base}
      aria-label={label}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

export function LikeBurst({ active }: { active: boolean }) {
  const reduce = useSafeReducedMotion();
  if (!active || reduce) return null;
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="absolute text-brand"
          initial={{ opacity: 1, scale: 0.4, y: 0, x: 0 }}
          animate={{
            opacity: 0,
            scale: 1.1,
            y: -28 - (i % 3) * 8,
            x: (i - 2) * 14,
          }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <IconHeart filled width={10} height={10} />
        </motion.span>
      ))}
    </span>
  );
}


export function ForumThreadList({
  mode,
  loading,
  loadingMore,
  hasMore,
  visibleThreads,
  spotlight,
  likes,
  burstId,
  copiedId,
  saved,
  profile,
  canPost,
  pulseAiEnabled,
  sentinelRef,
  onCardPointer,
  toggleLike,
  toggleSave,
  copyLink,
  setSharing,
  setTag,
  setMode,
}: {
  mode: FeedMode;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  visibleThreads: ForumThread[];
  spotlight: ForumThread | null;
  likes: Record<string, number>;
  burstId: string | null;
  copiedId: string | null;
  saved: Set<string>;
  profile: UserProfile | null;
  canPost: boolean;
  pulseAiEnabled: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  onCardPointer: (thread: ForumThread, timeStamp: number) => void;
  toggleLike: (thread: ForumThread, withBurst?: boolean) => void | Promise<void>;
  toggleSave: (id: string) => void;
  copyLink: (thread: ForumThread) => void | Promise<void>;
  setSharing: (thread: ForumThread | null) => void;
  setTag: (tag: string) => void;
  setMode: (mode: FeedMode) => void;
}) {
  const t = useTranslations();
  const reduceMotion = useSafeReducedMotion();

  return (
    <>
        {/* Spotlight */}
        {spotlight && mode !== "saved" && !loading && (
          <Link
            href={`/home/${spotlight.id}`}
            className="feed-spotlight group relative block overflow-hidden rounded-2xl p-4 md:p-5"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-brand">
                <IconSpark width={14} height={14} />
                {t("forumsSpotlight")}
              </div>
              <h3 className="mt-2 font-display text-xl font-bold leading-snug tracking-tight md:text-2xl">
                {spotlight.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
                {spotlight.body}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Avatar
                    name={spotlight.authorName}
                    photoUrl={spotlight.authorPhotoUrl}
                    size={22}
                  />
                  {spotlight.authorName}
                </span>
                <span>
                  {t("forumsCommentsCount", { count: spotlight.replyCount })}
                </span>
                <span className="text-brand group-hover:underline">
                  {t("forumsJoinThread")} →
                </span>
              </div>
            </div>
          </Link>
        )}

        {loading && <FeedSkeleton />}

        {!loading && visibleThreads.length === 0 && (
          <div className="feed-card px-5 py-12 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand/12 text-brand">
              <IconSpark width={22} height={22} />
            </div>
            <p className="font-display text-lg font-bold">
              {mode === "saved"
                ? t("forumsSavedEmptyTitle")
                : t("forumsEmptyTitle")}
            </p>
            <p className="mt-1.5 text-sm text-muted">
              {mode === "saved" ? t("forumsSavedEmpty") : t("forumsEmpty")}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {visibleThreads.map((thread, index) => {
            const isHot = thread.score >= 3 || thread.replyCount >= 3;
            const liked = likes[thread.id] === 1;
            const isOwn = profile?.uid === thread.authorId;
            const likeCount = Math.max(0, thread.score);
            const isSaved = saved.has(thread.id);
            const isSpotlightCard = spotlight?.id === thread.id && index === 0;

            if (isSpotlightCard && mode !== "saved") {
              // Already featured above — keep in list but softer.
            }

            return (
              <motion.article
                key={thread.id}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: reduceMotion ? 0 : Math.min(index, 6) * 0.04,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`feed-card group relative overflow-hidden ${
                  isHot ? "feed-card-hot" : ""
                }`}
              >
                <div
                  onClick={(e) => onCardPointer(thread, e.timeStamp)}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    if (likes[thread.id] !== 1) void toggleLike(thread, true);
                  }}
                  className="px-4 pb-2 pt-4 md:px-5"
                >
                  <div className="flex items-start gap-3">
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
                        size={44}
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSave(thread.id);
                          }}
                          className={`ml-auto rounded-lg p-1.5 transition ${
                            isSaved
                              ? "text-brand"
                              : "text-muted opacity-100 hover:bg-brand/8 hover:text-ink lg:opacity-0 lg:group-hover:opacity-100"
                          }`}
                          aria-label={t("forumsSave")}
                        >
                          <IconBookmark filled={isSaved} />
                        </button>
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
                        {thread.closed && (
                          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                            {t("threadClosedBadge")}
                          </span>
                        )}
                        {thread.tags.slice(0, 3).map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTag(item);
                              setMode("fresh");
                            }}
                            className="rounded-md px-1 py-0.5 text-[11px] font-medium text-muted transition hover:bg-brand/10 hover:text-brand"
                          >
                            #{item}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/home/${thread.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 block"
                  >
                    <h3 className="font-display text-[17px] font-bold leading-snug tracking-tight transition group-hover:text-brand md:text-[18px]">
                      {thread.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-3 text-[14px] leading-relaxed text-muted">
                      {thread.body}
                    </p>
                  </Link>

                  {(likeCount > 0 || thread.replyCount > 0) && (
                    <div className="mt-3 flex items-center gap-3 text-[11px] font-semibold text-muted">
                      {likeCount > 0 && (
                        <span>{t("forumsLikesCount", { count: likeCount })}</span>
                      )}
                      {thread.replyCount > 0 && (
                        <Link
                          href={`/home/${thread.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-ink"
                        >
                          {t("forumsCommentsCount", {
                            count: thread.replyCount,
                          })}
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                <div className="mx-3 mb-2 flex items-center gap-0.5 border-t border-glass-border/80 pt-1 md:mx-4">
                  <ActionButton
                    onClick={() => toggleLike(thread, !liked)}
                    active={liked}
                    disabled={!canPost || isOwn}
                    label={t("forumsLike")}
                    className="relative"
                  >
                    <motion.span
                      key={liked ? "on" : "off"}
                      initial={reduceMotion ? false : { scale: 0.7 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 18 }}
                      className="inline-flex"
                    >
                      <IconHeart filled={liked} />
                    </motion.span>
                    {likeCount > 0 ? likeCount : t("forumsLike")}
                    <LikeBurst active={burstId === thread.id} />
                  </ActionButton>
                  <ActionButton
                    href={`/home/${thread.id}`}
                    label={t("forumsComment")}
                  >
                    <IconComment />
                    {thread.replyCount > 0
                      ? thread.replyCount
                      : t("forumsComment")}
                  </ActionButton>
                  <ActionButton
                    onClick={() => setSharing(thread)}
                    disabled={!canPost}
                    label={t("forumsShare")}
                  >
                    <IconShare />
                    {t("forumsShare")}
                  </ActionButton>
                  <ActionButton
                    onClick={() => copyLink(thread)}
                    label={t("forumsCopyLink")}
                    className="max-sm:hidden"
                  >
                    {copiedId === thread.id
                      ? t("forumsCopied")
                      : t("forumsCopyLink")}
                  </ActionButton>
                </div>

                <div className="flex items-center justify-between border-t border-dashed border-glass-border/70 px-4 py-2 md:px-5">
                  {pulseAiEnabled ? (
                    <Link
                      href="/ai"
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted transition hover:text-brand"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconSpark width={12} height={12} />
                      {t("forumsAskAi")}
                    </Link>
                  ) : (
                    <span />
                  )}
                  <Link
                    href={`/home/${thread.id}`}
                    className="text-[11px] font-bold text-brand opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100"
                  >
                    {t("forumsOpenThread")}
                  </Link>
                </div>
              </motion.article>
            );
          })}
        </div>

        {hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-4">
            {loadingMore && (
              <div className="w-full max-w-xl px-2" aria-busy="true">
                <div className="feed-card space-y-2 p-4">
                  <div className="feed-shimmer h-3 w-1/3 rounded-full" />
                  <div className="feed-shimmer h-3 w-full rounded-full" />
                  <div className="feed-shimmer h-3 w-2/3 rounded-full" />
                </div>
              </div>
            )}
          </div>
        )}

    </>
  );
}
