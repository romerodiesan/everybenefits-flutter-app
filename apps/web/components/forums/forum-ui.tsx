"use client";

import type { SVGProps } from "react";
import { motion } from "motion/react";
import { Link } from "@/i18n/navigation";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";

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
  children: React.ReactNode;
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

export function FeedSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="feed-card overflow-hidden p-4"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-center gap-3">
            <div className="feed-shimmer h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="feed-shimmer h-3 w-28 rounded-full" />
              <div className="feed-shimmer h-2.5 w-16 rounded-full" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="feed-shimmer h-4 w-[88%] rounded-full" />
            <div className="feed-shimmer h-3 w-full rounded-full" />
            <div className="feed-shimmer h-3 w-[72%] rounded-full" />
          </div>
        </div>
      ))}
    </div>
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
