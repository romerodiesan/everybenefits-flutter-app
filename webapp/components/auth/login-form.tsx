"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import {
  Button,
  Input,
  Label,
  Panel,
} from "@/components/ui/primitives";
import {
  completeMagicLink,
  sendMagicLink,
  signInAsGuest,
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/firebase/auth";
import { useAuth } from "@/lib/providers/auth-provider";

export function LoginForm() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const { user, profile, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const nextParam = params.get("next");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      window.location.href.includes("apiKey=") ||
      window.location.href.includes("oobCode=")
    ) {
      completeMagicLink(window.location.href)
        .then(() => router.replace("/home"))
        .catch(() => undefined);
    }
  }, [router]);

  useEffect(() => {
    if (loading || !user) return;
    // Redirect as soon as auth is known; profile may still be hydrating from cache/network.
    if (nextParam?.startsWith("/")) {
      window.location.assign(`/${locale}${nextParam}`);
      return;
    }
    if (profile && !profile.profileCompleted && !profile.isAnonymous) {
      router.replace("/complete-profile");
      return;
    }
    if (user) {
      router.replace("/home");
    }
  }, [loading, user, profile, router, nextParam, locale]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInWithEmail(email.trim(), password);
      // Optimistic: leave the login form immediately; AppShell paints with skeleton/cache.
      router.replace("/home");
    } catch {
      setError(t("errorAuth"));
      setBusy(false);
    }
  }

  return (
    <div className="mesh-bg flex min-h-[100svh] items-center justify-center px-4 py-10">
      <Panel className="w-full max-w-md">
        <Link href="/" className="font-display text-2xl font-extrabold">
          {t("brand")}
        </Link>
        <h1 className="mt-6 font-display text-3xl font-bold">{t("loginTitle")}</h1>
        <p className="mt-2 text-muted">{t("loginSubtitle")}</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <Label>{t("email")}</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <Label>{t("password")}</Label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {magicSent && (
            <p className="text-sm text-brand">{t("magicLinkSent")}</p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {t("signIn")}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted">
          <div className="h-px flex-1 bg-glass-border" />
          {t("or")}
          <div className="h-px flex-1 bg-glass-border" />
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await signInWithGoogle();
                router.replace("/home");
              } catch (err) {
                if (err instanceof Error && err.message === "cancelled") {
                  setBusy(false);
                  return;
                }
                setError(t("errorAuth"));
                setBusy(false);
              }
            }}
          >
            {t("signInGoogle")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={busy || !email}
            onClick={async () => {
              setBusy(true);
              try {
                await sendMagicLink(email.trim(), locale);
                setMagicSent(true);
              } catch {
                setError(t("errorGeneric"));
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("sendMagicLink")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await signInAsGuest();
                router.replace("/home");
              } catch {
                setError(t("errorAuth"));
                setBusy(false);
              }
            }}
          >
            {t("ctaGuest")}
          </Button>
        </div>

        <div className="mt-6 flex justify-between text-sm">
          <Link href="/forgot" className="text-muted hover:text-ink">
            {t("forgotPassword")}
          </Link>
          <Link href="/register" className="text-brand hover:underline">
            {t("ctaRegister")}
          </Link>
        </div>
      </Panel>
    </div>
  );
}
