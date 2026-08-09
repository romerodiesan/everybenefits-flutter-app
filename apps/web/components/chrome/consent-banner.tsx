"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/primitives";
import { setAnalyticsConsent } from "@/lib/privacy/telemetry";

const SEEN_KEY = "pulse_analytics_consent_v1";

/**
 * First-visit analytics consent banner.
 * Default remains off until the user accepts (or declines and stays off).
 */
export function ConsentBanner() {
  const t = useTranslations();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(SEEN_KEY);
      // Show only when the user has never chosen (key missing).
      setVisible(raw !== "0" && raw !== "1");
    } catch {
      setVisible(false);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t("consentBannerTitle")}
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-glass-border bg-mesh-deep/95 p-4 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{t("consentBannerTitle")}</p>
          <p className="mt-1 text-sm text-muted">{t("consentBannerBody")}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              void setAnalyticsConsent(false).then(() => setVisible(false));
            }}
          >
            {t("consentBannerDecline")}
          </Button>
          <Button
            type="button"
            onClick={() => {
              void setAnalyticsConsent(true).then(() => setVisible(false));
            }}
          >
            {t("consentBannerAccept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
