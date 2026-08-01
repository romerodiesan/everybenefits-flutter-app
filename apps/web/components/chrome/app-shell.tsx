"use client";

import {
  startTransition,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { hasPasswordProvider } from "@/lib/firebase/auth";
import { getOrCreateSupportChat, watchChatUnreadTotal } from "@/lib/firebase/chats";
import {
  listenForegroundMessages,
  markFeedSeen,
  registerWebPushToken,
  watchNotificationState,
} from "@/lib/firebase/notifications";
import { canAccessTools, canAccessSupport, headlineName } from "@/lib/roles";
import { useVisibleSubscription } from "@/lib/hooks/use-visible-subscription";
import { usePulseAiEnabled } from "@/lib/hooks/use-pulse-ai-enabled";
import type { UserProfile } from "@/lib/types";
import { ProductTour } from "@/components/chrome/product-tour";
import { AppShellGates } from "@/components/chrome/app-shell-gates";
import {
  AppShellBottomNav,
  AppShellMobileTopBar,
  AppShellSideNav,
  AppShellSupportFab,
  NAV,
  formatBadge,
} from "@/components/chrome/app-shell-nav";
import dynamic from "next/dynamic";

const CommandPalette = dynamic(
  () =>
    import("@/components/chrome/command-palette").then((m) => m.CommandPalette),
  { ssr: false },
);

type PushToast = { title: string; body: string; id: number };

function useShellStats(profile: UserProfile | null) {
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
      return watchChatUnreadTotal(
        uid,
        (total) => setUnreadTotal(total),
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
          // Server-owned forum unread; avoid counting all threads client-side.
          setForumUnread(state.unreadForumCount);
          setNewThreads(0);
        },
        () => {
          setNotifUnread(0);
          setForumUnread(0);
          setNewThreads(0);
        },
      );
    },
    [uid],
  );

  useEffect(() => {
    if (!uid) {
      startTransition(() => {
        setUnreadTotal(0);
        setNotifUnread(0);
        setForumUnread(0);
        setNewThreads(0);
      });
      return;
    }

    let stopPresence: (() => void) | undefined;
    void import("@/lib/firebase/presence").then(({ startPresence }) => {
      void startPresence(uid).then((stop) => {
        stopPresence = stop;
      });
    });

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
      stopPresence?.();
      stopForeground?.();
      if (toastTimer) clearTimeout(toastTimer);
      if (pushIdle !== undefined && typeof window !== "undefined") {
        window.cancelIdleCallback(pushIdle);
      }
      if (pushTimer) clearTimeout(pushTimer);
    };
  }, [uid]);

  const forumBadge = forumUnread + newThreads;

  return { unreadTotal, notifUnread, forumBadge, pushToast };
}


export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, profileLoading, refreshProfile } = useAuth();
  const pulseAiEnabled = usePulseAiEnabled();
  const [supportBusy, setSupportBusy] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const { unreadTotal, notifUnread, forumBadge, pushToast } =
    useShellStats(profile);

  const navItems = useMemo(
    () => NAV.filter((item) => item.href !== "/ai" || pulseAiEnabled),
    [pulseAiEnabled],
  );
  const toolsAllowed = Boolean(profile && canAccessTools(profile.role));
  const toolsActive = pathname === "/tools" || pathname.startsWith("/tools/");

  useEffect(() => {
    if (toolsActive) setToolsOpen(true);
  }, [toolsActive]);

  const name = useMemo(
    () => (profile ? headlineName(profile) : ""),
    [profile],
  );
  const initial = useMemo(() => {
    const trimmed = name.trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
  }, [name]);

  // Profile field remediation runs only after login/register/set-password —
  // not on every AppShell mount (slim session cache would false-trigger).
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.isAnonymous && !hasPasswordProvider() && user.email) {
      router.replace("/set-password");
    }
  }, [loading, user, router]);

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
    if (
      !profile ||
      supportBusy ||
      !canAccessSupport(profile.role, profile.isAnonymous)
    ) {
      return;
    }
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

  return (
    <AppShellGates loading={loading} user={user} profile={profile}>
      {(gatedProfile) => {
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
            <AppShellSideNav
              profile={gatedProfile}
              name={name}
              initial={initial}
              navItems={navItems}
              toolsAllowed={toolsAllowed}
              toolsActive={toolsActive}
              toolsOpen={toolsOpen}
              setToolsOpen={setToolsOpen}
              badgeFor={badgeFor}
              supportBusy={supportBusy}
              openSupport={() => void openSupport()}
              setCmdOpen={setCmdOpen}
            />

            <div className="relative flex min-h-0 flex-1 flex-col">
              <AppShellMobileTopBar role={gatedProfile.role} />

              {gatedProfile.isAnonymous && (
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

              <main
                className={`flex min-h-0 flex-1 flex-col pt-[max(3.5rem,env(safe-area-inset-top,0px)+2.85rem)] pb-[calc(48px+env(safe-area-inset-bottom,0px)+16px)] lg:pt-0 lg:pb-0 ${
                  onChats ? "overflow-hidden" : "overflow-y-auto"
                }`}
              >
                {children}
              </main>
            </div>

            <AppShellBottomNav
              navItems={navItems}
              toolsAllowed={toolsAllowed}
              toolsActive={toolsActive}
              mobileToolsOpen={mobileToolsOpen}
              setMobileToolsOpen={setMobileToolsOpen}
              badgeFor={badgeFor}
            />

            {canAccessSupport(gatedProfile.role, gatedProfile.isAnonymous) && !onChats && (
              <AppShellSupportFab
                supportBusy={supportBusy}
                openSupport={() => void openSupport()}
              />
            )}

            <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
            <ProductTour
              profile={gatedProfile}
              pulseAiEnabled={pulseAiEnabled}
              profileReady={!profileLoading}
              onCompleted={() => {
                void refreshProfile();
              }}
            />
          </div>
        );
      }}
    </AppShellGates>
  );
}
