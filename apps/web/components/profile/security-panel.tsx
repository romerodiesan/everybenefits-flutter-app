"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { TotpSecret } from "firebase/auth";
import {
  changePassword,
  currentUser,
  hasGoogleProvider,
  hasPasswordProvider,
  linkGoogleAccount,
  linkPassword,
  reauthenticate,
  securityAuthErrorKey,
  unlinkGoogleAccount,
  usingFirebaseEmulators,
} from "@/lib/firebase/auth";
import { reload } from "firebase/auth";
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
import { toE164 } from "@/lib/firebase/profile-phone";
import { Button, Input, Label } from "@/components/ui/primitives";
import { CountryCodeSelect } from "@/components/ui/country-code-select";
import {
  SettingsPanelShell,
  SettingsRow,
  StatusBanner,
} from "@/components/profile/settings-nav";

function GoogleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.8-4.1 2.8-7 0-.7-.1-1.3-.2-1.9H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3l-.5.4-2.2 1.7C5.5 19.1 8.5 21 12 21c2.7 0 5-.9 6.7-2.4l-3.1-2.4c-.9.6-2 1-3.6 1-2.8 0-5.1-1.9-5.9-4.4z"
      />
      <path
        fill="#4A90E2"
        d="M4 7.6C3.4 8.8 3 10.3 3 12s.4 3.2 1 4.4l2.7-2.1c-.2-.6-.3-1.2-.3-2.3 0-.8.1-1.5.3-2.2L4 7.6z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.3c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.3 14.7 1.4 12 1.4 8.5 1.4 5.5 3.3 4 6.6l2.7 2.1C7 6.2 9.2 5.3 12 5.3z"
      />
    </svg>
  );
}

export function SecurityPanel() {
  const t = useTranslations();
  const [factors, setFactors] = useState<EnrolledFactor[]>([]);
  const [hasPassword, setHasPassword] = useState(hasPasswordProvider());
  const [hasGoogle, setHasGoogle] = useState(hasGoogleProvider());
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"saved" | "error" | "factor" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReauth, setShowReauth] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);
  const [totpQr, setTotpQr] = useState<string | null>(null);
  const [totpKey, setTotpKey] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [enrollingTotp, setEnrollingTotp] = useState(false);

  const [phoneCountryCode, setPhoneCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneVerificationId, setPhoneVerificationId] = useState<string | null>(
    null,
  );
  const [smsCode, setSmsCode] = useState("");
  const [enrollingSms, setEnrollingSms] = useState(false);
  const [reauthPassword, setReauthPassword] = useState("");
  const onEmulator = usingFirebaseEmulators();

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

  const totpFactor = factors.find(
    (f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID,
  );
  const smsFactors = factors.filter(
    (f) => f.factorId !== TotpMultiFactorGenerator.FACTOR_ID,
  );

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
    } catch (err) {
      setStatus("error");
      setError(t(securityAuthErrorKey(err)));
    } finally {
      setBusy(false);
    }
  }

  async function ensureRecentLogin() {
    const user = currentUser();
    if (user) {
      try {
        await reload(user);
      } catch {
        // ignore — reauth will surface a clearer error
      }
    }
    if (hasPasswordProvider()) {
      if (!reauthPassword) {
        setShowReauth(true);
        throw new Error("password-required");
      }
      await reauthenticate(reauthPassword);
    } else {
      await reauthenticate();
    }
  }

  function mapSecurityError(err: unknown): string {
    return t(securityAuthErrorKey(err));
  }

  async function onStartTotp() {
    if (onEmulator) {
      setError(t("securityTotpEmulatorUnsupported"));
      setStatus("error");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await ensureRecentLogin();
      const pending = await startTotpEnrollment();
      setTotpSecret(pending.secret);
      setTotpQr(pending.qrCodeUrl);
      setTotpKey(pending.secretKey);
      setEnrollingTotp(true);
    } catch (err) {
      setError(mapSecurityError(err));
      setStatus("error");
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
      setEnrollingTotp(false);
      setStatus("factor");
      await refresh();
    } catch (err) {
      setError(mapSecurityError(err));
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  async function onStartPhone() {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await ensureRecentLogin();
      const e164 = toE164(phoneCountryCode, phoneNumber);
      const id = await startPhoneEnrollment(e164, "security-recaptcha");
      setPhoneVerificationId(id);
    } catch (err) {
      setError(mapSecurityError(err));
      setStatus("error");
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
      setPhoneNumber("");
      setSmsCode("");
      setPhoneVerificationId(null);
      setEnrollingSms(false);
      setStatus("factor");
      await refresh();
    } catch (err) {
      setError(mapSecurityError(err));
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(uid: string) {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await ensureRecentLogin();
      await unenrollFactor(uid);
      setStatus("factor");
      await refresh();
    } catch (err) {
      setError(mapSecurityError(err));
      setStatus("error");
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

      <div className="mt-6 border-t border-glass-border pt-6">
        <div className="mb-3">
          <h3 className="text-sm font-bold">{t("securityGoogleTitle")}</h3>
          <p className="mt-1 text-sm text-muted">{t("securityGoogleHint")}</p>
        </div>
        <SettingsRow
          label={
            <span className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-glass-border bg-sheet">
                <GoogleIcon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">
                  Google
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {hasGoogle
                    ? t("securityGoogleLinked")
                    : t("securityGoogleNotLinked")}
                </span>
              </span>
            </span>
          }
        >
          {hasGoogle ? (
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
                  setError(mapSecurityError(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("securityGoogleUnlink")}
            </Button>
          ) : (
            <Button
              type="button"
              className="h-8 px-3 text-xs"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                setStatus(null);
                try {
                  await linkGoogleAccount();
                  await refresh();
                  setStatus("saved");
                } catch (err) {
                  setStatus("error");
                  setError(mapSecurityError(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("securityGoogleLink")}
            </Button>
          )}
        </SettingsRow>
      </div>

      <div className="mt-6 space-y-4 border-t border-glass-border pt-6">
        <div>
          <h3 className="text-sm font-bold">{t("securityMfaTitle")}</h3>
          <p className="mt-1 text-sm text-muted">{t("securityMfaHint")}</p>
          {onEmulator && (
            <p className="mt-2 text-xs text-muted">{t("securityMfaEmulatorNote")}</p>
          )}
        </div>

        {hasPassword && (
          <div className="rounded-xl border border-glass-border p-3">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 text-left"
              onClick={() => setShowReauth((prev) => !prev)}
              aria-expanded={showReauth}
            >
              <span>
                <span className="block text-sm font-semibold">
                  {t("securityReauthTitle")}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {t("securityReauthHint")}
                </span>
              </span>
              <svg
                viewBox="0 0 20 20"
                className={`h-4 w-4 shrink-0 text-muted transition ${showReauth ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden
              >
                <path
                  d="M5 7.5 10 12.5 15 7.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {showReauth && (
              <div className="mt-3 max-w-sm">
                <Label>{t("securityCurrentPassword")}</Label>
                <Input
                  type="password"
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            )}
          </div>
        )}

        {factors.length > 0 && (
          <ul className="divide-y divide-glass-border rounded-xl border border-glass-border">
            {factors.map((factor) => {
              const isTotp =
                factor.factorId === TotpMultiFactorGenerator.FACTOR_ID;
              const label =
                factor.displayName ||
                (isTotp
                  ? t("mfaTotpLabel")
                  : factor.phoneNumber || t("mfaSmsLabel"));
              return (
                <li
                  key={factor.uid}
                  className="flex items-center justify-between gap-3 px-3.5 py-3 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">{label}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {isTotp ? t("mfaTotpLabel") : t("mfaSmsLabel")}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 shrink-0 px-3 text-xs"
                    disabled={busy}
                    onClick={() => void onRemove(factor.uid)}
                  >
                    {t("securityFactorRemove")}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {factors.length === 0 && !enrollingTotp && !enrollingSms && (
          <p className="text-sm text-muted">{t("securityNoFactors")}</p>
        )}

        <div className="space-y-3">
          <div className="rounded-xl border border-glass-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{t("mfaTotpLabel")}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {totpFactor
                    ? t("securityMethodActive")
                    : t("securityTotpMethodHint")}
                </p>
              </div>
              {!totpFactor && !enrollingTotp && (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  disabled={busy || onEmulator}
                  title={
                    onEmulator ? t("securityTotpEmulatorUnsupported") : undefined
                  }
                  onClick={() => void onStartTotp()}
                >
                  {t("securityEnrollTotp")}
                </Button>
              )}
            </div>
            {onEmulator && !totpFactor && (
              <p className="mt-2 text-xs text-muted">
                {t("securityTotpEmulatorUnsupported")}
              </p>
            )}
            {enrollingTotp && totpSecret && (
              <form onSubmit={onFinishTotp} className="mt-4 space-y-3">
                <p className="text-sm">{t("securityTotpScan")}</p>
                {totpQr && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="h-40 w-40 rounded-lg bg-white p-2"
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(totpQr)}`}
                  />
                )}
                {totpKey && (
                  <p className="break-all text-xs text-muted">
                    {t("securityTotpSecret")}:{" "}
                    <code className="rounded bg-ink/[0.06] px-1 py-0.5 dark:bg-white/[0.08]">
                      {totpKey}
                    </code>
                  </p>
                )}
                <div className="max-w-xs">
                  <Label>{t("mfaCodeLabel")}</Label>
                  <Input
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={busy}>
                    {t("mfaVerify")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setEnrollingTotp(false);
                      setTotpSecret(null);
                      setTotpQr(null);
                      setTotpKey(null);
                      setTotpCode("");
                    }}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="rounded-xl border border-glass-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{t("mfaSmsLabel")}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {smsFactors.length
                    ? t("securityMethodActive")
                    : t("securitySmsMethodHint")}
                </p>
              </div>
              {!enrollingSms && (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  disabled={busy}
                  onClick={() => setEnrollingSms(true)}
                >
                  {t("securityEnrollSms")}
                </Button>
              )}
            </div>
            {enrollingSms && (
              <div className="mt-4 space-y-3">
                <div className="grid max-w-md grid-cols-1 gap-3 sm:grid-cols-[9.5rem_1fr]">
                  <div>
                    <Label>{t("phoneCountryCode")}</Label>
                    <CountryCodeSelect
                      value={phoneCountryCode}
                      onChange={(code) => {
                        setPhoneCountryCode(code);
                        setPhoneVerificationId(null);
                        setSmsCode("");
                      }}
                      disabled={Boolean(phoneVerificationId)}
                    />
                  </div>
                  <div>
                    <Label>{t("fieldPhoneNumber")}</Label>
                    <Input
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        setPhoneVerificationId(null);
                        setSmsCode("");
                      }}
                      inputMode="tel"
                      disabled={Boolean(phoneVerificationId)}
                    />
                  </div>
                </div>
                {!phoneVerificationId ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={busy || !phoneNumber.trim()}
                      onClick={() => void onStartPhone()}
                    >
                      {t("mfaSendSms")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        setEnrollingSms(false);
                        setPhoneNumber("");
                        setPhoneVerificationId(null);
                        setSmsCode("");
                      }}
                    >
                      {t("cancel")}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={onFinishPhone} className="space-y-3">
                    {onEmulator && (
                      <p className="text-xs text-muted">
                        {t("securitySmsEmulatorHint")}
                      </p>
                    )}
                    <div className="max-w-xs">
                      <Label>{t("mfaCodeLabel")}</Label>
                      <Input
                        value={smsCode}
                        onChange={(e) => setSmsCode(e.target.value)}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        required
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" disabled={busy}>
                        {t("mfaVerify")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          setPhoneVerificationId(null);
                          setSmsCode("");
                        }}
                      >
                        {t("cancel")}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {status === "factor" && (
          <StatusBanner kind="success">{t("securityFactorAdded")}</StatusBanner>
        )}
        {(status === "error" || error) && error && (
          <StatusBanner kind="error">{error}</StatusBanner>
        )}
      </div>
    </SettingsPanelShell>
  );
}
