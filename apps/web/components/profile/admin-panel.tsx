"use client";

import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/providers/auth-provider";
import {
  SettingsPanelShell,
} from "@/components/profile/settings-nav";
import { Button } from "@pulse/ui";
import { adminWebUrl } from "@pulse/sso/client";

/**
 * Legacy embedded admin panel — primary ops live in Pulse Admin.
 * Keep a deep-link so managers/admins still find Approvals / Users from Profile.
 */
export function AdminPanel() {
  const t = useTranslations();
  const locale = useLocale();
  const { profile } = useAuth();
  const isStaff =
    profile?.role === "admin" || profile?.role === "manager";

  if (!isStaff) return null;

  const adminHome = `${adminWebUrl()}/${locale}/`;

  return (
    <SettingsPanelShell
      title={t("profileAdmin")}
      subtitle={t("profileAdminHint")}
    >
      <p className="mb-4 text-sm text-muted">{t("adminMovedHint")}</p>
      <Button
        onClick={() => {
          window.location.assign(adminHome);
        }}
      >
        {t("adminOpenConsole")}
      </Button>
    </SettingsPanelShell>
  );
}
