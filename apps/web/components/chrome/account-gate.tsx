"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/providers/auth-provider";
import { signOutEverywhere } from "@/lib/firebase/auth";
import {
  cancelAccountDeletion,
  reactivateAccount,
} from "@/lib/firebase/functions";
import type { UserProfile } from "@/lib/types";
import { Button } from "@pulse/ui";

/**
 * Full-page stop for deactivated / pending-deletion accounts. The user can
 * bring the account back or sign out; nothing else in the app is reachable.
 */
export function AccountGate({ profile }: { profile: UserProfile }) {
  const t = useTranslations();
  const locale = useLocale();
  const { refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingDeletion = profile.accountStatus === "pendingDeletion";
  const scheduled = profile.deletionScheduledAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
        profile.deletionScheduledAt,
      )
    : null;

  const restore = async () => {
    setBusy(true);
    setError(null);
    try {
      if (pendingDeletion) {
        await cancelAccountDeletion();
      } else {
        await reactivateAccount();
      }
      await refreshProfile();
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mesh-bg flex min-h-[100svh] items-center justify-center px-4">
      <div className="pulse-sheet w-full max-w-md p-6 text-center md:p-8">
        <h1 className="font-display text-xl font-bold tracking-tight md:text-2xl">
          {pendingDeletion ? t("gateDeletionTitle") : t("gateDeactivatedTitle")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {pendingDeletion
            ? scheduled
              ? t("gateDeletionBody", { date: scheduled })
              : t("gateDeletionBodyNoDate")
            : t("gateDeactivatedBody")}
        </p>
        <div className="mt-6 space-y-2">
          <Button className="w-full" disabled={busy} onClick={restore}>
            {pendingDeletion ? t("gateCancelDeletion") : t("gateReactivate")}
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            disabled={busy}
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
        {error && (
          <p className="mt-3 text-sm font-medium text-[#D92D20]">{error}</p>
        )}
      </div>
    </div>
  );
}
