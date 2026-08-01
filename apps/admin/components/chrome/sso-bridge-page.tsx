"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { getFirebaseAuth } from "@pulse/firebase-client";
import {
  appBaseUrl,
  buildSsoHandoffUrl,
} from "@pulse/sso/client";

function isAllowedReturnUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const allowed = new Set([
      new URL(appBaseUrl("pulse")).origin,
      new URL(appBaseUrl("studio")).origin,
    ]);
    return allowed.has(parsed.origin) && parsed.pathname.includes("/auth/sso");
  } catch {
    return false;
  }
}

/**
 * If the user already has a Firebase session here, hand an ID token to the
 * `return` URL (SSO consume page on the sibling app). Otherwise send them to
 * login and resume after sign-in.
 */
export function SsoBridgePage({
  loginPath = "/login",
}: {
  loginPath?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const params = useSearchParams();
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    const returnUrl = params.get("return");
    if (!returnUrl || !isAllowedReturnUrl(returnUrl)) {
      setError(t("ssoInvalidReturn"));
      return;
    }

    const go = async () => {
      if (!user) {
        const resume = `/${locale}/auth/bridge?return=${encodeURIComponent(returnUrl)}`;
        window.location.replace(
          `/${locale}${loginPath}?next=${encodeURIComponent(resume)}`,
        );
        return;
      }
      try {
        const idToken = await getFirebaseAuth().currentUser!.getIdToken();
        window.location.replace(await buildSsoHandoffUrl(returnUrl, idToken));
      } catch {
        setError(t("ssoFailed"));
      }
    };
    void go();
  }, [loading, user, params, locale, loginPath, t]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-sm text-muted">
      {error ?? t("ssoBridging")}
    </div>
  );
}
