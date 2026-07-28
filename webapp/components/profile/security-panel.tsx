"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { TotpSecret } from "firebase/auth";
import {
  changePassword,
  hasGoogleProvider,
  hasPasswordProvider,
  linkGoogleAccount,
  linkPassword,
  reauthenticate,
  unlinkGoogleAccount,
} from "@/lib/firebase/auth";
import {
  finishPhoneEnrollment,
  finishTotpEnrollment,
  listEnrolledFactors,
  startPhoneEnrollment,
  startTotpEnrollment,
  unenrollFactor,
  type EnrolledFactor,
  TotpMultiFactorGenerator,
} from "@/lib/firebase/mfa";
import { Button, Input, Label } from "@/components/ui/primitives";
import {
  SettingsPanelShell,
  StatusBanner,
} from "@/components/profile/settings-nav";

export function SecurityPanel() {
  const t = useTranslations();
  const [factors, setFactors] = useState<EnrolledFactor[]>([]);
  const [hasPassword, setHasPassword] = useState(hasPasswordProvider());
  const [hasGoogle, setHasGoogle] = useState(hasGoogleProvider());
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"saved" | "error" | "factor" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);
  const [totpQr, setTotpQr] = useState<string | null>(null);
  const [totpKey, setTotpKey] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");

  const [phone, setPhone] = useState("");
  const [phoneVerificationId, setPhoneVerificationId] = useState<string | null>(
    null,
  );
  const [smsCode, setSmsCode] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");

  const refresh = useCallback(async () => {
    try {
      const next = await listEnrolledFactors();
      setFactors(next);
      setHasPassword(hasPasswordProvider());
      setHasGoogle(hasGoogleProvider());
    } catch {
      setFactors([]);
      setHasPassword(hasPasswordProvider());
      setHasGoogle(hasGoogleProvider());
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onSavePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6 || newPassword !== confirmPassword) {
      setError(t("setPasswordMismatch"));
      setStatus("error");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      if (hasPassword) {
        await changePassword(currentPassword, newPassword);
      } else {
        await linkPassword(newPassword);
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus("saved");
      await refresh();
    } catch {
      setStatus("error");
      setError(t("errorAuth"));
    } finally {
      setBusy(false);
    }
  }

  async function ensureRecentLogin() {
    if (hasPasswordProvider()) {
      if (!reauthPassword) throw new Error("password-required");
      await reauthenticate(reauthPassword);
    } else {
      await reauthenticate();
    }
  }

  async function onStartTotp() {
    setBusy(true);
    setError(null);
    try {
      await ensureRecentLogin();
      const pending = await startTotpEnrollment();
      setTotpSecret(pending.secret);
      setTotpQr(pending.qrCodeUrl);
      setTotpKey(pending.secretKey);
    } catch {
      setError(t("errorAuth"));
    } finally {
      setBusy(false);
    }
  }

  async function onFinishTotp(e: FormEvent) {
    e.preventDefault();
    if (!totpSecret) return;
    setBusy(true);
    setError(null);
    try {
      await finishTotpEnrollment(totpSecret, totpCode);
      setTotpSecret(null);
      setTotpQr(null);
      setTotpKey(null);
      setTotpCode("");
      setStatus("factor");
      await refresh();
    } catch {
      setError(t("errorAuth"));
    } finally {
      setBusy(false);
    }
  }

  async function onStartPhone() {
    setBusy(true);
    setError(null);
    try {
      await ensureRecentLogin();
      const id = await startPhoneEnrollment(phone, "security-recaptcha");
      setPhoneVerificationId(id);
    } catch {
      setError(t("errorAuth"));
    } finally {
      setBusy(false);
    }
  }

  async function onFinishPhone(e: FormEvent) {
    e.preventDefault();
    if (!phoneVerificationId) return;
    setBusy(true);
    setError(null);
    try {
      await finishPhoneEnrollment(phoneVerificationId, smsCode);
      setPhone("");
      setSmsCode("");
      setPhoneVerificationId(null);
      setStatus("factor");
      await refresh();
    } catch {
      setError(t("errorAuth"));
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(uid: string) {
    setBusy(true);
    setError(null);
    try {
      await ensureRecentLogin();
      await unenrollFactor(uid);
      setStatus("factor");
      await refresh();
    } catch {
      setError(t("errorAuth"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsPanelShell
      title={t("profileSecurity")}
      subtitle={t("profileSecurityHint")}
    >
      <div id="security-recaptcha" />

      <form onSubmit={onSavePassword} className="space-y-3 border-b border-glass-border pb-6">
        <h3 className="text-sm font-bold">
          {hasPassword ? t("securityChangePassword") : t("securitySetPassword")}
        </h3>
        {hasPassword && (
          <div className="max-w-sm">
            <Label>{t("securityCurrentPassword")}</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        )}
        <div className="max-w-sm">
          <Label>{t("securityNewPassword")}</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
          />
        </div>
        <div className="max-w-sm">
          <Label>{t("confirmPassword")}</Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
          />
        </div>
        <Button type="submit" disabled={busy}>
          {hasPassword ? t("securityChangePassword") : t("securitySetPassword")}
        </Button>
        {status === "saved" && (
          <StatusBanner kind="success">{t("securityPasswordSaved")}</StatusBanner>
        )}
      </form>

      <div className="mt-6 space-y-3 border-t border-glass-border pt-6">
        <div>
          <h3 className="text-sm font-bold">{t("securityGoogleTitle")}</h3>
          <p className="mt-1 text-sm text-muted">{t("securityGoogleHint")}</p>
        </div>
        {hasGoogle ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-lg bg-brand/12 px-2.5 py-1 text-xs font-bold text-brand">
              {t("securityGoogleLinked")}
            </span>
            <Button
              type="button"
              variant="secondary"
              className="h-8 px-3 text-xs"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                setStatus(null);
                try {
                  await unlinkGoogleAccount();
                  await refresh();
                  setStatus("saved");
                } catch (err) {
                  setStatus("error");
                  setError(
                    err instanceof Error && err.message === "last-provider"
                      ? t("securityGoogleLastProvider")
                      : t("errorGeneric"),
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("securityGoogleUnlink")}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              setStatus(null);
              try {
                await linkGoogleAccount();
                await refresh();
                setStatus("saved");
              } catch {
                setStatus("error");
                setError(t("errorGeneric"));
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("securityGoogleLink")}
          </Button>
        )}
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold">{t("securityMfaTitle")}</h3>
          <p className="mt-1 text-sm text-muted">{t("securityMfaHint")}</p>
        </div>

        {hasPassword && (
          <div className="max-w-sm">
            <Label>{t("securityReauthHint")}</Label>
            <Input
              type="password"
              value={reauthPassword}
              onChange={(e) => setReauthPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        )}

        {factors.length === 0 ? (
          <p className="text-sm text-muted">{t("securityNoFactors")}</p>
        ) : (
          <ul className="space-y-2">
            {factors.map((factor) => (
              <li
                key={factor.uid}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>
                  {factor.displayName ||
                    (factor.factorId === TotpMultiFactorGenerator.FACTOR_ID
                      ? t("mfaTotpLabel")
                      : factor.phoneNumber || t("mfaSmsLabel"))}
                  <span className="ml-2 text-xs text-muted">{factor.factorId}</span>
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  disabled={busy}
                  onClick={() => void onRemove(factor.uid)}
                >
                  {t("securityFactorRemove")}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {!totpSecret ? (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void onStartTotp()}
          >
            {t("securityEnrollTotp")}
          </Button>
        ) : (
          <form onSubmit={onFinishTotp} className="space-y-3 rounded-xl border border-glass-border p-4">
            <p className="text-sm">{t("securityTotpScan")}</p>
            {totpQr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="TOTP QR"
                className="h-40 w-40 rounded-lg bg-white p-2"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(totpQr)}`}
              />
            )}
            {totpKey && (
              <p className="break-all text-xs text-muted">
                {t("securityTotpSecret")}: {totpKey}
              </p>
            )}
            <div className="max-w-xs">
              <Label>{t("mfaCodeLabel")}</Label>
              <Input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={busy}>
              {t("mfaVerify")}
            </Button>
          </form>
        )}

        <div className="space-y-3 rounded-xl border border-glass-border p-4">
          <div className="max-w-sm">
            <Label>{t("securityPhoneHint")}</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+15551234567"
            />
          </div>
          {!phoneVerificationId ? (
            <Button
              type="button"
              variant="secondary"
              disabled={busy || !phone.trim()}
              onClick={() => void onStartPhone()}
            >
              {t("securityEnrollSms")}
            </Button>
          ) : (
            <form onSubmit={onFinishPhone} className="space-y-3">
              <div className="max-w-xs">
                <Label>{t("mfaCodeLabel")}</Label>
                <Input
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={busy}>
                {t("mfaVerify")}
              </Button>
            </form>
          )}
        </div>

        {status === "factor" && (
          <StatusBanner kind="success">{t("securityFactorAdded")}</StatusBanner>
        )}
        {error && <StatusBanner kind="error">{error}</StatusBanner>}
      </div>
    </SettingsPanelShell>
  );
}
