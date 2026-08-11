"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, Input, Label, Panel } from "@/components/ui/primitives";
import {
  hasPasswordProvider,
  signUpWithEmail,
  signInWithGoogle,
} from "@/lib/firebase/auth";
import { ensureProfile } from "@/lib/firebase/users";
import { isMultiFactorError, resolverFromError } from "@/lib/firebase/mfa";
import { MfaChallengeForm } from "@/components/auth/mfa-challenge-form";
import { useAuth } from "@/lib/providers/auth-provider";
import { legalUrls } from "@/lib/legal-links";
import {
  nextQuery,
  postLoginPath,
  readLoginNext,
  resolvePostAuthDestination,
} from "@/lib/auth-redirect";
import {
  composeDisplayName,
  normalizePersonName,
  validateFamilyName,
  validateGivenName,
} from "@/lib/roles";
import type { MultiFactorResolver } from "firebase/auth";
import { useSearchParams } from "next/navigation";

export function RegisterForm() {
  const t = useTranslations();
  const locale = useLocale();
  const legal = legalUrls(locale);
  const router = useRouter();
  const { user, profile, loading, profileLoading, refreshProfile } = useAuth();
  const params = useSearchParams();
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(
    null,
  );

  const nextParam = readLoginNext(params.get("next"));
  const q = nextQuery(nextParam);
  const afterAuth = postLoginPath(nextParam);

  useEffect(() => {
    if (loading || profileLoading || !user || mfaResolver) return;
    const dest = resolvePostAuthDestination({
      user,
      profile,
      next: nextParam,
      hasPassword: hasPasswordProvider(user),
    });
    router.replace(dest.path);
  }, [
    loading,
    profileLoading,
    user,
    profile,
    router,
    mfaResolver,
    nextParam,
  ]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t("setPasswordMismatch"));
      return;
    }
    const given = validateGivenName(givenName);
    if (!given.ok) {
      setError(
        given.issue === "email_as_name"
          ? t("validationNameEmail")
          : given.issue === "too_short"
            ? t("validationNameShort")
            : t("validationName"),
      );
      return;
    }
    const family = validateFamilyName(familyName);
    if (!family.ok) {
      setError(
        family.issue === "need_last_name"
          ? t("validationNameLast")
          : family.issue === "too_short"
            ? t("validationNameShort")
            : t("validationName"),
      );
      return;
    }
    const displayName = composeDisplayName(given.value, family.value);
    setBusy(true);
    setError(null);
    try {
      const cred = await signUpWithEmail(email.trim(), password, displayName);
      await ensureProfile(cred.user);
      await refreshProfile();
    } catch {
      setError(t("errorAuth"));
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    setError(null);
    try {
      const cred = await signInWithGoogle();
      await ensureProfile(cred.user);
      await refreshProfile();
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
        <Link href="/" className="font-display text-2xl font-extrabold">
          {t("brand")}
        </Link>
        {mfaResolver ? (
          <div className="mt-6">
            <MfaChallengeForm
              resolver={mfaResolver}
              onResolved={() => {
                setMfaResolver(null);
                router.replace(afterAuth);
              }}
              onCancel={() => setMfaResolver(null)}
            />
          </div>
        ) : (
          <>
        <h1 className="mt-6 font-display text-3xl font-bold">
          {t("registerTitle")}
        </h1>
        <p className="mt-2 text-muted">{t("registerSubtitle")}</p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t("givenName")}</Label>
              <Input
                value={givenName}
                onChange={(e) => setGivenName(e.target.value)}
                onBlur={() => setGivenName((v) => normalizePersonName(v))}
                placeholder={t("givenNamePlaceholder")}
                autoComplete="given-name"
                required
              />
            </div>
            <div>
              <Label>{t("familyName")}</Label>
              <Input
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                onBlur={() => setFamilyName((v) => normalizePersonName(v))}
                placeholder={t("familyNamePlaceholder")}
                autoComplete="family-name"
                required
              />
            </div>
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
          <p className="text-center text-xs leading-relaxed text-muted">
            {t.rich("registerLegalNotice", {
              terms: (chunks) => (
                <a href={legal.terms} className="text-brand hover:underline">
                  {chunks}
                </a>
              ),
              privacy: (chunks) => (
                <a href={legal.privacy} className="text-brand hover:underline">
                  {chunks}
                </a>
              ),
            })}
          </p>
        </form>

        <Button
          type="button"
          variant="secondary"
          className="mt-4 w-full"
          disabled={busy}
          onClick={() => void onGoogle()}
        >
          {t("signInGoogle")}
        </Button>

        <p className="mt-6 text-sm">
          <Link href={q ? `/login${q}` : "/login"} className="text-brand hover:underline">
            {t("backToLogin")}
          </Link>
        </p>
          </>
        )}
      </Panel>
    </div>
  );
}
