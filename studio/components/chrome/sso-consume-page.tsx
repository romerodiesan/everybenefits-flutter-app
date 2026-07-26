"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { signInWithCustomAuthToken } from "@/lib/firebase/auth";
import { clearSsoAttempt, takeHandoffToken } from "@/lib/sso";
import { StudioShellSkeleton } from "@/components/chrome/studio-shell-skeleton";

async function exchangeIdToken(idToken: string): Promise<string> {
  const res = await fetch("/api/auth/exchange-sso", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? `exchange failed (${res.status})`);
  }
  const data = (await res.json()) as { customToken?: string };
  if (!data.customToken) throw new Error("customToken missing");
  return data.customToken;
}

type Step = "token" | "exchange" | "signin" | "open";

/**
 * Module lock — Strict Mode re-runs the effect and cancels the first run.
 * Keep in-flight work + a "done" flag so the second run still navigates away.
 */
let ssoConsumePromise: Promise<void> | null = null;
let ssoConsumeDone = false;

function consumeSsoOnce(): Promise<void> {
  if (ssoConsumeDone) return Promise.resolve();
  if (ssoConsumePromise) return ssoConsumePromise;
  ssoConsumePromise = (async () => {
    const idToken = takeHandoffToken();
    if (!idToken) throw new Error("missing-token");
    const customToken = await exchangeIdToken(idToken);
    await signInWithCustomAuthToken(customToken);
    clearSsoAttempt();
    ssoConsumeDone = true;
  })().catch((error) => {
    ssoConsumePromise = null;
    throw error;
  });
  return ssoConsumePromise;
}

/**
 * Consumes a handoff token, mints a custom token, hard-navigates home.
 * Soft router.replace was cancelled by Strict Mode cleanup after a successful
 * sign-in, leaving the user stuck on this page with a live session.
 */
export function SsoConsumePage({ homePath = "/" }: { homePath?: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("token");

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        if (!ssoConsumeDone) {
          setStep("exchange");
          const idToken = takeHandoffToken();
          if (!idToken && !ssoConsumePromise) {
            if (alive) setError(t("ssoMissingToken"));
            return;
          }
          setStep("signin");
          await consumeSsoOnce();
        }
        if (!alive) return;
        setStep("open");
        const nextRaw = params.get("next") || homePath;
        const next = nextRaw.startsWith("/") ? nextRaw : `/${nextRaw}`;
        const dest = next === "/" ? `/${locale}` : `/${locale}${next}`;
        // Hard nav leaves /auth/sso reliably (soft replace raced Strict Mode).
        window.location.replace(dest);
      } catch (err) {
        if (!alive) return;
        if (err instanceof Error && err.message === "missing-token") {
          setError(t("ssoMissingToken"));
        } else {
          setError(t("ssoFailed"));
        }
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [homePath, locale, params, t]);

  const hint =
    step === "exchange"
      ? t("ssoStepExchange")
      : step === "signin"
        ? t("ssoStepSignIn")
        : step === "open"
          ? t("ssoStepOpen")
          : t("ssoSigningIn");

  if (error) {
    return (
      <div className="studio-bg flex min-h-screen items-center justify-center p-6 text-sm text-danger">
        {error}
      </div>
    );
  }

  return <StudioShellSkeleton hint={hint} />;
}
