"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useAuth, useAccess } from "@/lib/providers/auth-provider";
import { headlineName } from "@/lib/display-name";
import { getOrCreateSupportChat } from "@/lib/firebase/chats";
import { signOutAndRedirect } from "@/lib/firebase/auth";
import { can, canAccessSupport } from "@/lib/roles";
import type { UserProfile } from "@/lib/types";
import { Avatar, Badge, Button } from "@/components/ui/primitives";
import {
  SettingsNav,
  type SettingsNavItem,
  type SettingsSection,
} from "@/components/profile/settings-nav";
import { AccountPanel } from "@/components/profile/account-panel";
import { AppearancePanel } from "@/components/profile/appearance-panel";
import { NotificationsPanel } from "@/components/profile/notifications-panel";
import { PrivacyPanel } from "@/components/profile/privacy-panel";
import { SecurityPanel } from "@/components/profile/security-panel";
import { AdminPanel } from "@/components/profile/admin-panel";
import { DangerPanel } from "@/components/profile/danger-panel";
import {
  PROFILE_SECTION_KEY,
  restorePendingLocaleHash,
} from "@/lib/i18n/switch-locale";

function roleLabel(
  role: UserProfile["role"],
  t: ReturnType<typeof useTranslations>,
) {
  return {
    guest: t("roleGuest"),
    student: t("roleStudent"),
    agent: t("roleAgent"),
    instructor: t("roleInstructor"),
    manager: t("roleManager"),
    admin: t("roleAdmin"),
    system: t("roleSystem"),
  }[role];
}

const KNOWN_SECTIONS: SettingsSection[] = [
  "account",
  "appearance",
  "notifications",
  "security",
  "privacy",
  "admin",
  "danger",
];

function isSettingsSection(value: string): value is SettingsSection {
  return KNOWN_SECTIONS.includes(value as SettingsSection);
}

function sectionFromLocation(): SettingsSection | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("section") ?? "";
  // Prefer ?section= over hash — deep links set the query, while a stale
  // hash can linger from a previous visit or a premature replaceState.
  if (isSettingsSection(fromQuery)) return fromQuery;
  const hash = window.location.hash.replace(/^#/, "");
  return isSettingsSection(hash) ? hash : null;
}

function sectionFromSession(): SettingsSection | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(PROFILE_SECTION_KEY) ?? "";
    return isSettingsSection(stored) ? stored : null;
  } catch {
    return null;
  }
}

const ICONS: Record<SettingsSection, React.ReactNode> = {
  account: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5c1.2-3 4-4.5 7-4.5s5.8 1.5 7 4.5" strokeLinecap="round" />
    </svg>
  ),
  appearance: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-.9 2-2 0-.6-.3-1-.6-1.4-.3-.4-.6-.8-.6-1.4 0-1.1.9-2 2-2h1.8c2 0 3.4-1.4 3.4-3.2C20 6.4 16.4 3 12 3Z" />
      <circle cx="7.5" cy="11.5" r="1" fill="currentColor" />
      <circle cx="10.5" cy="7.5" r="1" fill="currentColor" />
      <circle cx="15" cy="7.5" r="1" fill="currentColor" />
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M6 9.5A6 6 0 0 1 18 9.5c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z"
        strokeLinejoin="round"
      />
      <path d="M10 18.5a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  ),
  privacy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  ),
  security: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3Z"
        strokeLinejoin="round"
      />
      <path d="M9.5 12.5h5M12 10v5" strokeLinecap="round" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3Z"
        strokeLinejoin="round"
      />
      <path d="M9.5 12l2 2 3.5-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  danger: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M12 4 3 19h18L12 4Z"
        strokeLinejoin="round"
      />
      <path d="M12 10v4" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="0.4" fill="currentColor" />
    </svg>
  ),
};

export function ProfilePage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  // Always start at account on SSR/hydration; resolve the real section in
  // an effect so we never overwrite a deep-link hash with a stale default.
  const [section, setSection] = useState<SettingsSection>("account");
  const [sectionReady, setSectionReady] = useState(false);
  const access = useAccess();

  useEffect(() => {
    restorePendingLocaleHash();
    const sync = () => {
      const next =
        sectionFromLocation() ?? sectionFromSession() ?? "account";
      setSection(next);
      setSectionReady(true);
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, [locale, searchParams]);

  useEffect(() => {
    if (!sectionReady) return;
    try {
      sessionStorage.setItem(PROFILE_SECTION_KEY, section);
    } catch {
      // ignore
    }
    const nextUrl = `${window.location.pathname}${window.location.search}#${section}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (current !== nextUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [section, sectionReady]);

  const canApprove = can(access, "admin.approvals.decide");
  const isAnonymous = profile?.isAnonymous ?? true;

  const navItems = useMemo<SettingsNavItem[]>(() => {
    const items: SettingsNavItem[] = [
      {
        id: "account",
        label: t("profileAccount"),
        description: t("profileAccountNav"),
        icon: ICONS.account,
      },
      {
        id: "appearance",
        label: t("profileAppearance"),
        description: t("profileAppearanceNav"),
        icon: ICONS.appearance,
      },
    ];
    if (!isAnonymous) {
      items.push({
        id: "notifications",
        label: t("notificationsPrefsTitle"),
        description: t("profileNotificationsNav"),
        icon: ICONS.notifications,
      });
      items.push({
        id: "security",
        label: t("profileSecurity"),
        description: t("profileSecurityNav"),
        icon: ICONS.security,
      });
    }
    items.push({
      id: "privacy",
      label: t("profilePrivacy"),
      description: t("profilePrivacyNav"),
      icon: ICONS.privacy,
    });
    if (canApprove) {
      items.push({
        id: "admin",
        label: t("profileAdmin"),
        description: t("profileAdminNav"),
        icon: ICONS.admin,
      });
    }
    if (!isAnonymous) {
      items.push({
        id: "danger",
        label: t("dangerTitle"),
        description: t("dangerNav"),
        icon: ICONS.danger,
        danger: true,
      });
    }
    return items;
  }, [t, canApprove, isAnonymous]);

  if (!profile) return null;

  const select = (next: SettingsSection) => {
    setSection(next);
    try {
      sessionStorage.setItem(PROFILE_SECTION_KEY, next);
    } catch {
      // ignore
    }
    const url = new URL(window.location.href);
    url.searchParams.set("section", next);
    url.hash = next;
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  };

  const available = navItems.some((item) => item.id === section)
    ? section
    : "account";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-4 lg:px-8 lg:pt-8">
      <header className="mb-5 border-b border-glass-border pb-4">
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          {t("profileTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("profileSubtitle")}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="pulse-sheet p-4">
            <div className="flex items-center gap-3">
              <Avatar
                name={headlineName(profile)}
                photoUrl={profile.photoUrl}
                size={52}
              />
              <div className="min-w-0">
                <p className="truncate font-display text-base font-bold">
                  {headlineName(profile)}
                </p>
                <div className="mt-1">
                  <Badge>{roleLabel(profile.role, t)}</Badge>
                </div>
              </div>
            </div>
            {profile.email && (
              <p className="mt-2.5 break-all text-xs text-muted">
                {profile.email}
              </p>
            )}
            <div className="mt-3 space-y-1.5">
              {canAccessSupport(access, profile.isAnonymous) && (
                <Button
                  className="h-9 w-full text-xs"
                  onClick={async () => {
                    const chat = await getOrCreateSupportChat(
                      profile,
                      "Support Assistant",
                      "Hi — how can we help?",
                    );
                    router.push(`/chats/${chat.id}`);
                  }}
                >
                  {t("profileSupport")}
                </Button>
              )}
              <Button
                variant="secondary"
                className="h-9 w-full text-xs lg:hidden"
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
            </div>
          </div>

          <SettingsNav items={navItems} active={available} onSelect={select} />
        </aside>

        <div className="min-w-0">
          {available === "account" && <AccountPanel key={profile.uid} />}
          {available === "appearance" && <AppearancePanel />}
          {available === "notifications" && !profile.isAnonymous && (
            <NotificationsPanel uid={profile.uid} />
          )}
          {available === "security" && !profile.isAnonymous && <SecurityPanel />}
          {available === "privacy" && <PrivacyPanel />}
          {available === "admin" && canApprove && <AdminPanel />}
          {available === "danger" && !profile.isAnonymous && <DangerPanel />}
        </div>
      </div>
    </div>
  );
}
