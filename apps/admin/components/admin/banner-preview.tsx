"use client";

import type { ReactNode } from "react";
import {
  localizeBannerText,
  resolveBannerFormat,
  type PromoBanner,
  type PromoBannerFormat,
  type PromoBannerLocale,
} from "@pulse/shared";

function shellClass(format: PromoBannerFormat) {
  if (format === "card") {
    return "overflow-hidden rounded-2xl border border-brand/25 bg-gradient-to-br from-brand/[0.1] to-panel";
  }
  if (format === "tile") {
    return "overflow-hidden rounded-xl border border-glass-border bg-panel";
  }
  return "relative overflow-hidden rounded-xl border border-glass-border bg-panel";
}

/** Full photo visible + soft cover bleed (mirrors Pulse). */
function BannerMedia({
  src,
  aspect,
  className = "",
}: {
  src: string;
  aspect: "video" | "4/3";
  className?: string;
}) {
  const aspectClass = aspect === "video" ? "aspect-video" : "aspect-[4/3]";
  return (
    <div
      className={`relative isolate overflow-hidden bg-brand/10 ${aspectClass} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden
        decoding="async"
        className="absolute inset-0 size-full scale-[1.14] object-cover object-center opacity-90 blur-xl"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        decoding="async"
        className="absolute inset-0 z-[1] size-full object-contain object-center"
      />
    </div>
  );
}

/**
 * Live Admin preview — mirrors Pulse promo layouts without importing apps/web.
 */
export function BannerPreview({
  banner,
  locale,
  imagePreviewUrl,
}: {
  banner: PromoBanner;
  locale: PromoBannerLocale;
  /** Local object URL while a file is staged before upload. */
  imagePreviewUrl?: string | null;
}) {
  const format = resolveBannerFormat(banner);
  const showCta = Boolean(banner.showCta && banner.href?.trim());
  const showDismiss = banner.dismissible !== false;
  const showImage =
    format !== "text" &&
    banner.showImage &&
    Boolean(imagePreviewUrl || banner.imageUrl);
  const imageSrc = imagePreviewUrl || banner.imageUrl || null;
  const title =
    localizeBannerText(banner.title, locale) || "Add a title to preview";
  const body = localizeBannerText(banner.body, locale);
  const eyebrow = localizeBannerText(banner.eyebrow, locale);
  const cta = localizeBannerText(banner.ctaLabel, locale) || "Learn more";
  const padRight = showDismiss ? "pr-12" : "";

  return (
    <div className={shellClass(format)}>
      {showDismiss ? (
        <div className="pointer-events-none absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-muted">
          ×
        </div>
      ) : null}

      {format === "card" ? (
        <div className="relative grid items-stretch gap-0 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className={`relative flex flex-col gap-3 p-4 md:p-5 ${padRight}`}>
            {!showImage ? (
              <span className="absolute inset-y-3 left-0 w-1 rounded-full bg-brand" />
            ) : null}
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">
              {eyebrow || "Eyebrow"}
            </p>
            <h3 className="font-display text-xl font-bold leading-snug tracking-tight text-ink md:text-2xl">
              {title}
            </h3>
            {body ? (
              <p className="line-clamp-2 text-sm leading-relaxed text-muted">
                {body}
              </p>
            ) : null}
            {showCta ? (
              <span className="mt-1 inline-flex h-10 w-fit items-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand">
                {cta}
              </span>
            ) : null}
          </div>
          {showImage && imageSrc ? (
            <BannerMedia
              src={imageSrc}
              aspect="video"
              className="min-h-[11.25rem] md:min-h-full md:aspect-auto"
            />
          ) : null}
        </div>
      ) : null}

      {format === "tile" ? (
        <div className={`relative space-y-2.5 p-3 ${showDismiss ? "pr-10" : ""}`}>
          {showImage && imageSrc ? (
            <BannerMedia src={imageSrc} aspect="4/3" className="rounded-xl" />
          ) : null}
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">
            {eyebrow || "Eyebrow"}
          </p>
          <h3 className="font-display text-sm font-bold leading-snug tracking-tight text-ink">
            {title}
          </h3>
          {body ? (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted">
              {body}
            </p>
          ) : null}
          {showCta ? (
            <span className="text-sm font-semibold text-brand">{cta} →</span>
          ) : null}
        </div>
      ) : null}

      {format === "strip" ? (
        <div
          className={`relative flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4 ${padRight}`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {showImage && imageSrc ? (
              <BannerMedia
                src={imageSrc}
                aspect="video"
                className="w-24 shrink-0 rounded-lg sm:w-32"
              />
            ) : (
              <span className="hidden h-14 w-1 shrink-0 rounded-full bg-brand sm:block" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">
                {eyebrow || "Eyebrow"}
              </p>
              <h3 className="mt-0.5 font-display text-base font-bold leading-snug tracking-tight text-ink sm:text-lg">
                {title}
              </h3>
              {body ? (
                <p className="mt-0.5 line-clamp-2 text-sm text-muted">{body}</p>
              ) : null}
            </div>
          </div>
          {showCta ? (
            <span className="shrink-0 text-sm font-semibold text-brand">
              {cta} →
            </span>
          ) : null}
        </div>
      ) : null}

      {format === "text" ? (
        <div className={`relative flex flex-col gap-2 p-4 ${padRight}`}>
          <span className="absolute inset-y-3 left-0 w-1 rounded-full bg-brand" />
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">
            {eyebrow || "Eyebrow"}
          </p>
          <h3 className="font-display text-lg font-bold leading-snug tracking-tight text-ink">
            {title}
          </h3>
          {body ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted">
              {body}
            </p>
          ) : null}
          {showCta ? (
            <span className="mt-1 text-sm font-semibold text-brand">
              {cta} →
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function PreviewDeviceFrame({
  surface,
  children,
}: {
  surface: PromoBanner["surface"];
  children: ReactNode;
}) {
  const width =
    surface === "rail"
      ? "max-w-[280px]"
      : surface === "home"
        ? "max-w-[680px]"
        : "max-w-3xl";
  const label =
    surface === "home"
      ? "Home feed"
      : surface === "rail"
        ? "Side rail"
        : "Academy";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          Live preview · {label}
        </p>
      </div>
      <div
        className={`mx-auto w-full ${width} rounded-2xl border border-dashed border-glass-border bg-mesh-base/80 p-4 dark:bg-ink/40`}
      >
        {children}
      </div>
    </div>
  );
}
