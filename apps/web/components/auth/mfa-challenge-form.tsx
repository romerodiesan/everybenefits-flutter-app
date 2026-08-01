"use client";

import { FormEvent, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { MultiFactorInfo, MultiFactorResolver } from "firebase/auth";
import { Button, Input, Label } from "@pulse/ui";
import {
  PhoneMultiFactorGenerator,
  TotpMultiFactorGenerator,
  resolveMfaWithSms,
  resolveMfaWithTotp,
  sendMfaSmsChallenge,
} from "@/lib/firebase/mfa";

export function MfaChallengeForm({
  resolver,
  onResolved,
  onCancel,
}: {
  resolver: MultiFactorResolver;
  onResolved: () => void;
  onCancel?: () => void;
}) {
  const t = useTranslations();
  const [selected, setSelected] = useState<MultiFactorInfo | null>(
    resolver.hints.length === 1 ? resolver.hints[0] : null,
  );
  const [code, setCode] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTotp = selected?.factorId === TotpMultiFactorGenerator.FACTOR_ID;
  const isSms = selected?.factorId === PhoneMultiFactorGenerator.FACTOR_ID;

  const labels = useMemo(
    () =>
      resolver.hints.map((hint) => ({
        hint,
        label:
          hint.factorId === TotpMultiFactorGenerator.FACTOR_ID
            ? hint.displayName || t("mfaTotpLabel")
            : hint.displayName || t("mfaSmsLabel"),
      })),
    [resolver.hints, t],
  );

  async function sendSms() {
    if (!selected || !isSms) return;
    setBusy(true);
    setError(null);
    try {
      const id = await sendMfaSmsChallenge(resolver, selected, "mfa-recaptcha");
      setVerificationId(id);
    } catch {
      setError(t("errorAuth"));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      if (isTotp) {
        await resolveMfaWithTotp(resolver, selected.uid, code);
      } else {
        if (!verificationId) {
          setError(t("errorAuth"));
          return;
        }
        await resolveMfaWithSms(resolver, verificationId, code);
      }
      onResolved();
    } catch {
      setError(t("errorAuth"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold">{t("mfaTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("mfaSubtitle")}</p>
      </div>

      <div id="mfa-recaptcha" />

      {!selected ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{t("mfaChooseFactor")}</p>
          {labels.map(({ hint, label }) => (
            <Button
              key={hint.uid}
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setSelected(hint)}
            >
              {label}
            </Button>
          ))}
        </div>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
          {labels.length > 1 && (
            <button
              type="button"
              className="text-sm text-muted underline"
              onClick={() => {
                setSelected(null);
                setVerificationId(null);
                setCode("");
              }}
            >
              {t("mfaChooseFactor")}
            </button>
          )}
          {isSms && !verificationId && (
            <Button
              type="button"
              className="w-full"
              disabled={busy}
              onClick={() => void sendSms()}
            >
              {t("mfaSendSms")}
            </Button>
          )}
          {(isTotp || verificationId) && (
            <>
              <div>
                <Label>{t("mfaCodeLabel")}</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  required
                  autoComplete="one-time-code"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {t("mfaVerify")}
              </Button>
            </>
          )}
        </form>
      )}

      {onCancel && (
        <button
          type="button"
          className="text-sm text-muted underline"
          onClick={onCancel}
        >
          {t("cancel")}
        </button>
      )}
    </div>
  );
}
