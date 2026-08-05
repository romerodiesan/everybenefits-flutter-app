"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  SettingsAccordion,
  SettingsPanelShell,
  SettingsRow,
  Toggle,
} from "@/components/profile/settings-nav";
import {
  getAnalyticsConsent,
  setAnalyticsConsent,
} from "@/lib/privacy/telemetry";
import {
  DEFAULT_PRIVACY_PREFS,
  type PrivacyPrefs,
} from "@/lib/privacy/prefs";
import { useAuth } from "@/lib/providers/auth-provider";
import { updateUserProfile } from "@/lib/firebase/users";
import { Skeleton } from "@/components/ui/skeleton";

const DIRECTORY_ROWS = [
  ["discoverableInDirectory", "privacyDiscoverable", "privacyDiscoverableHint"],
  ["allowDirectMessages", "privacyAllowDms", "privacyAllowDmsHint"],
] as const;

const SEARCH_ROWS = [
  ["searchableByEmail", "privacySearchableEmail", "privacySearchableEmailHint"],
  ["searchableByNpn", "privacySearchableNpn", "privacySearchableNpnHint"],
  ["showEmailInSearch", "privacyShowEmail", "privacyShowEmailHint"],
  ["showNpnInSearch", "privacyShowNpn", "privacyShowNpnHint"],
] as const;

type PrivacyGroupId = "directory" | "search" | "data";

const ICONS = {
  directory: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3" />
      <circle cx="16.5" cy="9.5" r="2.5" />
      <path d="M3.5 19c.8-2.6 2.9-4 5.5-4s4.7 1.4 5.5 4" strokeLinecap="round" />
      <path d="M14 19c.5-1.8 1.8-2.8 3.5-2.8 1.2 0 2.2.5 2.9 1.4" strokeLinecap="round" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16.5 16.5 20 20" strokeLinecap="round" />
    </svg>
  ),
  data: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Z" />
      <path d="M4 7v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7" strokeLinecap="round" />
      <path d="M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5" strokeLinecap="round" />
    </svg>
  ),
};

export function PrivacyPanel() {
  const t = useTranslations();
  const { profile } = useAuth();
  const [analytics, setAnalytics] = useState(() =>
    typeof window === "undefined" ? false : getAnalyticsConsent(),
  );
  const [ready] = useState(() => typeof window !== "undefined");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<PrivacyPrefs | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<PrivacyGroupId, boolean>>({
    directory: true,
    search: false,
    data: false,
  });

  useEffect(() => {
    if (!profile) return;
    setPrefs(profile.privacy ?? DEFAULT_PRIVACY_PREFS);
    // Sync only when the privacy payload changes — ignore unrelated profile
    // snapshots (appearance, displayName, etc.) that would snap toggles back.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- privacyKey
  }, [
    profile?.uid,
    profile?.privacy?.discoverableInDirectory,
    profile?.privacy?.searchableByEmail,
    profile?.privacy?.searchableByNpn,
    profile?.privacy?.showEmailInSearch,
    profile?.privacy?.showNpnInSearch,
    profile?.privacy?.allowDirectMessages,
  ]);

  const toggleAnalytics = async () => {
    if (busyKey || !ready) return;
    const next = !analytics;
    setAnalytics(next);
    setBusyKey("analytics");
    try {
      await setAnalyticsConsent(next);
    } catch {
      setAnalytics(!next);
    } finally {
      setBusyKey(null);
    }
  };

  const togglePrivacy = async (key: keyof PrivacyPrefs) => {
    if (!profile || !prefs || busyKey) return;
    const previous = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setBusyKey(key);
    try {
      await updateUserProfile(profile, { privacy: next });
    } catch {
      setPrefs(previous);
    } finally {
      setBusyKey(null);
    }
  };

  const readyPrefs = prefs ?? DEFAULT_PRIVACY_PREFS;

  const counts = useMemo(() => {
    const tally = (
      rows: readonly (readonly [keyof PrivacyPrefs, string, string])[],
    ) => rows.reduce((n, [key]) => n + (readyPrefs[key] ? 1 : 0), 0);
    return {
      directory: tally(DIRECTORY_ROWS),
      search: tally(SEARCH_ROWS),
      data: analytics ? 1 : 0,
    };
  }, [analytics, readyPrefs]);

  const toggleGroup = (id: PrivacyGroupId) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const signedIn = Boolean(profile && !profile.isAnonymous);

  return (
    <SettingsPanelShell
      title={t("profilePrivacy")}
      subtitle={t("profilePrivacyHint")}
    >
      {!prefs && signedIn ? (
        <div className="space-y-3">
          <Skeleton className="h-[4.5rem] w-full rounded-2xl" />
          <Skeleton className="h-[4.5rem] w-full rounded-2xl" />
          <Skeleton className="h-[4.5rem] w-full rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-3">
          {signedIn && (
            <>
              <SettingsAccordion
                title={t("privacySectionDirectory")}
                description={t("privacyDirectoryHint")}
                icon={ICONS.directory}
                open={openGroups.directory}
                onToggle={() => toggleGroup("directory")}
                enabledCount={counts.directory}
                totalCount={DIRECTORY_ROWS.length}
              >
                {DIRECTORY_ROWS.map(([key, label, hint]) => (
                  <SettingsRow key={key} label={t(label)} hint={t(hint)}>
                    <Toggle
                      checked={readyPrefs[key]}
                      disabled={busyKey === key}
                      onChange={() => void togglePrivacy(key)}
                      label={t(label)}
                    />
                  </SettingsRow>
                ))}
              </SettingsAccordion>

              <SettingsAccordion
                title={t("privacySectionSearch")}
                description={t("privacySearchHint")}
                icon={ICONS.search}
                open={openGroups.search}
                onToggle={() => toggleGroup("search")}
                enabledCount={counts.search}
                totalCount={SEARCH_ROWS.length}
              >
                {SEARCH_ROWS.map(([key, label, hint]) => (
                  <SettingsRow key={key} label={t(label)} hint={t(hint)}>
                    <Toggle
                      checked={readyPrefs[key]}
                      disabled={busyKey === key}
                      onChange={() => void togglePrivacy(key)}
                      label={t(label)}
                    />
                  </SettingsRow>
                ))}
              </SettingsAccordion>
            </>
          )}

          <SettingsAccordion
            title={t("privacySectionData")}
            description={t("privacyDataHint")}
            icon={ICONS.data}
            open={openGroups.data || !signedIn}
            onToggle={() => toggleGroup("data")}
            enabledCount={counts.data}
            totalCount={1}
          >
            <SettingsRow
              label={t("profileAnalytics")}
              hint={t("profileAnalyticsHint")}
            >
              <Toggle
                checked={analytics}
                disabled={!ready || busyKey === "analytics"}
                onChange={() => void toggleAnalytics()}
                label={t("profileAnalytics")}
              />
            </SettingsRow>
          </SettingsAccordion>
        </div>
      )}
    </SettingsPanelShell>
  );
}
