"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, Input, Label, Panel } from "@/components/ui/primitives";
import { signUpWithEmail, signInWithGoogle } from "@/lib/firebase/auth";
import { useAuth } from "@/lib/providers/auth-provider";

export function RegisterForm() {
  const t = useTranslations();
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user || !profile) return;
    if (!profile.profileCompleted && !profile.isAnonymous) {
      router.replace("/complete-profile");
    } else {
      router.replace("/home");
    }
  }, [loading, user, profile, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t("errorGeneric"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signUpWithEmail(email.trim(), password, displayName);
    } catch {
      setError(t("errorAuth"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mesh-bg flex min-h-[100svh] items-center justify-center px-4 py-10">
      <Panel className="w-full max-w-md">
        <Link href="/" className="font-display text-2xl font-extrabold">
          {t("brand")}
        </Link>
        <h1 className="mt-6 font-display text-3xl font-bold">
          {t("registerTitle")}
        </h1>
        <p className="mt-2 text-muted">{t("registerSubtitle")}</p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div>
            <Label>{t("displayName")}</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>{t("email")}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>{t("password")}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div>
            <Label>{t("confirmPassword")}</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {t("signUp")}
          </Button>
        </form>

        <Button
          type="button"
          variant="secondary"
          className="mt-4 w-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await signInWithGoogle();
            } catch {
              setError(t("errorAuth"));
            } finally {
              setBusy(false);
            }
          }}
        >
          {t("signInGoogle")}
        </Button>

        <p className="mt-6 text-sm">
          <Link href="/login" className="text-brand hover:underline">
            {t("backToLogin")}
          </Link>
        </p>
      </Panel>
    </div>
  );
}
