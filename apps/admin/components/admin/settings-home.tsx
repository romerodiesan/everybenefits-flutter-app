"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAccess } from "@/lib/providers/auth-provider";
import { canManagePlatform } from "@/lib/roles";
import { useRouter } from "@/i18n/navigation";

export function SettingsHome() {
  const t = useTranslations();
  const router = useRouter();
  const access = useAccess();
  const isAdmin = canManagePlatform(access);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/");
    }
  }, [isAdmin, router]);

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {t("settingsTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("settingsSubtitle")}</p>
      </header>
      <p className="rounded-2xl border border-dashed border-hairline bg-panel/40 px-4 py-8 text-center text-sm text-muted">
        {t("settingsEmpty")}
      </p>
    </div>
  );
}
