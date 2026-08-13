import type { PromoBanner, PromoBannerAudience, PromoBannerLocalizedString, PromoBannerSurface } from "./types";
import { resolveBannerFormat } from "./types";
export { resolveBannerFormat };
export declare function localizeBannerText(value: PromoBannerLocalizedString, locale: string): string;
export declare function bannerAudienceMatches(audiences: PromoBannerAudience[], role: string | null | undefined, isAnonymous: boolean): boolean;
export declare function isBannerInSchedule(banner: Pick<PromoBanner, "startsAt" | "endsAt">, nowMs?: number): boolean;
export declare function isBannerVisibleToViewer(banner: PromoBanner, opts: {
    role: string | null | undefined;
    isAnonymous: boolean;
    nowMs?: number;
}): boolean;
/** Visible banners for a surface, newest `updatedAt` first. */
export declare function pickBannersForSurface(banners: PromoBanner[], surface: PromoBannerSurface, opts: {
    role: string | null | undefined;
    isAnonymous: boolean;
    nowMs?: number;
}): PromoBanner[];
/** @deprecated Prefer {@link pickBannersForSurface}; returns the newest match only. */
export declare function pickBannerForSurface(banners: PromoBanner[], surface: PromoBannerSurface, opts: {
    role: string | null | undefined;
    isAnonymous: boolean;
    nowMs?: number;
}): PromoBanner | null;
/** Effective showImage — text format never shows media. */
export declare function bannerShouldShowImage(banner: PromoBanner): boolean;
//# sourceMappingURL=match.d.ts.map