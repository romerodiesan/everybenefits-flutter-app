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
import {
  DEFAULT_PREFS,
  type NotificationPrefs,
} from "@/lib/firebase/notifications";
import { Skeleton } from "@/components/ui/skeleton";

const PUSH_ROWS = [
  ["pushChats", "notificationsPrefChats"],
  ["pushForumReplies", "notificationsPrefForumReplies"],
  ["pushForumVotes", "notificationsPrefForumVotes"],
  ["pushAcademy", "notificationsPrefAcademy"],
  ["pushSupport", "notificationsPrefSupport"],
] as const;

const IN_APP_ROWS = [
  ["inAppChats", "notificationsPrefInAppChats"],
  ["inAppForums", "notificationsPrefInAppForums"],
  ["inAppAcademy", "notificationsPrefInAppAcademy"],
  ["inAppSupport", "notificationsPrefInAppSupport"],
] as const;

type PushStatus = "unknown" | "granted" | "denied" | "default";

export function NotificationsPanel({ uid }: { uid: string }) {
  const t = useTranslations();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus>("unknown");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushHint, setPushHint] = useState<string | null>(null);

  useEffect(() => {
    let stop: (() => void) | undefined;
    void import("@/lib/firebase/notifications").then(
      ({ watchNotificationState }) => {
        stop = watchNotificationState(uid, (state) => setPrefs(state.prefs));
      },
    );

    if (typeof Notification === "undefined") {
      setPushStatus("denied");
      return () => stop?.();
    }

    const permission = Notification.permission;
    if (permission === "granted") {
      setPushStatus("granted");
      // Refresh token in background — do not block the success banner.
      void import("@/lib/firebase/notifications").then(
        ({ registerWebPushToken }) => {
          void registerWebPushToken(uid).catch(() => undefined);
        },
      );
    } else if (permission === "denied") {
      setPushStatus("denied");
    } else {
      setPushStatus("default");
    }

    return () => stop?.();
  }, [uid]);

  const toggle = async (key: keyof NotificationPrefs) => {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    // Keep forum channel parent in sync when splitting replies/votes.
    if (key === "pushForumReplies" || key === "pushForumVotes") {
      next.pushForums = next.pushForumReplies || next.pushForumVotes;
    }
    if (key === "pushForums" && !next.pushForums) {
      next.pushForumReplies = false;
      next.pushForumVotes = false;
    }
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
      if (token) {
        setPushStatus("granted");
      } else if (
        typeof Notification !== "undefined" &&
        Notification.permission === "denied"
      ) {
        setPushStatus("denied");
        setPushHint(t("notificationsPushDenied"));
      } else {
        setPushHint(t("notificationsPushUnavailable"));
      }
    } finally {
      setPushBusy(false);
    }
  };

  const readyPrefs = prefs ?? DEFAULT_PREFS;

  return (
    <SettingsPanelShell
      title={t("notificationsPrefsTitle")}
      subtitle={t("notificationsPrefsHint")}
    >
      <div className="mb-4">
        {pushStatus === "granted" ? (
          <StatusBanner kind="success">
            {t("notificationsPushEnabled")}
          </StatusBanner>
        ) : pushStatus === "denied" ? (
          <StatusBanner kind="error">{t("notificationsPushDenied")}</StatusBanner>
        ) : pushStatus === "unknown" ? (
          <Skeleton className="h-10 w-full" />
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

      {!prefs ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {t("notificationsSectionPush")}
          </p>
          <div className="mb-6 divide-y divide-glass-border">
            {PUSH_ROWS.map(([key, label]) => (
              <SettingsRow key={key} label={t(label)}>
                <Toggle
                  checked={readyPrefs[key]}
                  onChange={() => void toggle(key)}
                  label={t(label)}
                />
              </SettingsRow>
            ))}
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {t("notificationsSectionInApp")}
          </p>
          <div className="divide-y divide-glass-border">
            {IN_APP_ROWS.map(([key, label]) => (
              <SettingsRow key={key} label={t(label)}>
                <Toggle
                  checked={readyPrefs[key]}
                  onChange={() => void toggle(key)}
                  label={t(label)}
                />
              </SettingsRow>
            ))}
          </div>
        </>
      )}
    </SettingsPanelShell>
  );
}
