"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { callCloudFunction } from "@pulse/firebase-client";
import { signInWithCustomAuthToken } from "@/lib/firebase/auth";
import { Button, Input, Label } from "@pulse/ui";

type InviteInfo = {
  email: string;
  role: string;
  requiresNpn: boolean;
};

export function InviteCompleteForm() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = String(params?.token ?? "");

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [npn, setNpn] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await callCloudFunction<InviteInfo>("getInvite", { token });
        if (!cancelled) setInfo(data);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : t("inviteInvalid"),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!info) return;
    setBusy(true);
    setError(null);
    try {
      const result = await callCloudFunction<{
        customToken?: string;
      }>("completeInvite", {
        token,
        password,
        displayName: displayName.trim(),
        phoneCountryCode: phoneCountryCode.trim(),
        phoneNumber: phoneNumber.trim(),
        npn: npn.trim(),
      });
      if (result.customToken) {
        await signInWithCustomAuthToken(result.customToken);
      }
      router.replace("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md p-6 text-sm text-muted">{t("loading")}</div>
    );
  }

  if (!info || loadError) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-6">
        <h1 className="font-display text-2xl font-bold">{t("inviteTitle")}</h1>
        <p className="text-sm text-red-400">{loadError ?? t("inviteInvalid")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5 p-6">
      <header>
        <h1 className="font-display text-2xl font-bold">{t("inviteTitle")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t("inviteSubtitle", { email: info.email })}
        </p>
      </header>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label>{t("displayName")}</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>{t("invitePassword")}</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div className="grid grid-cols-[7rem_1fr] gap-2">
          <div>
            <Label>{t("phoneCountryCode")}</Label>
            <Input
              value={phoneCountryCode}
              onChange={(e) => setPhoneCountryCode(e.target.value)}
            />
          </div>
          <div>
            <Label>{t("fieldPhoneNumber")}</Label>
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              inputMode="tel"
            />
          </div>
        </div>
        {info.requiresNpn ? (
          <div>
            <Label>{t("npn")}</Label>
            <Input value={npn} onChange={(e) => setNpn(e.target.value)} required />
          </div>
        ) : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button type="submit" disabled={busy || !displayName.trim() || password.length < 8}>
          {busy ? t("inviteCompleting") : t("inviteComplete")}
        </Button>
      </form>
    </div>
  );
}
