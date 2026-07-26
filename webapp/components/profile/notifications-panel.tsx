"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/primitives";
import {
  SettingsPanelShell,
  SettingsRow,
  StatusBanner,
  Toggle,
} from "@/components/profile/settings-nav";

const PREF_ROWS = [
  ["pushChats", "notificationsPrefChats"],
  ["pushForums", "notificationsPrefForums"],
  ["pushAcademy", "notificationsPrefAcademy"],
  ["pushSupport", "notificationsPrefSupport"],
] as const;

export function NotificationsPanel({ uid }: { uid: string }) {
  const t = useTranslations();
  const [prefs, setPrefs] = useState({
    pushChats: true,
    pushForums: true,
    pushAcademy: true,
    pushSupport: true,
  });
  const [pushReady, setPushReady] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushHint, setPushHint] = useState<string | null>(null);

  useEffect(() => {
    let stop: (() => void) | undefined;
    void import("@/lib/firebase/notifications").then(
      ({ watchNotificationState }) => {
        stop = watchNotificationState(uid, (state) => setPrefs(state.prefs));
      },
    );
    // Reflect an already-granted permission without prompting again.
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      void import("@/lib/firebase/notifications").then(
        ({ registerWebPushToken }) => {
          void registerWebPushToken(uid).then((token) =>
            setPushReady(Boolean(token)),
          );
        },
      );
    }
    return () => stop?.();
  }, [uid]);

  const toggle = async (key: keyof typeof prefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    const { saveNotificationPrefs } = await import(
      "@/lib/firebase/notifications"
    );
    await saveNotificationPrefs(uid, next);
  };

  const enablePush = async () => {
    setPushBusy(true);
    setPushHint(null);
    try {
      const { registerWebPushToken } = await import(
        "@/lib/firebase/notifications"
      );
      const token = await registerWebPushToken(uid);
      setPushReady(Boolean(token));
      if (!token) {
        setPushHint(t("notificationsPushUnavailable"));
      }
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <SettingsPanelShell
      title={t("notificationsPrefsTitle")}
      subtitle={t("notificationsPrefsHint")}
    >
      <div className="mb-4">
        {pushReady ? (
          <StatusBanner kind="success">
            {t("notificationsPushEnabled")}
          </StatusBanner>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              className="w-fit"
              disabled={pushBusy}
              onClick={() => void enablePush()}
            >
              {t("notificationsEnablePush")}
            </Button>
            {pushHint && <StatusBanner kind="error">{pushHint}</StatusBanner>}
          </div>
        )}
      </div>

      <div className="divide-y divide-glass-border">
        {PREF_ROWS.map(([key, label]) => (
          <SettingsRow key={key} label={t(label)}>
            <Toggle
              checked={prefs[key]}
              onChange={() => void toggle(key)}
              label={t(label)}
            />
          </SettingsRow>
        ))}
      </div>
    </SettingsPanelShell>
  );
}
