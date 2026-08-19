"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveBannerFormat = void 0;
exports.localizeBannerText = localizeBannerText;
exports.bannerAudienceMatches = bannerAudienceMatches;
exports.isBannerInSchedule = isBannerInSchedule;
exports.isBannerVisibleToViewer = isBannerVisibleToViewer;
exports.pickBannersForSurface = pickBannersForSurface;
exports.pickBannerForSurface = pickBannerForSurface;
exports.bannerShouldShowImage = bannerShouldShowImage;
const types_1 = require("./types");
Object.defineProperty(exports, "resolveBannerFormat", { enumerable: true, get: function () { return types_1.resolveBannerFormat; } });
function localizeBannerText(value, locale) {
    const key = (locale === "es" ? "es" : "en");
    const primary = value[key]?.trim();
    if (primary)
        return primary;
    return value.en?.trim() || value.es?.trim() || "";
}
function bannerAudienceMatches(audiences, role, isAnonymous) {
    if (!audiences.length)
        return false;
    if (audiences.includes("all"))
        return true;
    if (isAnonymous)
        return false;
    const normalized = (role ?? "").trim();
    if (!normalized || normalized === "guest")
        return false;
    return audiences.includes(normalized);
}
function isBannerInSchedule(banner, nowMs = Date.now()) {
    if (banner.startsAt != null && nowMs < banner.startsAt)
        return false;
    if (banner.endsAt != null && nowMs > banner.endsAt)
        return false;
    return true;
}
function isBannerVisibleToViewer(banner, opts) {
    if (!banner.active)
        return false;
    if (!isBannerInSchedule(banner, opts.nowMs))
        return false;
    return bannerAudienceMatches(banner.audiences, opts.role, opts.isAnonymous);
}
/** Visible banners for a surface, newest `updatedAt` first. */
function pickBannersForSurface(banners, surface, opts) {
    return banners
        .filter((b) => b.surface === surface)
        .filter((b) => isBannerVisibleToViewer(b, opts))
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}
/** @deprecated Prefer {@link pickBannersForSurface}; returns the newest match only. */
function pickBannerForSurface(banners, surface, opts) {
    return pickBannersForSurface(banners, surface, opts)[0] ?? null;
}
/** Effective showImage — text format never shows media. */
function bannerShouldShowImage(banner) {
    if ((0, types_1.resolveBannerFormat)(banner) === "text")
        return false;
    return banner.showImage === true;
}
