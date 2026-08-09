"use client";

import { FormEvent, useEffect, useEffectEvent, useState } from "react";
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
  hasPasswordProvider,
  sendMagicLink,
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/firebase/auth";
import { isMultiFactorError, resolverFromError } from "@/lib/firebase/mfa";
import { MfaChallengeForm } from "@/components/auth/mfa-challenge-form";
import { useAuth } from "@/lib/providers/auth-provider";
import type { MultiFactorResolver } from "firebase/auth";
import { BrandMark } from "@/components/chrome/brand-mark";
import {
  nextQuery,
  readLoginNext,
  resolvePostAuthDestination,
} from "@/lib/auth-redirect";

export function LoginForm() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const { user, profile, loading, profileLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(
    null,
  );

  const nextParam = readLoginNext(params.get("next"));
  const q = nextQuery(nextParam);

  const routeAfterAuth = useEffectEvent(() => {
    if (!user) return;
    const dest = resolvePostAuthDestination({
      user,
      profile,
      next: nextParam,
      hasPassword: hasPasswordProvider(user),
    });
    router.replace(dest.path);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      window.location.href.includes("apiKey=") ||
      window.location.href.includes("oobCode=")
    ) {
      completeMagicLink(window.location.href)
        .then(() => {
          // Effect below routes once profile/gates settle.
        })
        .catch(() => {
          setError(t("errorAuth"));
        });
    }
  }, [t]);

  useEffect(() => {
    if (loading || profileLoading || !user || mfaResolver) return;
    routeAfterAuth();
  }, [loading, profileLoading, user, profile, mfaResolver, routeAfterAuth]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInWithEmail(email.trim(), password);
      // Navigation via routeAfterAuth effect after profile hydrate.
    } catch (err) {
      if (isMultiFactorError(err)) {
        setMfaResolver(resolverFromError(err));
      } else {
        setError(t("errorAuth"));
      }
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
      // Navigation via routeAfterAuth effect after profile hydrate.
    } catch (err) {
      if (String(err).includes("cancelled")) {
        setBusy(false);
        return;
      }
      if (isMultiFactorError(err)) {
        setMfaResolver(resolverFromError(err));
      } else {
        setError(t("errorAuth"));
      }
      setBusy(false);
    }
  }

  return (
    <div className="mesh-bg flex min-h-[100svh] items-center justify-center px-4 py-10">
      <Panel className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 font-display text-2xl font-extrabold"
        >
          <BrandMark size={36} priority />
          {t("brand")}
        </Link>
        {mfaResolver ? (
          <div className="mt-6">
            <MfaChallengeForm
              resolver={mfaResolver}
              onResolved={() => {
                setMfaResolver(null);
              }}
              onCancel={() => setMfaResolver(null)}
            />
          </div>
        ) : (
          <>
            <h1 className="mt-6 font-display text-3xl font-bold">
              {t("loginTitle")}
            </h1>
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

            <div className="my-5 flex items-center gap-2.5 text-xs uppercase tracking-wider text-muted">
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
                onClick={() => void onGoogle()}
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
            </div>

            <div className="mt-6 flex justify-between text-sm">
              <Link href="/forgot" className="text-muted hover:text-ink">
                {t("forgotPassword")}
              </Link>
              <Link
                href={q ? `/register${q}` : "/register"}
                className="text-brand hover:underline"
              >
                {t("ctaRegister")}
              </Link>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
