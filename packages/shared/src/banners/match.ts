import type {
  PromoBanner,
  PromoBannerAudience,
  PromoBannerLocale,
  PromoBannerLocalizedString,
  PromoBannerSurface,
} from "./types";
import { resolveBannerFormat } from "./types";

export { resolveBannerFormat };

export function localizeBannerText(
  value: PromoBannerLocalizedString,
  locale: string,
): string {
  const key = (locale === "es" ? "es" : "en") as PromoBannerLocale;
  const primary = value[key]?.trim();
  if (primary) return primary;
  return value.en?.trim() || value.es?.trim() || "";
}

export function bannerAudienceMatches(
  audiences: PromoBannerAudience[],
  role: string | null | undefined,
  isAnonymous: boolean,
): boolean {
  if (!audiences.length) return false;
  if (audiences.includes("all")) return true;
  if (isAnonymous) return false;
  const normalized = (role ?? "").trim();
  if (!normalized || normalized === "guest") return false;
  return audiences.includes(normalized as PromoBannerAudience);
}

export function isBannerInSchedule(
  banner: Pick<PromoBanner, "startsAt" | "endsAt">,
  nowMs: number = Date.now(),
): boolean {
  if (banner.startsAt != null && nowMs < banner.startsAt) return false;
  if (banner.endsAt != null && nowMs > banner.endsAt) return false;
  return true;
}

export function isBannerVisibleToViewer(
  banner: PromoBanner,
  opts: {
    role: string | null | undefined;
    isAnonymous: boolean;
    nowMs?: number;
  },
): boolean {
  if (!banner.active) return false;
  if (!isBannerInSchedule(banner, opts.nowMs)) return false;
  return bannerAudienceMatches(
    banner.audiences,
    opts.role,
    opts.isAnonymous,
  );
}

/** Visible banners for a surface, newest `updatedAt` first. */
export function pickBannersForSurface(
  banners: PromoBanner[],
  surface: PromoBannerSurface,
  opts: {
    role: string | null | undefined;
    isAnonymous: boolean;
    nowMs?: number;
  },
): PromoBanner[] {
  return banners
    .filter((b) => b.surface === surface)
    .filter((b) => isBannerVisibleToViewer(b, opts))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

/** @deprecated Prefer {@link pickBannersForSurface}; returns the newest match only. */
export function pickBannerForSurface(
  banners: PromoBanner[],
  surface: PromoBannerSurface,
  opts: {
    role: string | null | undefined;
    isAnonymous: boolean;
    nowMs?: number;
  },
): PromoBanner | null {
  return pickBannersForSurface(banners, surface, opts)[0] ?? null;
}

/** Effective showImage — text format never shows media. */
export function bannerShouldShowImage(banner: PromoBanner): boolean {
  if (resolveBannerFormat(banner) === "text") return false;
  return banner.showImage === true;
}
