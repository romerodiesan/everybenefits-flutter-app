"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { getToken } from "firebase/app-check";
import { onAuthStateChanged } from "firebase/auth";
import { signInWithCustomAuthToken } from "@/lib/firebase/auth";
import {
  getFirebaseAppCheck,
  getFirebaseAuth,
  initFirebaseClient,
} from "@pulse/firebase-client";
import { clearSsoAttempt, takeHandoffCode } from "@pulse/sso/client";
import { AdminShellSkeleton } from "@/components/chrome/admin-shell-skeleton";

const SSO_CUSTOM_TOKEN_KEY = "pulse_sso_ct";

async function exchangeHandoffCode(code: string): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const appCheck = getFirebaseAppCheck();
  if (appCheck) {
    try {
      headers["x-firebase-appcheck"] = (await getToken(appCheck, false)).token;
    } catch {
      // optional locally
    }
  }
  const res = await fetch("/api/auth/exchange-sso", {
    method: "POST",
    headers,
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as {
      error?: string;
      code?: string;
    } | null;
    const err = new Error(payload?.error ?? `exchange failed (${res.status})`) as Error & {
      status?: number;
      ssoCode?: string;
    };
    err.status = res.status;
    err.ssoCode = payload?.code;
    throw err;
  }
  const data = (await res.json()) as { customToken?: string };
  if (!data.customToken) throw new Error("customToken missing");
  return data.customToken;
}

function readStashedCustomToken(): string | null {
  try {
    const token = sessionStorage.getItem(SSO_CUSTOM_TOKEN_KEY);
    return token && token.length > 20 ? token : null;
  } catch {
    return null;
  }
}

function stashCustomToken(token: string) {
  try {
    sessionStorage.setItem(SSO_CUSTOM_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

function clearStashedCustomToken() {
  try {
    sessionStorage.removeItem(SSO_CUSTOM_TOKEN_KEY);
  } catch {
    // ignore
  }
}

function waitForSignedIn(timeoutMs = 8_000): Promise<boolean> {
  return new Promise((resolve) => {
    const auth = getFirebaseAuth();
    if (auth.currentUser) {
      resolve(true);
      return;
    }
    const timer = window.setTimeout(() => {
      unsub();
      resolve(Boolean(auth.currentUser));
    }, timeoutMs);
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      window.clearTimeout(timer);
      unsub();
      resolve(true);
    });
  });
}

type Step = "token" | "exchange" | "signin" | "open";

let ssoConsumePromise: Promise<void> | null = null;
let ssoConsumeDone = false;

function consumeSsoOnce(): Promise<void> {
  if (ssoConsumeDone) return Promise.resolve();
  if (ssoConsumePromise) return ssoConsumePromise;
  ssoConsumePromise = (async () => {
    initFirebaseClient();

    const stashedToken = readStashedCustomToken();
    if (stashedToken) {
      await signInWithCustomAuthToken(stashedToken);
      clearStashedCustomToken();
      clearSsoAttempt();
      ssoConsumeDone = true;
      return;
    }

    if (getFirebaseAuth().currentUser) {
      clearSsoAttempt();
      ssoConsumeDone = true;
      return;
    }

    const code = takeHandoffCode();
    if (!code) throw new Error("missing-token");

    let customToken: string;
    try {
      customToken = await exchangeHandoffCode(code);
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      if (status === 401 && (await waitForSignedIn(2_500))) {
        clearSsoAttempt();
        ssoConsumeDone = true;
        return;
      }
      throw error;
    }

    stashCustomToken(customToken);
    await signInWithCustomAuthToken(customToken);
    clearStashedCustomToken();
    clearSsoAttempt();
    ssoConsumeDone = true;
  })().catch((error) => {
    ssoConsumePromise = null;
    throw error;
  });
  return ssoConsumePromise;
}

/**
 * Consumes an opaque handoff code, mints a custom token, hard-navigates home.
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
          setStep("signin");
          await consumeSsoOnce();
        }
        if (!alive) return;
        setStep("open");
        const nextRaw = params.get("next") || homePath;
        const next = nextRaw.startsWith("/") ? nextRaw : `/${nextRaw}`;
        const dest = next === "/" ? `/${locale}` : `/${locale}${next}`;
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
      <div className="admin-bg flex min-h-screen items-center justify-center p-6 text-sm text-danger">
        {error}
      </div>
    );
  }

  return <AdminShellSkeleton hint={hint} />;
}
