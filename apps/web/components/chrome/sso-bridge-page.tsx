"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { appBaseUrl, buildSsoHandoffUrl } from "@/lib/sso";

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
  const returnUrl = params.get("return");
  const invalidReturn = !returnUrl || !isAllowedReturnUrl(returnUrl);

  useEffect(() => {
    if (loading || invalidReturn || !returnUrl) return;

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
  }, [loading, user, returnUrl, invalidReturn, locale, loginPath, t]);

  const message = invalidReturn
    ? t("ssoInvalidReturn")
    : error ?? t("loading");

  return (
    <div className="mesh-bg flex min-h-[100svh] items-center justify-center px-4 text-sm text-muted">
      {message}
    </div>
  );
}
