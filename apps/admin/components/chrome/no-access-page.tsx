"use client";

import { useTranslations } from "next-intl";

const PULSE_URL =
  process.env.NEXT_PUBLIC_PULSE_WEB_URL ?? "http://localhost:3000";

export function NoAccessPage() {
  const t = useTranslations();
  return (
    <div className="admin-bg flex min-h-screen items-center justify-center p-6">
      <div className="admin-panel max-w-md p-8 text-center">
        <h1 className="font-display text-2xl">{t("noAccessTitle")}</h1>
        <p className="mt-3 text-sm text-muted">{t("noAccessBody")}</p>
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
