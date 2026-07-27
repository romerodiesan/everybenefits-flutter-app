"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  SettingsPanelShell,
  SettingsRow,
  Toggle,
} from "@/components/profile/settings-nav";
import {
  getAnalyticsConsent,
  setAnalyticsConsent,
} from "@/lib/privacy/telemetry";

export function PrivacyPanel() {
  const t = useTranslations();
  const [analytics, setAnalytics] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAnalytics(getAnalyticsConsent());
    setReady(true);
  }, []);

  const toggle = async () => {
    if (busy || !ready) return;
    const next = !analytics;
    setAnalytics(next);
    setBusy(true);
    try {
      await setAnalyticsConsent(next);
    } catch {
      setAnalytics(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsPanelShell
      title={t("profilePrivacy")}
      subtitle={t("profilePrivacyHint")}
    >
      <SettingsRow label={t("profileAnalytics")} hint={t("profileAnalyticsHint")}>
        <Toggle
          checked={analytics}
          disabled={!ready || busy}
          onChange={() => void toggle()}
          label={t("profileAnalytics")}
        />
      </SettingsRow>
    </SettingsPanelShell>
  );
}
