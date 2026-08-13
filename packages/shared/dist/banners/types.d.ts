/** Surfaces where a promo banner may render in Pulse web. */
export declare const PROMO_BANNER_SURFACES: readonly ["home", "rail", "academy"];
export type PromoBannerSurface = (typeof PROMO_BANNER_SURFACES)[number];
/** Intent / campaign category (Admin metadata + light UI cues). */
export declare const PROMO_BANNER_TYPES: readonly ["promo", "product_update", "education"];
export type PromoBannerType = (typeof PROMO_BANNER_TYPES)[number];
/**
 * Visual layouts. Decoupled from surface — see FORMATS_BY_SURFACE.
 * Legacy alias: PromoBannerVariant === PromoBannerFormat without `text`.
 */
export declare const PROMO_BANNER_FORMATS: readonly ["card", "tile", "strip", "text"];
export type PromoBannerFormat = (typeof PROMO_BANNER_FORMATS)[number];
/** @deprecated Prefer PromoBannerFormat; kept for existing call sites. */
export declare const PROMO_BANNER_VARIANTS: readonly ["card", "tile", "strip"];
export type PromoBannerVariant = (typeof PROMO_BANNER_VARIANTS)[number];
/** Allowed formats per placement. */
export declare const FORMATS_BY_SURFACE: Record<PromoBannerSurface, readonly PromoBannerFormat[]>;
/**
 * Audience roles for light targeting.
 * `all` matches every signed-in viewer (including guests browsing Pulse).
 */
export declare const PROMO_BANNER_AUDIENCES: readonly ["all", "guest", "student", "agent", "agency_owner", "instructor", "manager", "admin"];
export type PromoBannerAudience = (typeof PROMO_BANNER_AUDIENCES)[number];
/** Locale keys stored on each banner (CMS-managed, not app message catalogs). */
export declare const PROMO_BANNER_LOCALES: readonly ["en", "es"];
export type PromoBannerLocale = (typeof PROMO_BANNER_LOCALES)[number];
export type PromoBannerLocalizedString = Record<PromoBannerLocale, string>;
/**
 * Copy / asset limits — keep promos discrete and readable in the feed.
 * Enforced in Zod schemas and Admin UI.
 */
export declare const PROMO_BANNER_LIMITS: {
    readonly eyebrow: 24;
    readonly title: 48;
    readonly body: 120;
    readonly ctaLabel: 24;
    readonly href: 512;
    readonly imageMaxBytes: number;
};
/** Formats that accept a cover image. */
export type PromoBannerImageFormat = Exclude<PromoBannerFormat, "text">;
/**
 * Output size + aspect per banner format.
 * Aligned with Pulse web display frames (card 16:9, tile 4:3, strip 16:9).
 * Admin reshapes uploads to these pixels: full photo contained + blurred cover bleed.
 */
export declare const PROMO_BANNER_IMAGE_TARGETS: Record<PromoBannerImageFormat, {
    width: number;
    height: number;
    /** width / height */
    aspectRatio: number;
    label: string;
}>;
/** @deprecated Letterbox fill; banners use cover crop (no empty margins). */
export declare const PROMO_BANNER_IMAGE_FIT_FILL = "#e8eee9";
export declare function imageTargetForFormat(format: PromoBannerFormat): (typeof PROMO_BANNER_IMAGE_TARGETS)[PromoBannerImageFormat] | null;
/**
 * Center-crop source rect so the crop matches `targetAspect` (object-fit: cover).
 * Used when reshaping uploads so the banner frame is always fully filled.
 */
export declare function computeCoverCrop(sourceWidth: number, sourceHeight: number, targetAspect: number): {
    sx: number;
    sy: number;
    sw: number;
    sh: number;
};
/**
 * Destination rect that fits the full source inside `destWidth`×`destHeight`
 * (object-fit: contain). Prefer {@link computeCoverCrop} for banner frames.
 */
export declare function computeContainFit(sourceWidth: number, sourceHeight: number, destWidth: number, destHeight: number): {
    dx: number;
    dy: number;
    dw: number;
    dh: number;
};
export declare function defaultFormatForSurface(surface: PromoBannerSurface): PromoBannerFormat;
/** @deprecated Prefer defaultFormatForSurface. */
export declare function variantForSurface(surface: PromoBannerSurface): PromoBannerVariant;
export declare function surfaceForVariant(variant: PromoBannerVariant | PromoBannerFormat): PromoBannerSurface;
export declare function formatsForSurface(surface: PromoBannerSurface): readonly PromoBannerFormat[];
export declare function isFormatAllowedForSurface(surface: PromoBannerSurface, format: PromoBannerFormat): boolean;
export declare function assertFormatAllowed(surface: PromoBannerSurface, format: PromoBannerFormat): void;
/** Resolve display format with legacy fallback when format is missing. */
export declare function resolveBannerFormat(banner: Pick<PromoBanner, "surface" | "format">): PromoBannerFormat;
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
export declare const PROMO_BANNER_CHROME_PRIORITY: readonly ["consent", "guest", "tour", "promo"];
/** Apply defaults for documents written before type/format/toggles existed. */
export declare function withBannerCompatDefaults(partial: Partial<PromoBanner> & Pick<PromoBanner, "id" | "surface" | "title" | "body" | "eyebrow">): PromoBanner;
//# sourceMappingURL=types.d.ts.map