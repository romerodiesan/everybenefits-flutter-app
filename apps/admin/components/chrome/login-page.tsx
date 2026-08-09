"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { Button } from "@/components/ui/primitives";
import { AdminShellSkeleton } from "@/components/chrome/admin-shell-skeleton";
import { BrandMark } from "@/components/chrome/brand-mark";
import {
  hasSsoAttempted,
  markSsoAttempted,
  pulseHubLoginUrl,
  safeInternalPath,
  ssoBridgeUrl,
  ssoConsumeUrl,
} from "@/lib/sso";

/**
 * Admin does not host rich auth — Pulse is the hub (ADR-006).
 * Flow: silent bridge → if none, CTA to Pulse login / retry bridge.
 */
export function LoginPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading } = useAuth();
  const [checkingSso, setCheckingSso] = useState(true);

  const nextParam = safeInternalPath(params.get("next"));

  const finish = () => {
    if (nextParam) {
      router.replace(nextParam);
      return;
    }
    router.replace("/");
  };

  const consumeUrl = () =>
    ssoConsumeUrl("admin", locale, nextParam || "/");

  useEffect(() => {
    if (loading) return;
    if (user) {
      finish();
      return;
    }
    if (hasSsoAttempted()) {
      setCheckingSso(false);
      return;
    }
    markSsoAttempted();
    window.location.replace(ssoBridgeUrl("pulse", locale, consumeUrl()));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- finish uses nextParam/locale
  }, [loading, user, locale, nextParam]);

  if (loading || checkingSso) {
    return <AdminShellSkeleton hint={t("ssoChecking")} />;
  }

  const retryBridge = () => {
    try {
      sessionStorage.removeItem("pulse_sso_attempt");
    } catch {
      // ignore
    }
    markSsoAttempted();
    window.location.assign(ssoBridgeUrl("pulse", locale, consumeUrl()));
  };

  const signInOnPulse = () => {
    try {
      sessionStorage.removeItem("pulse_sso_attempt");
    } catch {
      // ignore
    }
    window.location.assign(pulseHubLoginUrl(locale, consumeUrl()));
  };

  return (
    <div className="studio-bg flex min-h-screen items-center justify-center p-6">
      <div className="studio-panel w-full max-w-md p-8">
        <p className="inline-flex items-center gap-2 font-display text-sm tracking-wide text-brand">
          <BrandMark size={28} priority />
          {t("brand")}
        </p>
        <h1 className="mt-2 font-display text-3xl">{t("loginTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("loginHubHint")}</p>

        <Button
          type="button"
          className="mt-6 w-full"
          onClick={signInOnPulse}
        >
          {t("ssoSignInPulse")}
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="mt-3 w-full"
          onClick={retryBridge}
        >
          {t("ssoContinuePulse")}
        </Button>
      </div>
    </div>
  );
}
