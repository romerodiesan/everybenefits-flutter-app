"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { headlineName } from "@/lib/firebase/users";
import { getOrCreateSupportChat } from "@/lib/firebase/chats";
import { signOutEverywhere } from "@/lib/firebase/auth";
import { canAccessSupport } from "@/lib/roles";
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
  }[role];
}

function sectionFromLocation(): SettingsSection | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace("#", "");
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("section") ?? "";
  const candidate = hash || fromQuery;
  const known: SettingsSection[] = [
    "account",
    "appearance",
    "notifications",
    "security",
    "privacy",
    "admin",
    "danger",
  ];
  return known.includes(candidate as SettingsSection)
    ? (candidate as SettingsSection)
    : null;
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
  const { profile } = useAuth();
  const [section, setSection] = useState<SettingsSection>(
    () => sectionFromLocation() ?? "account",
  );

  useEffect(() => {
    const sync = () => {
      const next = sectionFromLocation();
      if (next) setSection(next);
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const isAdmin = profile?.role === "admin";
  const canApprove =
    profile?.role === "admin" || profile?.role === "manager";
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
    // Keep the hash shareable without triggering a navigation.
    window.history.replaceState(null, "", `#${next}`);
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
              {canAccessSupport(profile.role, profile.isAnonymous) && (
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
