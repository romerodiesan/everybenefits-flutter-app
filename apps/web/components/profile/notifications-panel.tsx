"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/primitives";
import {
  SettingsAccordion,
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
  ["pushForumNewThreads", "notificationsPrefForumNewThreads"],
  ["pushAcademy", "notificationsPrefAcademy"],
  ["pushSupport", "notificationsPrefSupport"],
] as const;

const IN_APP_ROWS = [
  ["inAppChats", "notificationsPrefChats"],
  ["inAppForums", "notificationsPrefForums"],
  ["inAppAcademy", "notificationsPrefAcademy"],
  ["inAppSupport", "notificationsPrefSupport"],
] as const;

const EMAIL_ROWS = [
  ["emailChats", "notificationsPrefChats"],
  ["emailForumReplies", "notificationsPrefForumReplies"],
  ["emailForumVotes", "notificationsPrefForumVotes"],
  ["emailForumNewThreads", "notificationsPrefForumNewThreads"],
  ["emailAcademy", "notificationsPrefAcademy"],
  ["emailSupport", "notificationsPrefSupport"],
  ["emailProductUpdates", "notificationsPrefEmailProduct"],
] as const;

type PrefGroupId = "push" | "inApp" | "email";
type PushStatus = "unknown" | "granted" | "denied" | "default";

const ICONS = {
  push: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M6 9.5A6 6 0 0 1 18 9.5c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z"
        strokeLinejoin="round"
      />
      <path d="M10 18.5a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  ),
  inApp: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
      <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  ),
  email: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4.5 7.5 7.5 5.5 7.5-5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export function NotificationsPanel({ uid }: { uid: string }) {
  const t = useTranslations();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus>("unknown");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushHint, setPushHint] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<PrefGroupId, boolean>>({
    push: true,
    inApp: false,
    email: false,
  });

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
    if (
      key === "pushForumReplies" ||
      key === "pushForumVotes" ||
      key === "pushForumNewThreads"
    ) {
      next.pushForums =
        next.pushForumReplies ||
        next.pushForumVotes ||
        next.pushForumNewThreads;
    }
    if (key === "pushForums" && !next.pushForums) {
      next.pushForumReplies = false;
      next.pushForumVotes = false;
      next.pushForumNewThreads = false;
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

  const counts = useMemo(() => {
    const tally = (
      rows: readonly (readonly [keyof NotificationPrefs, string])[],
    ) => rows.reduce((n, [key]) => n + (readyPrefs[key] ? 1 : 0), 0);
    return {
      push: tally(PUSH_ROWS),
      inApp: tally(IN_APP_ROWS),
      email: tally(EMAIL_ROWS),
    };
  }, [readyPrefs]);

  const toggleGroup = (id: PrefGroupId) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <SettingsPanelShell
      title={t("notificationsPrefsTitle")}
      subtitle={t("notificationsPrefsHint")}
    >
      {!prefs ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-[4.5rem] w-full rounded-2xl" />
          <Skeleton className="h-[4.5rem] w-full rounded-2xl" />
          <Skeleton className="h-[4.5rem] w-full rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-3">
          {pushStatus === "unknown" ? (
            <Skeleton className="h-12 w-full rounded-2xl" />
          ) : pushStatus === "granted" ? (
            <StatusBanner kind="success">
              {t("notificationsPushEnabled")}
            </StatusBanner>
          ) : pushStatus === "denied" ? (
            <StatusBanner kind="error">{t("notificationsPushDenied")}</StatusBanner>
          ) : (
            <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-glass-border bg-ink/[0.015] px-4 py-3.5 dark:bg-white/[0.02]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {t("notificationsPushSetupTitle")}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {t("notificationsPushHint")}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="w-fit shrink-0"
                  disabled={pushBusy}
                  onClick={() => void enablePush()}
                >
                  {t("notificationsEnablePush")}
                </Button>
              </div>
              {pushHint && <StatusBanner kind="error">{pushHint}</StatusBanner>}
            </div>
          )}

          <SettingsAccordion
            title={t("notificationsSectionPush")}
            description={t("notificationsPushHint")}
            icon={ICONS.push}
            open={openGroups.push}
            onToggle={() => toggleGroup("push")}
            enabledCount={counts.push}
            totalCount={PUSH_ROWS.length}
          >
            {PUSH_ROWS.map(([key, label]) => (
              <SettingsRow key={key} label={t(label)}>
                <Toggle
                  checked={readyPrefs[key]}
                  onChange={() => void toggle(key)}
                  label={t(label)}
                />
              </SettingsRow>
            ))}
          </SettingsAccordion>

          <SettingsAccordion
            title={t("notificationsSectionInApp")}
            description={t("notificationsInAppHint")}
            icon={ICONS.inApp}
            open={openGroups.inApp}
            onToggle={() => toggleGroup("inApp")}
            enabledCount={counts.inApp}
            totalCount={IN_APP_ROWS.length}
          >
            {IN_APP_ROWS.map(([key, label]) => (
              <SettingsRow key={key} label={t(label)}>
                <Toggle
                  checked={readyPrefs[key]}
                  onChange={() => void toggle(key)}
                  label={t(label)}
                />
              </SettingsRow>
            ))}
          </SettingsAccordion>

          <SettingsAccordion
            title={t("notificationsSectionEmail")}
            description={t("notificationsEmailHint")}
            icon={ICONS.email}
            open={openGroups.email}
            onToggle={() => toggleGroup("email")}
            enabledCount={counts.email}
            totalCount={EMAIL_ROWS.length}
          >
            {EMAIL_ROWS.map(([key, label]) => (
              <SettingsRow key={key} label={t(label)}>
                <Toggle
                  checked={readyPrefs[key]}
                  onChange={() => void toggle(key)}
                  label={t(label)}
                />
              </SettingsRow>
            ))}
          </SettingsAccordion>
        </div>
      )}
    </SettingsPanelShell>
  );
}
