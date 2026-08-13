/** Surfaces where a promo banner may render in Pulse web. */
export const PROMO_BANNER_SURFACES = ["home", "rail", "academy"] as const;
export type PromoBannerSurface = (typeof PROMO_BANNER_SURFACES)[number];

/** Intent / campaign category (Admin metadata + light UI cues). */
export const PROMO_BANNER_TYPES = [
  "promo",
  "product_update",
  "education",
] as const;
export type PromoBannerType = (typeof PROMO_BANNER_TYPES)[number];

/**
 * Visual layouts. Decoupled from surface — see FORMATS_BY_SURFACE.
 * Legacy alias: PromoBannerVariant === PromoBannerFormat without `text`.
 */
export const PROMO_BANNER_FORMATS = ["card", "tile", "strip", "text"] as const;
export type PromoBannerFormat = (typeof PROMO_BANNER_FORMATS)[number];

/** @deprecated Prefer PromoBannerFormat; kept for existing call sites. */
export const PROMO_BANNER_VARIANTS = ["card", "tile", "strip"] as const;
export type PromoBannerVariant = (typeof PROMO_BANNER_VARIANTS)[number];

/** Allowed formats per placement. */
export const FORMATS_BY_SURFACE: Record<
  PromoBannerSurface,
  readonly PromoBannerFormat[]
> = {
  home: ["card", "text"],
  rail: ["tile", "text"],
  academy: ["strip", "text"],
};

/**
 * Audience roles for light targeting.
 * `all` matches every signed-in viewer (including guests browsing Pulse).
 */
export const PROMO_BANNER_AUDIENCES = [
  "all",
  "guest",
  "student",
  "agent",
  "agency_owner",
  "instructor",
  "manager",
  "admin",
] as const;
export type PromoBannerAudience = (typeof PROMO_BANNER_AUDIENCES)[number];

/** Locale keys stored on each banner (CMS-managed, not app message catalogs). */
export const PROMO_BANNER_LOCALES = ["en", "es"] as const;
export type PromoBannerLocale = (typeof PROMO_BANNER_LOCALES)[number];

export type PromoBannerLocalizedString = Record<PromoBannerLocale, string>;

/**
 * Copy / asset limits — keep promos discrete and readable in the feed.
 * Enforced in Zod schemas and Admin UI.
 */
export const PROMO_BANNER_LIMITS = {
  eyebrow: 24,
  title: 48,
  body: 120,
  ctaLabel: 24,
  href: 512,
  imageMaxBytes: 5 * 1024 * 1024,
} as const;

/** Formats that accept a cover image. */
export type PromoBannerImageFormat = Exclude<PromoBannerFormat, "text">;

/**
 * Output size + aspect per banner format.
 * Aligned with Pulse web display frames (card 16:9, tile 4:3, strip 16:9).
 * Admin reshapes uploads to these pixels: full photo contained + blurred cover bleed.
 */
export const PROMO_BANNER_IMAGE_TARGETS: Record<
  PromoBannerImageFormat,
  {
    width: number;
    height: number;
    /** width / height */
    aspectRatio: number;
    label: string;
  }
> = {
  card: {
    width: 1200,
    height: 675,
    aspectRatio: 16 / 9,
    label: "16:9",
  },
  tile: {
    width: 800,
    height: 600,
    aspectRatio: 4 / 3,
    label: "4:3",
  },
  strip: {
    width: 560,
    height: 315,
    aspectRatio: 16 / 9,
    label: "16:9",
  },
};

/** @deprecated Letterbox fill; banners use cover crop (no empty margins). */
export const PROMO_BANNER_IMAGE_FIT_FILL = "#e8eee9";

export function imageTargetForFormat(
  format: PromoBannerFormat,
): (typeof PROMO_BANNER_IMAGE_TARGETS)[PromoBannerImageFormat] | null {
  if (format === "text") return null;
  return PROMO_BANNER_IMAGE_TARGETS[format];
}

/**
 * Center-crop source rect so the crop matches `targetAspect` (object-fit: cover).
 * Used when reshaping uploads so the banner frame is always fully filled.
 */
export function computeCoverCrop(
  sourceWidth: number,
  sourceHeight: number,
  targetAspect: number,
): { sx: number; sy: number; sw: number; sh: number } {
  if (sourceWidth <= 0 || sourceHeight <= 0 || targetAspect <= 0) {
    return { sx: 0, sy: 0, sw: Math.max(0, sourceWidth), sh: Math.max(0, sourceHeight) };
  }
  const sourceAspect = sourceWidth / sourceHeight;
  if (sourceAspect > targetAspect) {
    const sw = sourceHeight * targetAspect;
    return {
      sx: (sourceWidth - sw) / 2,
      sy: 0,
      sw,
      sh: sourceHeight,
    };
  }
  const sh = sourceWidth / targetAspect;
  return {
    sx: 0,
    sy: (sourceHeight - sh) / 2,
    sw: sourceWidth,
    sh,
  };
}

/**
 * Destination rect that fits the full source inside `destWidth`×`destHeight`
 * (object-fit: contain). Prefer {@link computeCoverCrop} for banner frames.
 */
export function computeContainFit(
  sourceWidth: number,
  sourceHeight: number,
  destWidth: number,
  destHeight: number,
): { dx: number; dy: number; dw: number; dh: number } {
  if (
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    destWidth <= 0 ||
    destHeight <= 0
  ) {
    return {
      dx: 0,
      dy: 0,
      dw: Math.max(0, destWidth),
      dh: Math.max(0, destHeight),
    };
  }
  const scale = Math.min(destWidth / sourceWidth, destHeight / sourceHeight);
  const dw = sourceWidth * scale;
  const dh = sourceHeight * scale;
  return {
    dx: (destWidth - dw) / 2,
    dy: (destHeight - dh) / 2,
    dw,
    dh,
  };
}

export function defaultFormatForSurface(
  surface: PromoBannerSurface,
): PromoBannerFormat {
  if (surface === "rail") return "tile";
  if (surface === "academy") return "strip";
  return "card";
}

/** @deprecated Prefer defaultFormatForSurface. */
export function variantForSurface(
  surface: PromoBannerSurface,
): PromoBannerVariant {
  return defaultFormatForSurface(surface) as PromoBannerVariant;
}

export function surfaceForVariant(
  variant: PromoBannerVariant | PromoBannerFormat,
): PromoBannerSurface {
  if (variant === "tile") return "rail";
  if (variant === "strip") return "academy";
  return "home";
}

export function formatsForSurface(
  surface: PromoBannerSurface,
): readonly PromoBannerFormat[] {
  return FORMATS_BY_SURFACE[surface];
}

export function isFormatAllowedForSurface(
  surface: PromoBannerSurface,
  format: PromoBannerFormat,
): boolean {
  return FORMATS_BY_SURFACE[surface].includes(format);
}

export function assertFormatAllowed(
  surface: PromoBannerSurface,
  format: PromoBannerFormat,
): void {
  if (!isFormatAllowedForSurface(surface, format)) {
    throw new Error(
      `Format "${format}" is not allowed on surface "${surface}".`,
    );
  }
}

/** Resolve display format with legacy fallback when format is missing. */
export function resolveBannerFormat(
  banner: Pick<PromoBanner, "surface" | "format">,
): PromoBannerFormat {
  const format = banner.format;
  if (
    format &&
    (PROMO_BANNER_FORMATS as readonly string[]).includes(format) &&
    isFormatAllowedForSurface(banner.surface, format)
  ) {
    return format;
  }
  return defaultFormatForSurface(banner.surface);
}

export type PromoBanner = {
  id: string;
  /** Bump to re-show after users dismissed a prior version (localStorage). */
  version: number;
  active: boolean;
  type: PromoBannerType;
  format: PromoBannerFormat;
  surface: PromoBannerSurface;
  audiences: PromoBannerAudience[];
  /** When false, hide dismiss control and ignore local dismiss state. */
  dismissible: boolean;
  /** When false, omit CTA / href in UI. */
  showCta: boolean;
  /** When false (or format is text), omit image. */
  showImage: boolean;
  eyebrow: PromoBannerLocalizedString;
  title: PromoBannerLocalizedString;
  body: PromoBannerLocalizedString;
  ctaLabel: PromoBannerLocalizedString;
  /** Prefer internal Pulse paths (`/academy/...`, `/tools/afc`). Empty when !showCta. */
  href: string;
  imageUrl: string | null;
  imagePath: string | null;
  startsAt: number | null;
  endsAt: number | null;
  createdAt: number | null;
  updatedAt: number | null;
  updatedBy: string | null;
};

/**
 * Coexistence priority (higher wins for chrome overlays).
 * Feed/academy promos sit in content and do not block consent / guest / tour.
 */
export const PROMO_BANNER_CHROME_PRIORITY = [
  "consent",
  "guest",
  "tour",
  "promo",
] as const;

/** Apply defaults for documents written before type/format/toggles existed. */
export function withBannerCompatDefaults(
  partial: Partial<PromoBanner> &
    Pick<PromoBanner, "id" | "surface" | "title" | "body" | "eyebrow">,
): PromoBanner {
  const surface = partial.surface ?? "home";
  const imageUrl = partial.imageUrl ?? null;
  const imagePath = partial.imagePath ?? null;
  const hasMedia = Boolean(imageUrl || imagePath);
  const format =
    partial.format &&
    isFormatAllowedForSurface(surface, partial.format)
      ? partial.format
      : defaultFormatForSurface(surface);

  return {
    id: partial.id,
    version: partial.version ?? 1,
    active: partial.active === true,
    type: partial.type ?? "promo",
    format,
    surface,
    audiences: partial.audiences?.length ? partial.audiences : ["all"],
    dismissible: partial.dismissible !== false,
    showCta: partial.showCta !== false,
    showImage: partial.showImage ?? hasMedia,
    eyebrow: partial.eyebrow,
    title: partial.title,
    body: partial.body,
    ctaLabel: partial.ctaLabel ?? { en: "", es: "" },
    href: partial.href ?? "",
    imageUrl,
    imagePath,
    startsAt: partial.startsAt ?? null,
    endsAt: partial.endsAt ?? null,
    createdAt: partial.createdAt ?? null,
    updatedAt: partial.updatedAt ?? null,
    updatedBy: partial.updatedBy ?? null,
  };
}
