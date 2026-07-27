"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type SVGProps,
} from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { useThemeSettings } from "@/lib/providers/theme-provider";
import { signOutEverywhere } from "@/lib/firebase/auth";
import { getOrCreateSupportChat, watchInbox } from "@/lib/firebase/chats";
import {
  countNewFeedThreads,
  listenForegroundMessages,
  markFeedSeen,
  registerWebPushToken,
  watchNotificationState,
} from "@/lib/firebase/notifications";
import { canAuthorCourses, headlineName } from "@/lib/roles";
import { AppSwitcher } from "@/components/chrome/app-switcher";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { buildSsoHandoffUrl, ssoConsumeUrl } from "@/lib/sso";
import { useVisibleSubscription } from "@/lib/hooks/use-visible-subscription";
import { useEnrollments } from "@/lib/providers/enrollments-provider";
import type { UserProfile, UserRole } from "@/lib/types";
import { Button } from "@/components/ui/primitives";
import { AccountGate } from "@/components/chrome/account-gate";
import { AppShellSkeleton } from "@/components/chrome/app-shell-skeleton";
import dynamic from "next/dynamic";

const CommandPalette = dynamic(
  () =>
    import("@/components/chrome/command-palette").then((m) => m.CommandPalette),
  { ssr: false },
);

type PushToast = { title: string; body: string; id: number };

type IconProps = SVGProps<SVGSVGElement> & { filled?: boolean };

function IconHome({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" {...props}>
      {filled ? (
        <path
          fill="currentColor"
          d="M12 3.2 3.8 10.2c-.4.3-.3.9.2 1V20c0 .6.4 1 1 1h5v-6h4v6h5c.6 0 1-.4 1-1v-8.8c.5-.1.6-.7.2-1L12 3.2Z"
        />
      ) : (
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        />
      )}
    </svg>
  );
}

function IconChat({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" {...props}>
      {filled ? (
        <path
          fill="currentColor"
          d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v9a2.5 2.5 0 0 1-2.5 2.5H9.2L5.4 20.4c-.5.4-1.2 0-1.2-.6V5.5Z"
        />
      ) : (
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          d="M6.5 4h11A2.5 2.5 0 0 1 20 6.5v8A2.5 2.5 0 0 1 17.5 17H9l-3.8 2.8c-.5.4-1.2 0-1.2-.6V6.5A2.5 2.5 0 0 1 6.5 4Z"
        />
      )}
    </svg>
  );
}

function IconAi({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" {...props}>
      <path
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.8}
        strokeLinejoin="round"
        d="M12 3.5 13.8 9l5.7 1.2-4.5 3.8 1.4 5.7L12 16.8 7.6 19.7l1.4-5.7-4.5-3.8L10.2 9 12 3.5Z"
      />
    </svg>
  );
}

function IconSchool({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" {...props}>
      {filled ? (
        <path
          fill="currentColor"
          d="M12 3 2.5 8.2 12 13.4l8-4.4V16h1.5V8.2L12 3Zm-6 9.2v3.3c0 1.7 2.7 3 6 3s6-1.3 6-3v-3.3l-6 3.3-6-3.3Z"
        />
      ) : (
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          d="M12 4 3 9l9 5 7.2-4V16H21V9L12 4Zm-5.5 8.6v2.9c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-2.9"
        />
      )}
    </svg>
  );
}

function IconPerson({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" {...props}>
      {filled ? (
        <>
          <circle cx="12" cy="8" r="3.5" fill="currentColor" />
          <path
            fill="currentColor"
            d="M5.5 19.2c.4-3.2 3-5.2 6.5-5.2s6.1 2 6.5 5.2c.1.5-.4 1-1 1H6.5c-.6 0-1.1-.5-1-1Z"
          />
        </>
      ) : (
        <>
          <circle
            cx="12"
            cy="8"
            r="3.2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            d="M6.2 18.5c.6-2.8 2.9-4.3 5.8-4.3s5.2 1.5 5.8 4.3"
          />
        </>
      )}
    </svg>
  );
}

function IconStudio(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" {...props}>
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        d="M4 7.5h16v11H4zM8 7.5V5.2A2.2 2.2 0 0 1 10.2 3h3.6A2.2 2.2 0 0 1 16 5.2V7.5"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M9 12.5h6M9 16h4"
      />
    </svg>
  );
}

function IconSun(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M5.2 18.8l1.6-1.6M17.2 6.8l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMoon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M18.5 14.2A7.2 7.2 0 0 1 9.8 5.5 7.4 7.4 0 1 0 18.5 14.2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThemeToggle() {
  const t = useTranslations();
  const { resolvedDark, setMode } = useThemeSettings();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={resolvedDark}
      aria-label={
        resolvedDark ? t("profileThemeLight") : t("profileThemeDark")
      }
      title={resolvedDark ? t("profileThemeLight") : t("profileThemeDark")}
      onClick={() => setMode(resolvedDark ? "light" : "dark")}
      className="relative flex h-8 w-[3.75rem] shrink-0 items-center rounded-full bg-ink/[0.06] p-0.5 transition-colors hover:bg-ink/[0.1] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
    >
      <span
        className={`absolute top-0.5 h-7 w-7 rounded-full bg-sheet shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition-transform duration-200 ease-out ${
          resolvedDark ? "translate-x-[1.55rem]" : "translate-x-0"
        }`}
      />
      <span
        className={`relative z-10 flex h-7 w-7 items-center justify-center transition-colors ${
          !resolvedDark ? "text-ink" : "text-muted"
        }`}
      >
        <IconSun width={14} height={14} />
      </span>
      <span
        className={`relative z-10 flex h-7 w-7 items-center justify-center transition-colors ${
          resolvedDark ? "text-ink" : "text-muted"
        }`}
      >
        <IconMoon width={14} height={14} />
      </span>
    </button>
  );
}

const ROLE_KEY: Record<UserRole, string> = {
  guest: "roleGuest",
  student: "roleStudent",
  agent: "roleAgent",
  instructor: "roleInstructor",
  manager: "roleManager",
  admin: "roleAdmin",
};

function IconBell({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" {...props}>
      <path
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.8}
        strokeLinejoin="round"
        d="M6 9.5a6 6 0 1 1 12 0c0 3.2 1.2 4.6 1.8 5.2.4.4.2 1.3-.6 1.3H4.8c-.8 0-1-.9-.6-1.3.6-.6 1.8-2 1.8-5.2Z"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M10 18.5a2 2 0 0 0 4 0"
      />
    </svg>
  );
}

function IconCommand(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M10 10V7.5a2.5 2.5 0 1 0-2.5 2.5H10Zm0 0v4m0-4h4m-4 4v2.5a2.5 2.5 0 1 1-2.5-2.5H10Zm0 0h4m0 0h2.5a2.5 2.5 0 1 0-2.5-2.5V14Zm0 0v-4m0 0V7.5A2.5 2.5 0 1 1 16.5 10H14Z"
      />
    </svg>
  );
}

const NAV = [
  {
    href: "/home",
    key: "navHome" as const,
    Icon: IconHome,
    badge: "forum" as const,
  },
  {
    href: "/chats",
    key: "navChats" as const,
    Icon: IconChat,
    badge: "unread" as const,
  },
  { href: "/ai", key: "navAi" as const, Icon: IconAi },
  { href: "/academy", key: "navAcademy" as const, Icon: IconSchool },
  {
    href: "/notifications",
    key: "navNotifications" as const,
    Icon: IconBell,
    badge: "notifs" as const,
  },
  { href: "/profile", key: "navProfile" as const, Icon: IconPerson },
];

function useShellStats(profile: UserProfile | null) {
  const { learningCount } = useEnrollments();
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);
  const [forumUnread, setForumUnread] = useState(0);
  const [newThreads, setNewThreads] = useState(0);
  const [pushToast, setPushToast] = useState<PushToast | null>(null);

  const uid =
    profile && !profile.isAnonymous ? profile.uid : null;

  useVisibleSubscription(
    Boolean(uid),
    () => {
      if (!uid) return () => undefined;
      return watchInbox(
        uid,
        (chats) => {
          const sum = chats.reduce(
            (acc, chat) => acc + (chat.unreadCounts[uid] ?? 0),
            0,
          );
          setUnreadTotal(sum);
        },
        () => setUnreadTotal(0),
      );
    },
    [uid],
  );

  useVisibleSubscription(
    Boolean(uid),
    () => {
      if (!uid) return () => undefined;
      return watchNotificationState(
        uid,
        (state) => {
          setNotifUnread(state.unreadCount);
          setForumUnread(state.unreadForumCount);
          void countNewFeedThreads(state.lastFeedSeenAt).then(setNewThreads);
        },
        () => {
          setNotifUnread(0);
          setForumUnread(0);
        },
      );
    },
    [uid],
  );

  useEffect(() => {
    if (!uid) {
      setUnreadTotal(0);
      setNotifUnread(0);
      setForumUnread(0);
      setNewThreads(0);
      return;
    }

    let pushTimer: ReturnType<typeof setTimeout> | undefined;
    let pushIdle: number | undefined;
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      pushIdle = window.requestIdleCallback(() => {
        void registerWebPushToken(uid).catch(() => undefined);
      });
    } else {
      pushTimer = setTimeout(() => {
        void registerWebPushToken(uid).catch(() => undefined);
      }, 1500);
    }

    let stopForeground: (() => void) | undefined;
    let toastTimer: ReturnType<typeof setTimeout> | undefined;
    void listenForegroundMessages((title, body) => {
      setPushToast({ title, body, id: Date.now() });
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => setPushToast(null), 5000);
    }).then((stop) => {
      stopForeground = stop ?? undefined;
    });

    return () => {
      stopForeground?.();
      if (toastTimer) clearTimeout(toastTimer);
      if (pushIdle !== undefined && typeof window !== "undefined") {
        window.cancelIdleCallback(pushIdle);
      }
      if (pushTimer) clearTimeout(pushTimer);
    };
  }, [uid]);

  const forumBadge = forumUnread + newThreads;

  return { unreadTotal, learningCount, notifUnread, forumBadge, pushToast };
}

function formatBadge(n: number) {
  if (n <= 0) return null;
  return n > 99 ? "99+" : String(n);
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [supportBusy, setSupportBusy] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const { unreadTotal, learningCount, notifUnread, forumBadge, pushToast } =
    useShellStats(profile);

  const name = useMemo(
    () => (profile ? headlineName(profile) : ""),
    [profile],
  );
  const initial = useMemo(() => {
    const trimmed = name.trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
  }, [name]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (profile && !profile.profileCompleted && !profile.isAnonymous) {
      router.replace("/complete-profile");
    }
  }, [loading, user, profile, router]);

  useEffect(() => {
    if (!profile || profile.isAnonymous) return;
    if (pathname === "/home" || pathname.startsWith("/home/")) {
      void markFeedSeen(profile.uid);
    }
  }, [pathname, profile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openSupport = async () => {
    if (!profile || supportBusy || profile.isAnonymous) return;
    setSupportBusy(true);
    try {
      const chat = await getOrCreateSupportChat(
        profile,
        "Support Assistant",
        "Hi — how can we help?",
      );
      router.push(`/chats/${chat.id}`);
    } catch (error) {
      console.error(error);
    } finally {
      setSupportBusy(false);
    }
  };

  if (loading || !user) {
    return <AppShellSkeleton />;
  }

  if (!profile) {
    return <AppShellSkeleton />;
  }

  if (
    profile.accountStatus === "deactivated" ||
    profile.accountStatus === "pendingDeletion"
  ) {
    return <AccountGate profile={profile} />;
  }

  const isAuthor = canAuthorCourses(profile.role);
  const unreadLabel = formatBadge(unreadTotal);
  const forumLabel = formatBadge(forumBadge);
  const notifLabel = formatBadge(notifUnread);
  const onChats =
    pathname === "/chats" || pathname.startsWith("/chats/");

  const badgeFor = (kind: "unread" | "forum" | "notifs" | undefined) => {
    if (kind === "unread") return unreadLabel;
    if (kind === "forum") return forumLabel;
    if (kind === "notifs") return notifLabel;
    return null;
  };

  return (
    <div className="mesh-bg flex h-[100svh] flex-col overflow-hidden lg:flex-row">
      <aside className="hidden h-full w-72 shrink-0 flex-col border-r border-glass-border bg-sheet lg:flex">
        <div className="border-b border-glass-border px-3 pb-3 pt-3.5">
          <div className="flex items-center justify-between gap-2 px-1">
            <Link
              href="/home"
              className="font-display text-lg font-bold tracking-tight transition-opacity hover:opacity-80"
            >
              {t("brandShort")}
            </Link>
            <ThemeToggle />
          </div>
          {isAuthor ? (
            <div className="mt-2 px-1">
              <AppSwitcher current="pulse" compact />
            </div>
          ) : null}
          <Link
            href="/profile"
            className="mt-3 flex items-center gap-2.5 rounded-xl bg-ink/[0.035] px-2.5 py-2 transition hover:bg-ink/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 font-display text-sm font-bold text-brand"
              aria-hidden
            >
              {profile.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- tiny shell chip; next/image adds layout cost
                <img
                  src={profile.photoUrl}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                  width={36}
                  height={36}
                  decoding="async"
                />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">
                {name}
              </p>
              <span className="mt-1 inline-flex rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                {t(ROLE_KEY[profile.role])}
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3" aria-label="Primary">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.Icon;
            const badge = badgeFor(item.badge);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm font-medium transition duration-200 ${
                  active
                    ? "bg-brand/10 text-ink shadow-[inset_3px_0_0_0_var(--brand)]"
                    : "text-muted hover:bg-ink/[0.04] hover:text-ink dark:hover:bg-white/[0.05]"
                }`}
              >
                <Icon
                  filled={active}
                  className={`shrink-0 transition-transform duration-200 ${
                    active
                      ? "scale-105 text-brand"
                      : "text-muted group-hover:text-ink"
                  }`}
                  width={20}
                  height={20}
                />
                <span className="min-w-0 flex-1 truncate">{t(item.key)}</span>
                {badge && (
                  <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-on-brand">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
          {isAuthor && (
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  const user = getFirebaseAuth().currentUser;
                  if (!user) return;
                  const idToken = await user.getIdToken();
                  const consume = ssoConsumeUrl("studio", locale, "/");
                  window.location.assign(
                    await buildSsoHandoffUrl(consume, idToken),
                  );
                })();
              }}
              className="group relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-sm font-medium text-muted transition duration-200 hover:bg-ink/[0.04] hover:text-ink dark:hover:bg-white/[0.05]"
            >
              <IconStudio
                className="shrink-0 text-muted transition-transform duration-200 group-hover:text-ink"
                width={20}
                height={20}
              />
              <span className="min-w-0 flex-1 truncate">{t("studioTitle")}</span>
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                aria-hidden
              />
            </button>
          )}
        </nav>

        <div className="mt-auto space-y-2.5 border-t border-glass-border px-2.5 py-3">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-xl bg-ink/[0.035] px-2.5 py-2 dark:bg-white/[0.04]">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                {t("navStatUnreadShort")}
              </p>
              <p className="mt-1 font-display text-xl font-bold tabular-nums leading-none">
                {unreadTotal}
              </p>
            </div>
            <div className="rounded-xl bg-ink/[0.035] px-2.5 py-2 dark:bg-white/[0.04]">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                {t("navStatLearningShort")}
              </p>
              <p className="mt-1 font-display text-xl font-bold tabular-nums leading-none">
                {learningCount}
              </p>
            </div>
          </div>

          {!profile.isAnonymous && (
            <button
              type="button"
              disabled={supportBusy}
              onClick={() => void openSupport()}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium text-muted transition hover:bg-ink/[0.04] hover:text-ink disabled:opacity-60 dark:hover:bg-white/[0.05]"
            >
              <IconChat width={18} height={18} />
              {t("navSupport")}
            </button>
          )}

          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium text-muted transition hover:bg-ink/[0.04] hover:text-ink dark:hover:bg-white/[0.05]"
          >
            <IconCommand width={18} height={18} />
            <span className="min-w-0 flex-1 truncate text-left">
              {t("navCommand")}
            </span>
            <kbd className="rounded-md border border-glass-border px-1.5 py-0.5 text-[10px] font-semibold text-muted">
              ⌘K
            </kbd>
          </button>

          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() =>
              void signOutEverywhere({
                current: "pulse",
                locale,
                returnPath: "/login",
              })
            }
          >
            {t("navLogout")}
          </Button>
        </div>
      </aside>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-end px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px)+0.35rem)] lg:hidden">
          <div className="pointer-events-auto">
            <ThemeToggle />
          </div>
        </div>

        {profile.isAnonymous && (
          <div className="shrink-0 border-b border-brand/30 bg-brand/10 px-4 py-1.5 text-xs text-ink">
            {t("guestBanner")}{" "}
            <Link href="/login" className="font-semibold text-brand underline">
              {t("navLogin")}
            </Link>
          </div>
        )}

        {pushToast && (
          <div
            role="status"
            className="pointer-events-none absolute inset-x-0 top-14 z-40 flex justify-center px-4 lg:top-4"
          >
            <div className="pointer-events-auto pulse-sheet max-w-md px-4 py-3 shadow-lg">
              <p className="text-sm font-semibold">{pushToast.title}</p>
              {pushToast.body ? (
                <p className="mt-0.5 text-xs text-muted">{pushToast.body}</p>
              ) : null}
              <Link
                href="/notifications"
                className="mt-2 inline-block text-xs font-semibold text-brand"
              >
                {t("navNotifications")}
              </Link>
            </div>
          </div>
        )}

        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-[calc(48px+env(safe-area-inset-bottom,0px)+16px)] lg:pb-0">
          {children}
        </main>
      </div>

      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+4px)] pt-1.5 lg:hidden"
        aria-label="Primary"
      >
        <div className="pointer-events-auto pulse-tab-pill mx-auto flex max-w-lg items-center px-0.5 py-0.5">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.Icon;
            const badge = badgeFor(item.badge);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex h-10 flex-1 items-center justify-center gap-1 rounded-xl transition ${
                  active
                    ? "max-w-[7rem] flex-[1.2] bg-brand/10 text-ink"
                    : "text-muted"
                }`}
                aria-current={active ? "page" : undefined}
                aria-label={t(item.key)}
              >
                <Icon
                  filled={active}
                  className={active ? "text-brand" : "text-muted"}
                  width={20}
                  height={20}
                />
                {active && (
                  <span className="truncate text-[11px] font-semibold tracking-tight">
                    {t(item.key)}
                  </span>
                )}
                {badge && (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-brand" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {!profile.isAnonymous && !onChats && (
        <button
          type="button"
          disabled={supportBusy}
          aria-label={t("profileSupport")}
          title={t("chatsSupport")}
          onClick={() => void openSupport()}
          className="fixed z-50 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-on-brand shadow-lg transition hover:brightness-110 disabled:opacity-60 right-4 bottom-[calc(52px+env(safe-area-inset-bottom,0px)+12px)] lg:hidden"
        >
          <IconChat filled width={22} height={22} />
        </button>
      )}

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
