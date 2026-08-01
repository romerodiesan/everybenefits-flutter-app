"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  reauthenticate,
  signOutEverywhere,
  usesPasswordProvider,
} from "@/lib/firebase/auth";
import {
  deactivateAccount,
  requestAccountDeletion,
} from "@/lib/firebase/functions";
import { Button, Input, Label } from "@pulse/ui";
import {
  SettingsPanelShell,
  StatusBanner,
} from "@/components/profile/settings-nav";

type Mode = null | "deactivate" | "delete";

export function DangerPanel() {
  const t = useTranslations();
  const locale = useLocale();
  const [mode, setMode] = useState<Mode>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graceLabel, setGraceLabel] = useState("");

  const needsPassword = usesPasswordProvider();

  const onDeactivate = async () => {
    setBusy(true);
    setError(null);
    try {
      await deactivateAccount();
      await signOutEverywhere({
        current: "pulse",
        locale,
        returnPath: "/login",
      });
    } catch {
      setError(t("errorGeneric"));
      setBusy(false);
    }
  };

  const onDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await reauthenticate(needsPassword ? password : undefined);
    } catch {
      setError(t("dangerReauthFailed"));
      setBusy(false);
      return;
    }
    try {
      await requestAccountDeletion();
      await signOutEverywhere({
        current: "pulse",
        locale,
        returnPath: "/login",
      });
    } catch {
      setError(t("errorGeneric"));
      setBusy(false);
    }
  };

  return (
    <SettingsPanelShell
      title={t("dangerTitle")}
      subtitle={t("dangerSubtitle")}
      danger
    >
      <div className="space-y-4">
        {/* Deactivate */}
        <div className="rounded-xl border border-glass-border p-4">
          <p className="text-sm font-semibold">{t("dangerDeactivate")}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {t("dangerDeactivateHint")}
          </p>
          {mode === "deactivate" ? (
            <div className="mt-3 space-y-3">
              <StatusBanner kind="info">
                {t("dangerDeactivateConfirmHint")}
              </StatusBanner>
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" disabled={busy} onClick={onDeactivate}>
                  {t("dangerDeactivateConfirm")}
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setMode(null)}
                >
                  {t("cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              className="mt-3 h-9 px-3 text-xs"
              onClick={() => {
                setMode("deactivate");
                setError(null);
              }}
            >
              {t("dangerDeactivate")}
            </Button>
          )}
        </div>

        {/* Delete */}
        <div className="rounded-xl border border-[#B42318]/30 p-4">
          <p className="text-sm font-semibold text-[#D92D20]">
            {t("dangerDelete")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {t("dangerDeleteHint")}
          </p>
          {mode === "delete" ? (
            <div className="mt-3 space-y-3">
              <StatusBanner kind="error">
                {t("dangerDeleteConfirmHint", { date: graceLabel })}
              </StatusBanner>
              <p className="text-xs leading-relaxed text-muted">
                {t("dangerDeleteAnonymizeHint")}
              </p>
              {needsPassword && (
                <div className="max-w-sm">
                  <Label>{t("dangerCurrentPassword")}</Label>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="danger"
                  disabled={busy || (needsPassword && !password)}
                  onClick={onDelete}
                >
                  {t("dangerDeleteConfirm")}
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setMode(null);
                    setPassword("");
                  }}
                >
                  {t("cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="danger"
              className="mt-3 h-9 px-3 text-xs"
              onClick={() => {
                setMode("delete");
                setError(null);
                setGraceLabel(
                  new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
                    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                  ),
                );
              }}
            >
              {t("dangerDelete")}
            </Button>
          )}
        </div>

        {error && <StatusBanner kind="error">{error}</StatusBanner>}
      </div>
    </SettingsPanelShell>
  );
}
