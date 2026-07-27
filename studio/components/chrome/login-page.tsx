"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import {
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/firebase/auth";
import { useAuth } from "@/lib/providers/auth-provider";
import { Button, Input, Label } from "@/components/ui/primitives";
import { StudioShellSkeleton } from "@/components/chrome/studio-shell-skeleton";
import {
  hasSsoAttempted,
  markSsoAttempted,
  ssoBridgeUrl,
  ssoConsumeUrl,
} from "@/lib/sso";

export function LoginPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSso, setCheckingSso] = useState(true);

  const nextParam = params.get("next");

  const finish = () => {
    if (nextParam?.startsWith("/")) {
      router.replace(nextParam);
      return;
    }
    router.replace("/");
  };

  useEffect(() => {
    if (loading) return;
    if (user) {
      finish();
      return;
    }
    if (hasSsoAttempted()) {
      setCheckingSso(false);
      return;
    }
    markSsoAttempted();
    const next = nextParam?.startsWith("/") ? nextParam : "/";
    const consume = ssoConsumeUrl("studio", locale, next);
    window.location.replace(ssoBridgeUrl("pulse", locale, consume));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- finish uses nextParam/locale
  }, [loading, user, locale, nextParam]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInWithEmail(email.trim(), password);
      finish();
    } catch {
      setError(t("loginError"));
      setBusy(false);
    }
  };

  if (loading || checkingSso) {
    return <StudioShellSkeleton hint={t("ssoChecking")} />;
  }

  const continueFromPulse = () => {
    const next = nextParam?.startsWith("/") ? nextParam : "/";
    const consume = ssoConsumeUrl("studio", locale, next);
    try {
      sessionStorage.removeItem("pulse_sso_attempt");
    } catch {
      // ignore
    }
    markSsoAttempted();
    window.location.assign(ssoBridgeUrl("pulse", locale, consume));
  };

  return (
    <div className="studio-bg flex min-h-screen items-center justify-center p-6">
      <div className="studio-panel w-full max-w-md p-8">
        <p className="font-display text-sm tracking-wide text-brand">
          {t("brand")}
        </p>
        <h1 className="mt-2 font-display text-3xl">{t("loginTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("loginSubtitle")}</p>

        <Button
          type="button"
          variant="secondary"
          className="mt-6 w-full"
          disabled={busy}
          onClick={continueFromPulse}
        >
          {t("ssoContinuePulse")}
        </Button>

        <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wide text-muted">
          <span className="h-px flex-1 bg-glass-border" />
          {t("ssoOr")}
          <span className="h-px flex-1 bg-glass-border" />
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <Label>{t("loginEmail")}</Label>
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>{t("loginPassword")}</Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p className="text-sm text-danger">{error}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {t("loginSubmit")}
          </Button>
        </form>

        <Button
          type="button"
          variant="secondary"
          className="mt-3 w-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await signInWithGoogle();
              finish();
            } catch (err) {
              if (err instanceof Error && err.message === "cancelled") {
                setBusy(false);
                return;
              }
              setError(t("loginError"));
              setBusy(false);
            }
          }}
        >
          {t("loginGoogle")}
        </Button>
      </div>
    </div>
  );
}
