"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@pulse/ui";
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

type PrefKey = keyof NotificationPrefs;

type CategoryId = "chats" | "forums" | "academy" | "support" | "admin";

type CategoryDef = {
  id: CategoryId;
  titleKey: string;
  push: { key: PrefKey; labelKey: string }[];
  inApp: { key: PrefKey; labelKey: string }[];
};

const CATEGORIES: CategoryDef[] = [
  {
    id: "chats",
    titleKey: "notificationsCatChats",
    push: [{ key: "pushChats", labelKey: "notificationsPrefChats" }],
    inApp: [{ key: "inAppChats", labelKey: "notificationsPrefInAppChats" }],
  },
  {
    id: "forums",
    titleKey: "notificationsCatForums",
    push: [
      { key: "pushForumReplies", labelKey: "notificationsPrefForumReplies" },
      { key: "pushForumVotes", labelKey: "notificationsPrefForumVotes" },
    ],
    inApp: [{ key: "inAppForums", labelKey: "notificationsPrefInAppForums" }],
  },
  {
    id: "academy",
    titleKey: "notificationsCatAcademy",
    push: [{ key: "pushAcademy", labelKey: "notificationsPrefAcademy" }],
    inApp: [
      { key: "inAppAcademy", labelKey: "notificationsPrefInAppAcademy" },
    ],
  },
  {
    id: "support",
    titleKey: "notificationsCatSupport",
    push: [{ key: "pushSupport", labelKey: "notificationsPrefSupport" }],
    inApp: [
      { key: "inAppSupport", labelKey: "notificationsPrefInAppSupport" },
    ],
  },
  {
    id: "admin",
    titleKey: "notificationsCatAdmin",
    push: [{ key: "pushAdmin", labelKey: "notificationsPrefAdmin" }],
    inApp: [{ key: "inAppAdmin", labelKey: "notificationsPrefInAppAdmin" }],
  },
];

type PushStatus = "unknown" | "granted" | "denied" | "default";

export function NotificationsPanel({ uid }: { uid: string }) {
  const t = useTranslations();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus>("unknown");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushHint, setPushHint] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<CategoryId, boolean>>({
    chats: true,
    forums: false,
    academy: false,
    support: false,
    admin: false,
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

  const toggle = async (key: PrefKey) => {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
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
        <div className="space-y-2">
          {CATEGORIES.map((cat) => {
            const isOpen = open[cat.id];
            return (
              <div
                key={cat.id}
                className="overflow-hidden rounded-2xl border border-glass-border"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setOpen((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))
                  }
                >
                  <span className="font-semibold text-ink">
                    {t(cat.titleKey)}
                  </span>
                  <span
                    className={`text-muted transition ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  >
                    ▾
                  </span>
                </button>
                {isOpen ? (
                  <div className="border-t border-glass-border px-4 pb-3 pt-2">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {t("notificationsSectionPush")}
                    </p>
                    <div className="mb-3 divide-y divide-glass-border">
                      {cat.push.map(({ key, labelKey }) => (
                        <SettingsRow key={key} label={t(labelKey)}>
                          <Toggle
                            checked={readyPrefs[key]}
                            onChange={() => void toggle(key)}
                            label={t(labelKey)}
                          />
                        </SettingsRow>
                      ))}
                    </div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {t("notificationsSectionInApp")}
                    </p>
                    <div className="divide-y divide-glass-border">
                      {cat.inApp.map(({ key, labelKey }) => (
                        <SettingsRow key={key} label={t(labelKey)}>
                          <Toggle
                            checked={readyPrefs[key]}
                            onChange={() => void toggle(key)}
                            label={t(labelKey)}
                          />
                        </SettingsRow>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </SettingsPanelShell>
  );
}
