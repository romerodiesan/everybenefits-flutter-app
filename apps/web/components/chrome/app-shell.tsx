"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useAuth, useAccess } from "@/lib/providers/auth-provider";
import { useThemeSettings } from "@/lib/providers/theme-provider";
import { signOutAndRedirect, hasPasswordProvider } from "@/lib/firebase/auth";
import { markFeedSeen } from "@/lib/firebase/notifications";
import { headlineName } from "@/lib/display-name";
import { canAccessTools, isUserApproved, needsProfileCompletion } from "@/lib/roles";
import { hasTrustedShellCache } from "@/lib/profile-cache";
import { nextQuery, resolvePostAuthDestination } from "@/lib/auth-redirect";

import { AGENT_TOOLS } from "@/lib/tools/catalog";
import { AppSwitcher } from "@/components/chrome/app-switcher";
import type { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/primitives";
import { AccountGate } from "@/components/chrome/account-gate";
import { PendingApprovalGate } from "@/components/chrome/pending-approval-gate";
import { AppShellSkeleton } from "@/components/chrome/app-shell-skeleton";
import { LegalLinks } from "@/components/chrome/legal-links";
import {
  IconCommand,
  IconMoon,
  IconSun,
  IconTools,
} from "@/components/chrome/shell-icons";
import { NAV, formatBadge } from "@/components/chrome/shell-nav";
import { useShellStats } from "@/components/chrome/use-shell-stats";
import dynamic from "next/dynamic";

const ProductTour = dynamic(
  () =>
    import("@/components/chrome/product-tour").then((m) => m.ProductTour),
  { ssr: false },
);

const CommandPalette = dynamic(
  () =>
    import("@/components/chrome/command-palette").then((m) => m.CommandPalette),
  { ssr: false },
);

function ThemeToggle() {
  const t = useTranslations();
  const { mode, resolvedDark, setMode } = useThemeSettings();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={resolvedDark}
      aria-label={
        resolvedDark ? t("profileThemeLight") : t("profileThemeDark")
      }
      title={resolvedDark ? t("profileThemeLight") : t("profileThemeDark")}
      onClick={() => {
        // Explicit light/dark — leave "system" only from Appearance settings.
        setMode(resolvedDark ? "light" : "dark");
      }}
      className="relative flex h-8 w-[3.75rem] shrink-0 items-center rounded-full bg-ink/[0.06] p-0.5 transition-colors hover:bg-ink/[0.1] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
    >
      <span
        className={`absolute top-0.5 left-0.5 h-7 w-7 rounded-full bg-sheet shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition-transform duration-200 ease-out ${
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
      <span className="sr-only">{mode}</span>
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
  system: "roleSystem",
};

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, permissions, loading, profileLoading, refreshProfile } = useAuth();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const { unreadTotal, notifUnread, forumBadge, pushToast } =
    useShellStats(profile);

  const access = useAccess();
  const navItems = NAV;
  const toolsAllowed = Boolean(profile && canAccessTools(access));
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

  // Incomplete registration — only after Firestore profile is confirmed.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      const search =
        typeof window !== "undefined" ? window.location.search : "";
      const path = `${pathname}${search}`;
      const next =
        pathname &&
        pathname !== "/" &&
        !pathname.startsWith("/login") &&
        !pathname.startsWith("/register")
          ? path
          : null;
      router.replace(`/login${nextQuery(next)}`);
      return;
    }
    // Wait for profile hydrate before deciding set-password / complete-profile.
    if (profileLoading) return;
    const dest = resolvePostAuthDestination({
      user,
      profile,
      next: `${pathname}${typeof window !== "undefined" ? window.location.search : ""}`,
      hasPassword: hasPasswordProvider(user),
    });
    if (dest.kind === "set-password") {
      router.replace(dest.path);
      return;
    }
    if (
      dest.kind === "complete-profile" &&
      profile &&
      !hasTrustedShellCache(profile.uid)
    ) {
      router.replace(dest.path);
    }
  }, [loading, profileLoading, user, profile, router, pathname]);

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

  // Incomplete signup — only after hydrate (cache strips NPN/address).
  if (
    !profileLoading &&
    !profile.isAnonymous &&
    needsProfileCompletion(profile) &&
    !hasTrustedShellCache(profile.uid)
  ) {
    return <AppShellSkeleton />;
  }

  if (!profile.isAnonymous && !isUserApproved(profile.approvalStatus)) {
    // Wait for Firestore before locking into the pending-approval screen.
    if (profileLoading) {
      return <AppShellSkeleton />;
    }
    return <PendingApprovalGate />;
  }

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
          <div className="flex items-center justify-between gap-2 px-1" data-tour="shell-apps">
            <AppSwitcher current="pulse" permissions={access} />
            <ThemeToggle />
          </div>
          <Link
            href="/account"
            data-tour="nav-profile"
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
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.Icon;
            const badge = badgeFor(item.badge);
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  data-tour={
                    item.href === "/home"
                      ? "nav-home"
                      : item.href === "/chats"
                        ? "nav-chats"
                        : item.href === "/academy"
                          ? "nav-academy"
                          : item.href === "/account"
                            ? "nav-profile"
                            : undefined
                  }
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
                {item.href === "/academy" && toolsAllowed ? (
                  <div className="mt-0.5">
                    <button
                      type="button"
                      aria-expanded={toolsOpen}
                      onClick={() => setToolsOpen((v) => !v)}
                      className={`group relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm font-medium transition duration-200 ${
                        toolsActive
                          ? "bg-brand/10 text-ink shadow-[inset_3px_0_0_0_var(--brand)]"
                          : "text-muted hover:bg-ink/[0.04] hover:text-ink dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      <IconTools
                        filled={toolsActive}
                        className={`shrink-0 ${
                          toolsActive
                            ? "text-brand"
                            : "text-muted group-hover:text-ink"
                        }`}
                        width={20}
                        height={20}
                      />
                      <span className="min-w-0 flex-1 truncate text-left">
                        {t("navTools")}
                      </span>
                      <svg
                        viewBox="0 0 20 20"
                        className={`h-4 w-4 shrink-0 text-muted transition ${
                          toolsOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d="M5 7.5 10 12.5 15 7.5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    {toolsOpen ? (
                      <ul className="ml-4 space-y-0.5 border-l border-glass-border py-0.5 pl-2">
                        {AGENT_TOOLS.map((tool) => {
                          const toolActive =
                            pathname === tool.href ||
                            pathname.startsWith(`${tool.href}/`);
                          return (
                            <li key={tool.id}>
                              <Link
                                href={tool.href}
                                aria-current={toolActive ? "page" : undefined}
                                className={`block rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                                  toolActive
                                    ? "bg-brand/10 text-brand"
                                    : "text-muted hover:bg-ink/[0.04] hover:text-ink dark:hover:bg-white/[0.05]"
                                }`}
                              >
                                {t(tool.titleKey)}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2.5 border-t border-glass-border px-2.5 py-3">
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
              void signOutAndRedirect({
                current: "pulse",
                locale,
                returnPath: "/login",
              })
            }
          >
            {t("navLogout")}
          </Button>

          <LegalLinks compact className="px-2.5 pt-1" />
        </div>
      </aside>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top,0px)+0.35rem)] lg:hidden">
          <div className="pointer-events-auto min-w-0" data-tour="shell-apps">
            <AppSwitcher current="pulse" permissions={access} />
          </div>
          <div className="pointer-events-auto shrink-0">
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

        <main
          className={`flex min-h-0 flex-1 flex-col pt-[max(3.5rem,env(safe-area-inset-top,0px)+2.85rem)] pb-[calc(48px+env(safe-area-inset-bottom,0px)+16px)] lg:pt-0 lg:pb-0 ${
            onChats ? "overflow-hidden" : "overflow-y-auto"
          }`}
        >
          {children}
        </main>
      </div>

      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+4px)] pt-1.5 lg:hidden"
        aria-label="Primary"
      >
        <div className="pointer-events-auto pulse-tab-pill relative mx-auto flex max-w-lg items-center px-0.5 py-0.5">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.Icon;
            const badge = badgeFor(item.badge);
            return (
              <Fragment key={item.href}>
                <Link
                  href={item.href}
                  data-tour={
                    item.href === "/home"
                      ? "nav-home"
                      : item.href === "/chats"
                        ? "nav-chats"
                        : item.href === "/academy"
                          ? "nav-academy"
                          : item.href === "/account"
                            ? "nav-profile"
                            : undefined
                  }
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
                    <span className="hidden truncate text-[11px] font-semibold tracking-tight min-[390px]:inline">
                      {t(item.key)}
                    </span>
                  )}
                  {badge && (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-brand" />
                  )}
                </Link>
                {item.href === "/academy" && toolsAllowed ? (
                  <div className="relative flex flex-1 items-stretch">
                    <button
                      type="button"
                      aria-label={t("navTools")}
                      aria-expanded={mobileToolsOpen}
                      onClick={() => setMobileToolsOpen((v) => !v)}
                      className={`relative flex h-10 w-full items-center justify-center gap-1 rounded-xl transition ${
                        toolsActive || mobileToolsOpen
                          ? "max-w-[7rem] flex-[1.2] bg-brand/10 text-ink"
                          : "text-muted"
                      }`}
                    >
                      <IconTools
                        filled={toolsActive}
                        className={
                          toolsActive || mobileToolsOpen
                            ? "text-brand"
                            : "text-muted"
                        }
                        width={20}
                        height={20}
                      />
                      {(toolsActive || mobileToolsOpen) && (
                        <span className="hidden truncate text-[11px] font-semibold tracking-tight min-[390px]:inline">
                          {t("navTools")}
                        </span>
                      )}
                    </button>
                    {mobileToolsOpen ? (
                      <>
                        <button
                          type="button"
                          aria-hidden
                          tabIndex={-1}
                          className="fixed inset-0 z-40 cursor-default bg-transparent"
                          onClick={() => setMobileToolsOpen(false)}
                        />
                        <ul className="pulse-sheet absolute bottom-[calc(100%+8px)] right-0 z-50 max-w-[calc(100vw-1.5rem)] min-w-[12.5rem] overflow-hidden py-1 shadow-lg sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
                          {AGENT_TOOLS.map((tool) => {
                            const toolActive =
                              pathname === tool.href ||
                              pathname.startsWith(`${tool.href}/`);
                            return (
                              <li key={tool.id}>
                                <Link
                                  href={tool.href}
                                  onClick={() => setMobileToolsOpen(false)}
                                  className={`block whitespace-nowrap px-3.5 py-2.5 text-left text-sm font-medium transition ${
                                    toolActive
                                      ? "bg-brand/10 text-brand"
                                      : "text-ink hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]"
                                  }`}
                                >
                                  {t(tool.titleKey)}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </Fragment>
            );
          })}
        </div>
      </nav>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      <ProductTour
        profile={profile}
        permissions={permissions}
        profileReady={!profileLoading}
        onCompleted={() => {
          void refreshProfile();
        }}
      />
    </div>
  );
}
