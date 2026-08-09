import type { AppLocale } from "@/i18n/routing";

const DEFAULT_LEGAL_ORIGIN = "https://legal.everybenefits.us";

export function legalOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_LEGAL_ORIGIN?.replace(/\/$/, "") ||
    DEFAULT_LEGAL_ORIGIN
  );
}

export type LegalPath =
  | "privacy"
  | "data"
  | "cookies"
  | "terms"
  | "";

export function legalUrl(locale: string, path: LegalPath = ""): string {
  const lang = locale === "es" ? "es" : "en";
  const suffix = path ? `/${path}` : "";
  return `${legalOrigin()}/${lang}${suffix}`;
}

export function legalUrls(locale: AppLocale | string) {
  return {
    home: legalUrl(locale),
    privacy: legalUrl(locale, "privacy"),
    data: legalUrl(locale, "data"),
    cookies: legalUrl(locale, "cookies"),
    terms: legalUrl(locale, "terms"),
  };
}
