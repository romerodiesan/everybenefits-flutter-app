"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { signOutUser } from "@/lib/firebase/auth";
import { clearCachedProfile } from "@/lib/profile-cache";
import {
  clearSsoAttempt,
  isAllowedLogoutNext,
  markSsoAttempted,
} from "@/lib/sso";
import { StudioShellSkeleton } from "@/components/chrome/studio-shell-skeleton";

let logoutOnce: Promise<void> | null = null;
let logoutDone = false;

async function localLogoutOnce() {
  if (logoutDone) return;
  if (logoutOnce) return logoutOnce;
  logoutOnce = (async () => {
    await signOutUser();
    clearCachedProfile();
    clearSsoAttempt();
    markSsoAttempted();
    logoutDone = true;
  })().catch((error) => {
    logoutOnce = null;
    throw error;
  });
  return logoutOnce;
}

/**
 * Local sign-out hop used by cross-app logout cascade.
 * Does not cascade again — only clears this origin, then follows `next`.
 */
export function LogoutPage() {
  const t = useTranslations();
  const locale = useLocale();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        await localLogoutOnce();
        // Always navigate once logout finished — Strict Mode may cancel the first run.
        const next = params.get("next");
        if (next && isAllowedLogoutNext(next)) {
          window.location.replace(
            next.startsWith("/") ? `/${locale}${next}` : next,
          );
          return;
        }
        window.location.replace(`/${locale}/login`);
      } catch {
        if (alive) setError(t("ssoFailed"));
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [locale, params, t]);

  if (error) {
    return (
      <div className="studio-bg flex min-h-screen items-center justify-center p-6 text-sm text-danger">
        {error}
      </div>
    );
  }

  return <StudioShellSkeleton hint={t("logoutEverywhere")} />;
}
