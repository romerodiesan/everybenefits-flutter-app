"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button, Input, Label, Panel } from "@/components/ui/primitives";
import { ProfileFormSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/providers/auth-provider";
import {
  hasPasswordProvider,
  linkPassword,
  signOutEverywhere,
} from "@/lib/firebase/auth";
import { needsProfileCompletion } from "@/lib/roles";
import { useLocale } from "next-intl";

export function SetPasswordForm() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.isAnonymous || hasPasswordProvider()) {
      if (profile && needsProfileCompletion(profile) && !profile.isAnonymous) {
        router.replace("/complete-profile");
      } else {
        router.replace("/home");
      }
    }
  }, [loading, user, profile, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError(t("setPasswordMismatch"));
      return;
    }
    if (password !== confirm) {
      setError(t("setPasswordMismatch"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await linkPassword(password);
      if (profile && needsProfileCompletion(profile) && !profile.isAnonymous) {
        router.replace("/complete-profile");
      } else {
        router.replace("/home");
      }
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      if (
        code.includes("email-already-in-use") ||
        String(err).includes("EMAIL_EXISTS")
      ) {
        setError(t("setPasswordEmailInUse"));
      } else {
        setError(t("setPasswordFailed"));
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="mesh-bg flex min-h-[100svh] items-center justify-center px-4 py-10">
        <Panel className="w-full max-w-md">
          <ProfileFormSkeleton />
        </Panel>
      </div>
    );
  }

  return (
    <div className="mesh-bg flex min-h-[100svh] items-center justify-center px-4 py-10">
      <Panel className="w-full max-w-md">
        <h1 className="font-display text-3xl font-bold">{t("setPasswordTitle")}</h1>
        <p className="mt-2 text-muted">{t("setPasswordSubtitle")}</p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div>
            <Label>{t("password")}</Label>
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label>{t("confirmPassword")}</Label>
            <Input
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {t("setPasswordSave")}
          </Button>
        </form>
        <button
          type="button"
          className="mt-4 text-sm text-muted underline"
          onClick={() =>
            void signOutEverywhere({ current: "pulse", locale })
          }
        >
          {t("backToLogin")}
        </button>
      </Panel>
    </div>
  );
}
