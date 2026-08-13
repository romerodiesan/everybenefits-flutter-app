"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROMO_BANNER_CHROME_PRIORITY = exports.PROMO_BANNER_IMAGE_FIT_FILL = exports.PROMO_BANNER_IMAGE_TARGETS = exports.PROMO_BANNER_LIMITS = exports.PROMO_BANNER_LOCALES = exports.PROMO_BANNER_AUDIENCES = exports.FORMATS_BY_SURFACE = exports.PROMO_BANNER_VARIANTS = exports.PROMO_BANNER_FORMATS = exports.PROMO_BANNER_TYPES = exports.PROMO_BANNER_SURFACES = void 0;
exports.imageTargetForFormat = imageTargetForFormat;
exports.computeCoverCrop = computeCoverCrop;
exports.computeContainFit = computeContainFit;
exports.defaultFormatForSurface = defaultFormatForSurface;
exports.variantForSurface = variantForSurface;
exports.surfaceForVariant = surfaceForVariant;
exports.formatsForSurface = formatsForSurface;
exports.isFormatAllowedForSurface = isFormatAllowedForSurface;
exports.assertFormatAllowed = assertFormatAllowed;
exports.resolveBannerFormat = resolveBannerFormat;
exports.withBannerCompatDefaults = withBannerCompatDefaults;
/** Surfaces where a promo banner may render in Pulse web. */
exports.PROMO_BANNER_SURFACES = ["home", "rail", "academy"];
/** Intent / campaign category (Admin metadata + light UI cues). */
exports.PROMO_BANNER_TYPES = [
    "promo",
    "product_update",
    "education",
];
/**
 * Visual layouts. Decoupled from surface — see FORMATS_BY_SURFACE.
 * Legacy alias: PromoBannerVariant === PromoBannerFormat without `text`.
 */
exports.PROMO_BANNER_FORMATS = ["card", "tile", "strip", "text"];
/** @deprecated Prefer PromoBannerFormat; kept for existing call sites. */
exports.PROMO_BANNER_VARIANTS = ["card", "tile", "strip"];
/** Allowed formats per placement. */
exports.FORMATS_BY_SURFACE = {
    home: ["card", "text"],
    rail: ["tile", "text"],
    academy: ["strip", "text"],
};
/**
 * Audience roles for light targeting.
 * `all` matches every signed-in viewer (including guests browsing Pulse).
 */
exports.PROMO_BANNER_AUDIENCES = [
    "all",
    "guest",
    "student",
    "agent",
    "agency_owner",
    "instructor",
    "manager",
    "admin",
];
/** Locale keys stored on each banner (CMS-managed, not app message catalogs). */
exports.PROMO_BANNER_LOCALES = ["en", "es"];
/**
 * Copy / asset limits — keep promos discrete and readable in the feed.
 * Enforced in Zod schemas and Admin UI.
 */
exports.PROMO_BANNER_LIMITS = {
    eyebrow: 24,
    title: 48,
    body: 120,
    ctaLabel: 24,
    href: 512,
    imageMaxBytes: 5 * 1024 * 1024,
};
/**
 * Output size + aspect per banner format.
 * Aligned with Pulse web display frames (card 16:9, tile 4:3, strip 16:9).
 * Admin reshapes uploads to these pixels: full photo contained + blurred cover bleed.
 */
exports.PROMO_BANNER_IMAGE_TARGETS = {
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
exports.PROMO_BANNER_IMAGE_FIT_FILL = "#e8eee9";
function imageTargetForFormat(format) {
    if (format === "text")
        return null;
    return exports.PROMO_BANNER_IMAGE_TARGETS[format];
}
/**
 * Center-crop source rect so the crop matches `targetAspect` (object-fit: cover).
 * Used when reshaping uploads so the banner frame is always fully filled.
 */
function computeCoverCrop(sourceWidth, sourceHeight, targetAspect) {
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
function computeContainFit(sourceWidth, sourceHeight, destWidth, destHeight) {
    if (sourceWidth <= 0 ||
        sourceHeight <= 0 ||
        destWidth <= 0 ||
        destHeight <= 0) {
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
function defaultFormatForSurface(surface) {
    if (surface === "rail")
        return "tile";
    if (surface === "academy")
        return "strip";
    return "card";
}
/** @deprecated Prefer defaultFormatForSurface. */
function variantForSurface(surface) {
    return defaultFormatForSurface(surface);
}
function surfaceForVariant(variant) {
    if (variant === "tile")
        return "rail";
    if (variant === "strip")
        return "academy";
    return "home";
}
function formatsForSurface(surface) {
    return exports.FORMATS_BY_SURFACE[surface];
}
function isFormatAllowedForSurface(surface, format) {
    return exports.FORMATS_BY_SURFACE[surface].includes(format);
}
function assertFormatAllowed(surface, format) {
    if (!isFormatAllowedForSurface(surface, format)) {
        throw new Error(`Format "${format}" is not allowed on surface "${surface}".`);
    }
}
/** Resolve display format with legacy fallback when format is missing. */
function resolveBannerFormat(banner) {
    const format = banner.format;
    if (format &&
        exports.PROMO_BANNER_FORMATS.includes(format) &&
        isFormatAllowedForSurface(banner.surface, format)) {
        return format;
    }
    return defaultFormatForSurface(banner.surface);
}
/**
 * Coexistence priority (higher wins for chrome overlays).
 * Feed/academy promos sit in content and do not block consent / guest / tour.
 */
exports.PROMO_BANNER_CHROME_PRIORITY = [
    "consent",
    "guest",
    "tour",
    "promo",
];
/** Apply defaults for documents written before type/format/toggles existed. */
function withBannerCompatDefaults(partial) {
    const surface = partial.surface ?? "home";
    const imageUrl = partial.imageUrl ?? null;
    const imagePath = partial.imagePath ?? null;
    const hasMedia = Boolean(imageUrl || imagePath);
    const format = partial.format &&
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
