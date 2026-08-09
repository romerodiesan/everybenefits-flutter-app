"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import {
  channelForType,
  markAllNotificationsRead,
  markNotificationRead,
  watchNotifications,
  type AppNotification,
  type NotificationChannelFilter,
} from "@/lib/firebase/notifications";
import { Button } from "@/components/ui/primitives";
import { PROFILE_SECTION_KEY } from "@/lib/i18n/switch-locale";

function formatWhen(date: Date | null, fallback: string) {
  if (!date) return fallback;
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return fallback;
  }
}

function destinationFor(item: AppNotification): string {
  const href = item.href?.trim();
  if (href) return href;
  const ref = item.ref ?? {};
  if (ref.chatId) return `/chats/${ref.chatId}`;
  if (ref.threadId) return `/home/${ref.threadId}`;
  if (ref.courseId) return `/academy/${ref.courseId}`;
  return "/notifications";
}

const FILTERS: {
  id: NotificationChannelFilter;
  labelKey: string;
}[] = [
  { id: "all", labelKey: "notificationsFilterAll" },
  { id: "chats", labelKey: "notificationsFilterChats" },
  { id: "forums", labelKey: "notificationsFilterForums" },
  { id: "academy", labelKey: "notificationsFilterAcademy" },
  { id: "support", labelKey: "notificationsFilterSupport" },
];

export function NotificationsHome() {
  const t = useTranslations();
  const router = useRouter();
  const { profile } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [busy, setBusy] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotificationChannelFilter>("all");

  useEffect(() => {
    if (!profile || profile.isAnonymous) return;
    return watchNotifications(profile.uid, setItems, () => setItems([]));
  }, [profile]);

  const visibleItems = useMemo(() => {
    if (!profile || profile.isAnonymous) return [];
    if (filter === "all") return items;
    return items.filter((item) => channelForType(item.type) === filter);
  }, [filter, items, profile]);

  const openItem = async (item: AppNotification) => {
    if (!profile || openingId) return;
    setOpeningId(item.id);
    try {
      if (!item.read) {
        await markNotificationRead(profile.uid, item);
      }
      const dest = destinationFor(item);
      if (dest !== "/notifications") {
        router.push(dest);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setOpeningId(null);
    }
  };

  if (!profile || profile.isAnonymous) {
    return (
      <div className="mx-auto flex h-full max-w-2xl items-center justify-center p-6">
        <p className="pulse-sheet px-4 py-10 text-center text-sm text-muted">
          {t("notificationsSignIn")}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {t("notificationsTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("notificationsSubtitle")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            disabled={busy || visibleItems.every((item) => item.read)}
            onClick={async () => {
              setBusy(true);
              try {
                await markAllNotificationsRead(profile.uid);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("notificationsMarkAll")}
          </Button>
          <button
            type="button"
            aria-label={t("notificationsPrefsTitle")}
            title={t("notificationsPrefsTitle")}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-ink/[0.04] hover:text-ink dark:hover:bg-white/[0.04]"
            onClick={() => {
              try {
                sessionStorage.setItem(PROFILE_SECTION_KEY, "notifications");
              } catch {
                // ignore
              }
              router.push("/account?section=notifications");
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="12" cy="12" r="3" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06A2 2 0 1 1 7.08 4.1l.06.06a1.7 1.7 0 0 0 1.87.34h.08A1.7 1.7 0 0 0 10.12 3V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08c.26.63.87 1.04 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.88Z"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {FILTERS.map((item) => {
          const active = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                active
                  ? "bg-brand text-on-brand"
                  : "bg-ink/[0.05] text-muted hover:text-ink dark:bg-white/[0.06]"
              }`}
            >
              {t(item.labelKey)}
            </button>
          );
        })}
      </div>

      {visibleItems.length === 0 ? (
        <p className="pulse-sheet mt-6 px-4 py-10 text-center text-sm text-muted">
          {t("notificationsEmpty")}
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {visibleItems.map((item) => {
            const dest = destinationFor(item);
            const samePage = dest === "/notifications";
            return (
              <li key={item.id}>
                {samePage ? (
                  <button
                    type="button"
                    disabled={openingId === item.id}
                    onClick={() => void openItem(item)}
                    className={`pulse-row flex w-full flex-col gap-1 px-3.5 py-3 text-left transition hover:border-brand/40 disabled:opacity-60 ${
                      item.read ? "opacity-70" : ""
                    }`}
                  >
                    <NotificationRow item={item} />
                  </button>
                ) : (
                  <Link
                    href={dest}
                    onClick={(event) => {
                      event.preventDefault();
                      void openItem(item);
                    }}
                    className={`pulse-row flex flex-col gap-1 px-3.5 py-3 transition hover:border-brand/40 ${
                      item.read ? "opacity-70" : ""
                    }`}
                  >
                    <NotificationRow item={item} />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function NotificationRow({ item }: { item: AppNotification }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug">
          {!item.read && (
            <span
              className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand align-middle"
              aria-hidden
            />
          )}
          {item.title}
          {item.count > 1 && (
            <span className="ml-1.5 rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-bold text-brand">
              {item.count}
            </span>
          )}
        </p>
        <span className="shrink-0 text-[11px] text-muted">
          {formatWhen(item.createdAt, "")}
        </span>
      </div>
      <p className="text-sm text-muted">{item.body}</p>
    </>
  );
}
