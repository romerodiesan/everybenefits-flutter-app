"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type SVGProps,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { canAccessAdmin, headlineName } from "@pulse/shared";
import { signOutEverywhere } from "@/lib/firebase/auth";
import { CommandPalette } from "@/components/chrome/command-palette";
import { AppSwitcher } from "@/components/chrome/app-switcher";
import { AdminShellSkeleton } from "@/components/chrome/admin-shell-skeleton";
import { Button } from "@pulse/ui";
import type { UserRole } from "@/lib/types";
import {
  hasSsoAttempted,
  markSsoAttempted,
  ssoBridgeUrl,
  ssoConsumeUrl,
} from "@pulse/sso/client";

const PULSE_URL =
  process.env.NEXT_PUBLIC_PULSE_WEB_URL ?? "http://localhost:3000";

const ROLE_KEY: Record<UserRole, string> = {
  guest: "roleGuest",
  student: "roleStudent",
  agent: "roleAgent",
  instructor: "roleInstructor",
  manager: "roleManager",
  admin: "roleAdmin",
};

type IconProps = SVGProps<SVGSVGElement> & { filled?: boolean };

function IconOverview({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      {filled ? (
        <path
          fill="currentColor"
          d="M4 19.5h16v-2H4v2Zm2.5-3.5h3V8h-3v8Zm5 0h3V5h-3v11Zm5 0h3v-6h-3v6Z"
        />
      ) : (
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 19h16M7 16V9m5 7V5m5 11v-4"
        />
      )}
    </svg>
  );
}

function IconUsers({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.15 : 0}
        d="M16 19v-1.2A3.8 3.8 0 0 0 12.2 14H7.8A3.8 3.8 0 0 0 4 17.8V19M14.5 8.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM20 19v-1.1a3 3 0 0 0-2.2-2.9M17.5 5.2a3 3 0 0 1 0 5.6"
      />
    </svg>
  );
}

function IconOrg({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.12 : 0}
        d="M12 4v6m0 0H8.5A1.5 1.5 0 0 0 7 11.5V14m5-4h3.5A1.5 1.5 0 0 1 17 11.5V14M7 14v4.5A1.5 1.5 0 0 0 8.5 20h1M17 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-1M12 10v10"
      />
    </svg>
  );
}

function IconApprovals({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      {filled ? (
        <path
          fill="currentColor"
          d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19Zm-.7 13.2-3.5-3.5 1.4-1.4 2.1 2.1 4.3-4.3 1.4 1.4-5.7 5.7Z"
        />
      ) : (
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM8.5 12.2l2.3 2.3 4.7-4.7"
        />
      )}
    </svg>
  );
}

function IconSettings({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.12 : 0}
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM4.5 12.8v-1.6l1.7-.4a6.6 6.6 0 0 1 .6-1.4l-1-1.5 1.1-1.1 1.5 1a6.6 6.6 0 0 1 1.4-.6l.4-1.7h1.6l.4 1.7c.5.1 1 .3 1.4.6l1.5-1 1.1 1.1-1 1.5c.3.4.5.9.6 1.4l1.7.4v1.6l-1.7.4a6.6 6.6 0 0 1-.6 1.4l1 1.5-1.1 1.1-1.5-1a6.6 6.6 0 0 1-1.4.6l-.4 1.7H11l-.4-1.7a6.6 6.6 0 0 1-1.4-.6l-1.5 1-1.1-1.1 1-1.5a6.6 6.6 0 0 1-.6-1.4L4.5 12.8Z"
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

export function AdminShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const locale = useLocale();
  const { user, profile, loading, profileLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [ssoRedirecting, setSsoRedirecting] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const role = profile?.role ?? "guest";
  const allowed = canAccessAdmin(role);
  const blocked =
    profile?.accountStatus === "deactivated" ||
    profile?.accountStatus === "pendingDeletion";

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
      if (!hasSsoAttempted()) {
        markSsoAttempted();
        setSsoRedirecting(true);
        const next = pathname || "/";
        const consume = ssoConsumeUrl("admin", locale, next);
        window.location.replace(ssoBridgeUrl("pulse", locale, consume));
        return;
      }
      router.replace("/login");
      return;
    }
    if (profile && !allowed && !blocked) {
      router.replace("/no-access");
    }
  }, [loading, user, profile, allowed, blocked, router, locale, pathname]);

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

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  const nav = useMemo(
    () => [
      {
        href: "/",
        label: t("navOverview"),
        match: (p: string) => p === "/",
        Icon: IconOverview,
      },
      {
        href: "/users",
        label: t("navUsers"),
        match: (p: string) => p.startsWith("/users"),
        Icon: IconUsers,
      },
      {
        href: "/organizations",
        label: t("navOrganizations"),
        match: (p: string) => p.startsWith("/organizations"),
        Icon: IconOrg,
      },
      {
        href: "/approvals",
        label: t("navApprovals"),
        match: (p: string) => p.startsWith("/approvals"),
        Icon: IconApprovals,
      },
      {
        href: "/notifications",
        label: t("navNotifications"),
        match: (p: string) => p.startsWith("/notifications"),
        adminOnly: true,
        Icon: IconApprovals,
      },
      {
        href: "/settings",
        label: t("navSettings"),
        match: (p: string) => p.startsWith("/settings"),
        adminOnly: true,
        Icon: IconSettings,
      },
    ],
    [t],
  );

  if (loading || ssoRedirecting || !user || (!profile && profileLoading)) {
    return (
      <AdminShellSkeleton
        hint={
          ssoRedirecting
            ? t("ssoChecking")
            : profileLoading
              ? t("bootPreparing")
              : t("loading")
        }
      />
    );
  }

  if (!profile) {
    return <AdminShellSkeleton hint={t("bootPreparing")} />;
  }

  if (blocked) {
    return (
      <div className="admin-bg flex min-h-screen items-center justify-center p-6">
        <div className="admin-panel max-w-md p-8 text-center">
          <h1 className="font-display text-2xl">
            {profile.accountStatus === "pendingDeletion"
              ? t("gateDeletionTitle")
              : t("gateDeactivatedTitle")}
          </h1>
          <p className="mt-3 text-sm text-muted">{t("gateBody")}</p>
          <a
            href={PULSE_URL}
            className="mt-6 inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand"
          >
            {t("noAccessCta")}
          </a>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  const isPlatformAdmin = role === "admin";
  const visibleNav = nav.filter((item) => !item.adminOnly || isPlatformAdmin);

  return (
    <div className="admin-bg flex h-[100svh] overflow-hidden">
      {navOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-[min(18rem,88vw)] shrink-0 flex-col border-r border-glass-border bg-sheet transition-transform duration-200 lg:static lg:z-auto lg:w-72 lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="border-b border-glass-border px-3 pb-3 pt-[max(0.875rem,env(safe-area-inset-top,0px)+0.5rem)] lg:pt-3.5">
          <div className="flex items-center justify-between gap-2 px-1">
            <AppSwitcher current="admin" role={profile.role} />
            <button
              type="button"
              className="rounded-lg p-2 text-muted hover:bg-ink/[0.05] hover:text-ink lg:hidden"
              aria-label="Close menu"
              onClick={() => setNavOpen(false)}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-ink/[0.035] px-2.5 py-2 dark:bg-white/[0.04]">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 font-display text-sm font-bold text-brand"
              aria-hidden
            >
              {profile.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.photoUrl}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
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
          </div>
        </div>

        <nav
          className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3"
          aria-label="Primary"
        >
          {visibleNav.map((item) => {
            const active = item.match(pathname);
            const Icon = item.Icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setNavOpen(false)}
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
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2.5 border-t border-glass-border px-2.5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] lg:pb-3">
          <button
            type="button"
            onClick={() => {
              setNavOpen(false);
              setCmdOpen(true);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium text-muted transition hover:bg-ink/[0.04] hover:text-ink dark:hover:bg-white/[0.05]"
          >
            <IconCommand width={18} height={18} />
            <span className="min-w-0 flex-1 truncate text-left">
              {t("navCommand")}
            </span>
            <kbd className="hidden rounded-md border border-glass-border px-1.5 py-0.5 text-[10px] font-semibold text-muted sm:inline">
              ⌘K
            </kbd>
          </button>

          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() =>
              void signOutEverywhere({
                current: "admin",
                locale,
                returnPath: "/login",
              })
            }
          >
            {t("navSignOut")}
          </Button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-2 border-b border-glass-border px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top,0px)+0.35rem)] lg:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-muted hover:bg-ink/[0.05] hover:text-ink"
            aria-label="Open menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <AppSwitcher current="admin" role={profile.role} />
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-muted hover:bg-ink/[0.05] hover:text-ink"
            aria-label={t("navCommand")}
            onClick={() => setCmdOpen(true)}
          >
            <IconCommand width={20} height={20} />
          </button>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom,0px))] lg:pb-0">
          {children}
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-glass-border bg-sheet/95 px-1 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md lg:hidden"
          aria-label="Primary"
        >
          <div className="mx-auto flex max-w-lg items-stretch overflow-x-auto">
            {visibleNav.map((item) => {
              const active = item.match(pathname);
              const Icon = item.Icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                  className={`flex h-12 min-w-[4.25rem] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold ${
                    active ? "text-brand" : "text-muted"
                  }`}
                >
                  <Icon filled={active} width={20} height={20} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
