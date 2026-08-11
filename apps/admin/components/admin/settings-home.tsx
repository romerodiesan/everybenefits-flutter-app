"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAccess } from "@/lib/providers/auth-provider";
import { canManagePlatform } from "@/lib/roles";
import { useRouter } from "@/i18n/navigation";
import { getAdminRepository } from "@/lib/repositories/admin-repository";
import { Button } from "@/components/ui/primitives";

export function SettingsHome() {
  const t = useTranslations();
  const router = useRouter();
  const access = useAccess();
  const isAdmin = canManagePlatform(access);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/");
    }
  }, [isAdmin, router]);

  if (!isAdmin) return null;

  async function runSearchBackfill() {
    setBusy(true);
    setError(null);
    setMessage(t("settingsSearchBackfillRunning"));
    try {
      const repo = getAdminRepository();
      let pageToken: string | null = null;
      let scanned = 0;
      let updated = 0;
      do {
        const page = await repo.backfillUserSearchFields({
          pageSize: 400,
          pageToken,
        });
        scanned += page.scanned;
        updated += page.updated;
        pageToken = page.nextPageToken;
        setMessage(
          t("settingsSearchBackfillProgress", {
            scanned,
            updated,
          }),
        );
        if (page.done) break;
      } while (pageToken);
      setMessage(
        t("settingsSearchBackfillDone", {
          scanned,
          updated,
        }),
      );
    } catch {
      setError(t("settingsSearchBackfillError"));
      setMessage(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {t("settingsTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("settingsSubtitle")}</p>
      </header>

      <section className="studio-panel space-y-3 rounded-2xl p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-tight">
          {t("settingsSearchBackfillTitle")}
        </h2>
        <p className="text-sm text-muted">
          {t("settingsSearchBackfillBody")}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={busy}
            onClick={() => void runSearchBackfill()}
          >
            {busy
              ? t("settingsSearchBackfillRunning")
              : t("settingsSearchBackfillAction")}
          </Button>
          {message ? (
            <p className="text-xs text-muted">{message}</p>
          ) : null}
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
      </section>
    </div>
  );
}
