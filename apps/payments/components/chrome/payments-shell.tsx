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
import { useAuth, useAccess } from "@/lib/providers/auth-provider";
import { canAccessPayments, headlineName } from "@/lib/roles";
import { signOutAndRedirect } from "@/lib/firebase/auth";
import { AppSwitcher } from "@/components/chrome/app-switcher";
import { PaymentsShellSkeleton } from "@/components/chrome/payments-shell-skeleton";
import { Button } from "@/components/ui/primitives";
import { useThemeSettings } from "@/lib/providers/theme-provider";
import type { UserRole } from "@/lib/types";
import {
  hasSsoAttempted,
  markSsoAttempted,
  PULSE_ACCOUNT_PATH,
  resolveSwitchUrl,
  ssoBridgeUrl,
  ssoConsumeUrl,
} from "@/lib/sso";
import { getFirebaseAuth } from "@/lib/firebase/client";

const PULSE_URL =
  process.env.NEXT_PUBLIC_PULSE_WEB_URL ?? "http://localhost:3000";

const ROLE_KEY: Record<UserRole, string> = {
  guest: "roleGuest",
  student: "roleStudent",
  agent: "roleAgent",
  agency_owner: "roleAgencyOwner",
  instructor: "roleInstructor",
  manager: "roleManager",
  admin: "roleAdmin",
  system: "roleSystem",
};

type IconProps = SVGProps<SVGSVGElement> & { filled?: boolean };

function IconSun(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6"
      />
    </svg>
  );
}

function IconMoon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 14.2A7.4 7.4 0 0 1 9.8 4 7.5 7.5 0 1 0 20 14.2Z"
      />
    </svg>
  );
}

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

function IconPeople({ filled, ...props }: IconProps) {
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

function IconLink({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.12 : 0}
        d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 5.93M14 11a5 5 0 0 0-7.07 0L5.52 12.4a5 5 0 1 0 7.07 7.07L14 18.07"
      />
    </svg>
  );
}

function IconRates({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.12 : 0}
        d="M4 19h16M7 16V9m5 7V5m5 11v-4"
      />
    </svg>
  );
}

function IconCarrier({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.12 : 0}
        d="M4 20V8l8-4 8 4v12H4Z"
      />
    </svg>
  );
}

function IconStatement({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.12 : 0}
        d="M7 3.5h7l3 3V20.5H7z"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M9.5 11h5M9.5 14.5h5"
      />
    </svg>
  );
}

function IconRuns({ filled, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.12 : 0}
        d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 7v5l3 2"
      />
    </svg>
  );
}

export function PaymentsShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const locale = useLocale();
  const { user, profile, loading, profileLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [ssoRedirecting, setSsoRedirecting] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const access = useAccess();
  const allowed = canAccessPayments(access);
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
        const consume = ssoConsumeUrl("payments", locale, next);
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
        href: "/participants",
        label: t("navParticipants"),
        match: (p: string) => p.startsWith("/participants"),
        Icon: IconPeople,
      },
      {
        href: "/relationships",
        label: t("navRelationships"),
        match: (p: string) => p.startsWith("/relationships"),
        Icon: IconLink,
      },
      {
        href: "/contract-terms",
        label: t("navContractTerms"),
        match: (p: string) => p.startsWith("/contract-terms"),
        Icon: IconRates,
      },
      {
        href: "/carriers",
        label: t("navCarriers"),
        match: (p: string) => p.startsWith("/carriers"),
        Icon: IconCarrier,
      },
      {
        href: "/statements",
        label: t("navStatements"),
        match: (p: string) => p.startsWith("/statements"),
        Icon: IconStatement,
      },
      {
        href: "/runs",
        label: t("navRuns"),
        match: (p: string) => p.startsWith("/runs"),
        Icon: IconRuns,
      },
    ],
    [t],
  );

  if (loading || ssoRedirecting || !user || (!profile && profileLoading)) {
    return (
      <PaymentsShellSkeleton
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
    return <PaymentsShellSkeleton hint={t("bootPreparing")} />;
  }

  if (blocked) {
    return (
      <div className="studio-bg flex min-h-screen items-center justify-center p-6">
        <div className="studio-panel max-w-md p-8 text-center">
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

  return (
    <div className="studio-bg flex h-[100svh] overflow-hidden">
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
            <AppSwitcher current="payments" permissions={access} />
            <div className="flex items-center gap-1">
              <ThemeToggle />
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
                {ROLE_KEY[profile.role as UserRole]
                  ? t(ROLE_KEY[profile.role as UserRole])
                  : profile.role}
              </span>
            </div>
          </div>
        </div>

        <nav
          className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3"
          aria-label="Primary"
        >
          {nav.map((item) => {
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
              void (async () => {
                try {
                  const url = await resolveSwitchUrl({
                    target: "pulse",
                    homePath: PULSE_ACCOUNT_PATH,
                    locale,
                    getIdToken: async () => {
                      const u = getFirebaseAuth().currentUser;
                      if (!u) return null;
                      return u.getIdToken();
                    },
                  });
                  window.location.assign(url);
                } catch {
                  window.location.assign(
                    `${PULSE_URL}/${locale}${PULSE_ACCOUNT_PATH}`,
                  );
                }
              })();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium text-muted transition hover:bg-ink/[0.04] hover:text-ink dark:hover:bg-white/[0.05]"
          >
            <span className="min-w-0 flex-1 truncate text-left">
              {t("navAccount")}
            </span>
          </button>

          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() =>
              void signOutAndRedirect({
                current: "payments",
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
            <AppSwitcher current="payments" permissions={access} />
          </div>
          <ThemeToggle />
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom,0px))] lg:pb-0">
          {children}
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-glass-border bg-sheet/95 px-1 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md lg:hidden"
          aria-label="Primary"
        >
          <div className="mx-auto flex max-w-lg items-stretch overflow-x-auto">
            {nav.map((item) => {
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
    </div>
  );
}
