"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/providers/auth-provider";
import { canManagePlatform } from "@pulse/shared";
import {
  setPulseAiEnabled,
  watchPulseAiEnabled,
} from "@/lib/firebase/platform-config";
import { useRouter } from "@/i18n/navigation";

export function SettingsHome() {
  const t = useTranslations();
  const router = useRouter();
  const { profile } = useAuth();
  const isAdmin = canManagePlatform(profile?.role ?? "guest");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/");
      return;
    }
    return watchPulseAiEnabled(setAiEnabled);
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

      <div className="admin-panel flex items-center justify-between gap-4 rounded-2xl p-5">
        <div>
          <p className="font-semibold">{t("adminPulseAi")}</p>
          <p className="mt-1 text-sm text-muted">{t("adminPulseAiHint")}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={aiEnabled}
          disabled={aiBusy || !profile}
          onClick={async () => {
            if (!profile || aiBusy) return;
            const next = !aiEnabled;
            setAiEnabled(next);
            setAiBusy(true);
            try {
              await setPulseAiEnabled(next, profile.uid);
            } catch {
              setAiEnabled(!next);
            } finally {
              setAiBusy(false);
            }
          }}
          className={`relative h-7 w-12 rounded-full transition ${
            aiEnabled ? "bg-brand" : "bg-ink/20 dark:bg-white/20"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
              aiEnabled ? "left-[1.35rem]" : "left-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
