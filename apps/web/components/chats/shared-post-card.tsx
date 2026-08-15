"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { SharedPostPreview } from "@/lib/types";

export function SharedPostCard({
  preview,
  compact = false,
}: {
  preview: SharedPostPreview;
  compact?: boolean;
}) {
  const t = useTranslations();
  const eyebrow = preview.authorName
    ? t("sharedPostLabelAuthor", { name: preview.authorName })
    : t("sharedPostLabel");

  return (
    <Link
      href={`/home/${preview.threadId}`}
      className="block max-w-full overflow-hidden rounded-[20px] border border-glass-border bg-sheet shadow-[0_10px_28px_color-mix(in_srgb,var(--ink)_8%,transparent)] transition hover:border-brand/30"
    >
      <span className="block h-1 w-full bg-gradient-to-r from-brand to-brand/20" />
      <span className={`block ${compact ? "px-3 py-2.5" : "px-4 py-3.5"}`}>
        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand">
          {eyebrow}
        </span>
        <span className="mt-1.5 block font-display text-[15px] font-bold leading-snug tracking-tight">
          {preview.title}
        </span>
        {preview.excerpt ? (
          <span
            className={`mt-1.5 block text-sm leading-relaxed text-muted ${
              compact ? "line-clamp-1" : "line-clamp-2"
            }`}
          >
            {preview.excerpt}
          </span>
        ) : null}
        {preview.tags.length > 0 ? (
          <span className="mt-2.5 flex flex-wrap gap-1.5">
            {preview.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand"
              >
                #{tag}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
