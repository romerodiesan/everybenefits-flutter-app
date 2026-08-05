"use client";

import type { AppLocale } from "@/i18n/routing";

type LocaleRouter = {
  replace: (
    href: string | { pathname: string; query?: Record<string, string> },
    options?: { locale?: string },
  ) => void;
};

/**
 * Switch locale while preserving query string and hash.
 * next-intl's pathname-only replace drops both; callers should also
 * re-apply the hash after `locale` changes via `restorePendingLocaleHash`.
 */
export function switchLocale(
  router: LocaleRouter,
  pathname: string,
  nextLocale: AppLocale | string,
  options?: { search?: string; hash?: string },
) {
  const search =
    options?.search ??
    (typeof window !== "undefined" ? window.location.search : "");
  const hash =
    options?.hash ??
    (typeof window !== "undefined" ? window.location.hash : "");

  if (typeof window !== "undefined" && hash) {
    try {
      sessionStorage.setItem(LOCALE_HASH_KEY, hash);
    } catch {
      // ignore quota / private mode
    }
  }

  const href = search ? `${pathname}${search}` : pathname;
  router.replace(href, { locale: nextLocale });
}

const LOCALE_HASH_KEY = "pulse_pending_locale_hash";

/** Call after locale changes to restore a hash saved by switchLocale. */
export function restorePendingLocaleHash(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const pending = sessionStorage.getItem(LOCALE_HASH_KEY);
    if (pending) {
      sessionStorage.removeItem(LOCALE_HASH_KEY);
      if (window.location.hash !== pending) {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}${pending}`,
        );
      }
      return pending;
    }
  } catch {
    // ignore
  }
  return null;
}

export const PROFILE_SECTION_KEY = "pulse_profile_section";
