"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Button, Input, Label, Panel } from "@/components/ui/primitives";
import { ProfileFormSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/providers/auth-provider";
import {
  hasPasswordProvider,
  linkPassword,
  signOutAndRedirect,
} from "@/lib/firebase/auth";
import {
  nextQuery,
  readLoginNext,
  resolvePostAuthDestination,
} from "@/lib/auth-redirect";

export function SetPasswordForm() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const { user, profile, loading, profileLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextParam = readLoginNext(params.get("next"));
  const q = nextQuery(nextParam);

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) {
      router.replace(`/login${q}`);
      return;
    }
    if (user.isAnonymous || hasPasswordProvider(user)) {
      const dest = resolvePostAuthDestination({
        user,
        profile,
        next: nextParam,
        hasPassword: true,
      });
      router.replace(dest.path);
    }
  }, [loading, profileLoading, user, profile, router, nextParam, q]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError(t("setPasswordTooShort"));
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
      const dest = resolvePostAuthDestination({
        user,
        profile,
        next: nextParam,
        hasPassword: true,
      });
      router.replace(dest.path);
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
            void signOutAndRedirect({ current: "pulse", locale })
          }
        >
          {t("backToLogin")}
        </button>
      </Panel>
    </div>
  );
}
