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
} from "@pulse/sso/client";
import { AppShellSkeleton } from "@/components/chrome/app-shell-skeleton";

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
      <div className="mesh-bg flex min-h-[100svh] items-center justify-center p-6 text-sm text-red-400">
        {error}
      </div>
    );
  }

  return <AppShellSkeleton hint={t("logoutEverywhere")} />;
}
