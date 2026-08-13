"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import {
  bannerShouldShowImage,
  localizeBannerText,
  resolveBannerFormat,
  type PromoBanner,
  type PromoBannerFormat,
  type PromoBannerSurface,
} from "@pulse/shared";
import { Link } from "@/i18n/navigation";
import { useBannerImageUrl } from "@/lib/hooks/use-banner-image-url";
import { usePromoBanners } from "@/lib/hooks/use-promo-banner";
import { useSafeReducedMotion } from "@/lib/use-safe-reduced-motion";

function isExternalHref(href: string) {
  return /^https:\/\//i.test(href);
}

function Cta({
  href,
  label,
  format,
}: {
  href: string;
  label: string;
  format: PromoBannerFormat;
}) {
  const className =
    format === "card"
      ? "inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand transition hover:brightness-110"
      : "text-sm font-semibold text-brand hover:underline";

  if (isExternalHref(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {label}
        {format !== "card" ? " →" : null}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
      {format !== "card" ? " →" : null}
    </Link>
  );
}

function shellClass(format: PromoBannerFormat) {
  if (format === "card") {
    return "promo-banner-card group relative overflow-hidden rounded-2xl";
  }
  if (format === "tile") {
    return "feed-rail-card relative overflow-hidden";
  }
  if (format === "text") {
    return "pulse-sheet relative overflow-hidden";
  }
  return "promo-banner-strip pulse-sheet relative mt-6 overflow-hidden";
}

/** Full photo visible + soft cover bleed so the frame never looks empty. */
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
    <div className={`promo-banner-media ${aspectClass} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden
        className="promo-banner-media-fill"
        decoding="async"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="promo-banner-media-fit"
        decoding="async"
      />
    </div>
  );
}

/**
 * Shared promo surface.
 * Formats: card (home), tile (rail), strip (academy), text (any).
 */
export function PromoBannerView({
  banner,
  onDismiss,
  format: formatProp,
  /** When false, skip mount/exit motion (carousel owns the transition). */
  animated = true,
}: {
  banner: PromoBanner | null;
  onDismiss: () => void;
  format?: PromoBannerFormat;
  animated?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const reduceMotion = useSafeReducedMotion();
  const imageSrc = useBannerImageUrl(banner);
  const format =
    formatProp ?? (banner ? resolveBannerFormat(banner) : "card");
  const showCta = Boolean(banner?.showCta && banner.href?.trim());
  const showDismiss = banner?.dismissible !== false;

  if (!banner) return null;

  const padRight = showDismiss ? "pr-12" : "";
  const body = (
    <>
      {showDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t("promoBannerDismiss")}
          className="absolute right-2 top-2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-ink/5 hover:text-ink dark:hover:bg-white/10"
        >
          <span aria-hidden className="text-lg leading-none">
            ×
          </span>
        </button>
      ) : null}

      {format === "card" ? (
        <div className="grid items-stretch gap-0 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div
            className={`relative flex flex-col gap-3 p-4 md:p-5 ${padRight}`}
          >
            {!imageSrc ? (
              <span
                aria-hidden
                className="absolute inset-y-3 left-0 w-1 rounded-full bg-brand"
              />
            ) : null}
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">
              {localizeBannerText(banner.eyebrow, locale)}
            </p>
            <h3 className="font-display text-xl font-bold leading-snug tracking-tight md:text-2xl">
              {localizeBannerText(banner.title, locale)}
            </h3>
            <p className="line-clamp-2 text-sm leading-relaxed text-muted">
              {localizeBannerText(banner.body, locale)}
            </p>
            {showCta ? (
              <div className="mt-1">
                <Cta
                  href={banner.href}
                  label={localizeBannerText(banner.ctaLabel, locale)}
                  format="card"
                />
              </div>
            ) : null}
          </div>
          {imageSrc ? (
            <BannerMedia
              src={imageSrc}
              aspect="video"
              className="min-h-[11.25rem] md:min-h-full md:aspect-auto"
            />
          ) : null}
        </div>
      ) : null}

      {format === "tile" ? (
        <div className={`space-y-2.5 p-3 ${showDismiss ? "pr-10" : ""}`}>
          {imageSrc ? (
            <BannerMedia
              src={imageSrc}
              aspect="4/3"
              className="rounded-xl"
            />
          ) : null}
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">
            {localizeBannerText(banner.eyebrow, locale)}
          </p>
          <h3 className="font-display text-sm font-bold leading-snug tracking-tight">
            {localizeBannerText(banner.title, locale)}
          </h3>
          <p className="line-clamp-2 text-xs leading-relaxed text-muted">
            {localizeBannerText(banner.body, locale)}
          </p>
          {showCta ? (
            <Cta
              href={banner.href}
              label={localizeBannerText(banner.ctaLabel, locale)}
              format="tile"
            />
          ) : null}
        </div>
      ) : null}

      {format === "strip" ? (
        <div
          className={`flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4 ${padRight}`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {imageSrc ? (
              <BannerMedia
                src={imageSrc}
                aspect="video"
                className="w-24 shrink-0 rounded-lg sm:w-32"
              />
            ) : (
              <span
                aria-hidden
                className="hidden h-14 w-1 shrink-0 rounded-full bg-brand sm:block"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">
                {localizeBannerText(banner.eyebrow, locale)}
              </p>
              <h3 className="mt-0.5 font-display text-base font-bold leading-snug tracking-tight sm:text-lg">
                {localizeBannerText(banner.title, locale)}
              </h3>
              <p className="mt-0.5 line-clamp-2 text-sm text-muted">
                {localizeBannerText(banner.body, locale)}
              </p>
            </div>
          </div>
          {showCta ? (
            <div className="shrink-0">
              <Cta
                href={banner.href}
                label={localizeBannerText(banner.ctaLabel, locale)}
                format="strip"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {format === "text" ? (
        <div className={`relative flex flex-col gap-2 p-4 ${padRight}`}>
          <span
            aria-hidden
            className="absolute inset-y-3 left-0 w-1 rounded-full bg-brand"
          />
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">
            {localizeBannerText(banner.eyebrow, locale)}
          </p>
          <h3 className="font-display text-lg font-bold leading-snug tracking-tight">
            {localizeBannerText(banner.title, locale)}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted">
            {localizeBannerText(banner.body, locale)}
          </p>
          {showCta ? (
            <div className="mt-1">
              <Cta
                href={banner.href}
                label={localizeBannerText(banner.ctaLabel, locale)}
                format="text"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (!animated || reduceMotion) {
    return (
      <aside
        role="region"
        aria-label={t("promoBannerRegion")}
        className={shellClass(format)}
      >
        {body}
      </aside>
    );
  }

  return (
    <motion.aside
      role="region"
      aria-label={t("promoBannerRegion")}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={shellClass(format)}
    >
      {body}
    </motion.aside>
  );
}

function SurfacePromoBanner({ surface }: { surface: PromoBannerSurface }) {
  const t = useTranslations();
  const reduceMotion = useSafeReducedMotion();
  const { banner, banners, index, count, dismiss, goTo, next, prev } =
    usePromoBanners(surface);
  const [paused, setPaused] = useState(false);
  const hoverRef = useRef(false);

  useEffect(() => {
    if (count < 2 || reduceMotion || paused) return;
    const id = window.setInterval(() => {
      if (hoverRef.current) return;
      next();
    }, 6500);
    return () => window.clearInterval(id);
  }, [count, reduceMotion, paused, next]);

  if (!banner) return null;

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
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      {/*
        Grid stack: entering + exiting slides share one cell so height never
        doubles or collapses (no blank gap / layout jump).
      */}
      <div className="promo-banner-carousel-stage grid overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={`${banner.id}-${banner.version}`}
            className="col-start-1 row-start-1 w-full min-w-0"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
          >
            <PromoBannerView
              banner={banner}
              onDismiss={dismiss}
              animated={false}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {count > 1 ? (
        <div className="promo-banner-carousel-controls mt-2 flex items-center justify-center gap-2">
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-ink/5 hover:text-ink dark:hover:bg-white/10"
            aria-label={t("promoBannerPrev")}
            onClick={prev}
          >
            ‹
          </button>
          <div
            className="flex items-center gap-1.5"
            role="tablist"
            aria-label={t("promoBannerCarousel")}
          >
            {banners.map((item, i) => (
              <button
                key={`${item.id}-${item.version}`}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={t("promoBannerSlide", {
                  current: i + 1,
                  total: count,
                })}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-5 bg-brand"
                    : "w-1.5 bg-ink/20 hover:bg-ink/35 dark:bg-white/25"
                }`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-ink/5 hover:text-ink dark:hover:bg-white/10"
            aria-label={t("promoBannerNext")}
            onClick={next}
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Home feed promo — format from banner doc (card | text). */
export function HomePromoBanner() {
  return <SurfacePromoBanner surface="home" />;
}

/** Feed side-rail promo — format from banner doc (tile | text). */
export function RailPromoBanner() {
  return <SurfacePromoBanner surface="rail" />;
}

/** Academy catalog promo — format from banner doc (strip | text). */
export function AcademyPromoBanner() {
  return <SurfacePromoBanner surface="academy" />;
}

export type { PromoBannerFormat };
export { bannerShouldShowImage };
