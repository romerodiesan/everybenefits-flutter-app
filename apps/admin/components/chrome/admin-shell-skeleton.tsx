"use client";

import { useTranslations } from "next-intl";

/** Boot / auth loading — no menu chrome (menu appears only when ready). */
export function AdminShellSkeleton({ hint }: { hint?: string }) {
  const t = useTranslations();
  return (
    <div className="studio-bg flex min-h-[100svh] items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-5 text-center">
        <p className="font-display text-xl font-bold tracking-tight">
          {t("brandShort")}
        </p>
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
        <p className="text-sm text-muted">{hint ?? t("bootPreparing")}</p>
        <div className="mx-auto space-y-2 pt-2">
          <div className="mx-auto h-3 w-40 animate-pulse rounded-md bg-ink/[0.06] dark:bg-white/[0.08]" />
          <div className="mx-auto h-3 w-28 animate-pulse rounded-md bg-ink/[0.05] dark:bg-white/[0.06]" />
        </div>
      </div>
    </div>
  );
}
