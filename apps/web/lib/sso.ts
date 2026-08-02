/**
 * Cross-origin SSO between Pulse (learner) and Studio (authoring).
 *
 * Firebase Auth persistence is per-origin, so we hand off via:
 * 1) source POSTs its ID token to `/api/auth/create-sso-handoff` (never in URL)
 * 2) redirect to dest `/auth/sso?next=…&hc=<opaque-code>`
 * 3) dest exchanges the code for a custom token and signs in
 */

import { getToken } from "firebase/app-check";
import { getFirebaseAppCheck } from "@/lib/firebase/client";

export type PulseAppId = "pulse" | "studio" | "admin";

const SSO_ATTEMPT_KEY = "pulse_sso_attempt";
const SSO_CODE_STASH_KEY = "pulse_sso_hc";

export function pulseWebUrl() {
  return (
    process.env.NEXT_PUBLIC_PULSE_WEB_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function studioWebUrl() {
  return (
    process.env.NEXT_PUBLIC_STUDIO_URL?.replace(/\/$/, "") ||
    "http://localhost:3001"
  );
}

export function adminWebUrl() {
  return (
    process.env.NEXT_PUBLIC_ADMIN_URL?.replace(/\/$/, "") ||
    "http://localhost:3002"
  );
}

export function appBaseUrl(app: PulseAppId) {
  if (app === "studio") return studioWebUrl();
  if (app === "admin") return adminWebUrl();
  return pulseWebUrl();
}

/** Prefer Pulse as the SSO hub for silent bridges. */
export function siblingApp(app: PulseAppId): PulseAppId {
  if (app !== "pulse") return "pulse";
  return "studio";
}

export function otherApps(current: PulseAppId): PulseAppId[] {
  return (["pulse", "studio", "admin"] as const).filter((app) => app !== current);
}

export function ssoConsumeUrl(
  app: PulseAppId,
  locale: string,
  nextPath = "/",
) {
  const next = encodeURIComponent(
    nextPath.startsWith("/") ? nextPath : `/${nextPath}`,
  );
  return `${appBaseUrl(app)}/${locale}/auth/sso?next=${next}`;
}

export function ssoBridgeUrl(
  app: PulseAppId,
  locale: string,
  returnUrl: string,
) {
  return `${appBaseUrl(app)}/${locale}/auth/bridge?return=${encodeURIComponent(returnUrl)}`;
}

export function handoffUrlWithCode(consumeUrl: string, code: string) {
  const url = new URL(consumeUrl.split("#")[0]);
  url.searchParams.set("hc", code);
  return url.toString();
}

async function appCheckHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const appCheck = getFirebaseAppCheck();
  if (!appCheck) return headers;
  try {
    headers["x-firebase-appcheck"] = (await getToken(appCheck, false)).token;
  } catch {
    // Optional when App Check is not enforced locally.
  }
  return headers;
}

/**
 * Mint an opaque handoff code on this origin, then build the sibling consume URL.
 * Never puts the Firebase ID token in the query string.
 */
export async function buildSsoHandoffUrl(
  consumeUrl: string,
  idToken: string,
): Promise<string> {
  const res = await fetch("/api/auth/create-sso-handoff", {
    method: "POST",
    headers: await appCheckHeaders(),
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? `handoff failed (${res.status})`);
  }
  const data = (await res.json()) as { code?: string };
  if (!data.code || data.code.length < 32) {
    throw new Error("handoff code missing");
  }
  return handoffUrlWithCode(consumeUrl, data.code);
}

/**
 * Read opaque handoff code from query. Stashes in sessionStorage for Strict Mode.
 * Strips legacy `ht` / hash idToken params without using them.
 */
export function takeHandoffCode(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const stashed = sessionStorage.getItem(SSO_CODE_STASH_KEY);
    if (stashed && stashed.length >= 32) return stashed;
  } catch {
    // ignore
  }

  const url = new URL(window.location.href);
  let dirty = false;

  // Strip legacy JWT handoffs if present — never consume them from the URL.
  if (url.searchParams.has("ht")) {
    url.searchParams.delete("ht");
    dirty = true;
  }

  const fromQuery = url.searchParams.get("hc");
  if (fromQuery && fromQuery.length >= 32) {
    try {
      sessionStorage.setItem(SSO_CODE_STASH_KEY, fromQuery);
    } catch {
      // ignore
    }
    url.searchParams.delete("hc");
    dirty = true;
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    return fromQuery;
  }

  const hash = window.location.hash.replace(/^#/, "");
  if (hash.includes("idToken=")) {
    dirty = true;
    const { pathname, search } = window.location;
    window.history.replaceState(null, "", `${pathname}${search}`);
  } else if (dirty) {
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }

  return null;
}

export function markSsoAttempted() {
  try {
    sessionStorage.setItem(SSO_ATTEMPT_KEY, "1");
  } catch {
    // ignore
  }
}

export function hasSsoAttempted() {
  try {
    return sessionStorage.getItem(SSO_ATTEMPT_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearSsoAttempt() {
  try {
    sessionStorage.removeItem(SSO_ATTEMPT_KEY);
    sessionStorage.removeItem(SSO_CODE_STASH_KEY);
    sessionStorage.removeItem("pulse_sso_ht");
  } catch {
    // ignore
  }
}

/** Absolute logout URL on `app`; after signing out, redirects to `nextUrl`. */
export function logoutCascadeUrl(app: PulseAppId, locale: string, nextUrl: string) {
  return `${appBaseUrl(app)}/${locale}/auth/logout?next=${encodeURIComponent(nextUrl)}`;
}

/** Only Pulse/Studio origins (or same-origin relative paths) may be logout `next` targets. */
export function isAllowedLogoutNext(url: string): boolean {
  try {
    if (url.startsWith("/") && !url.startsWith("//")) return true;
    const parsed = new URL(url);
    const allowed = new Set([
      new URL(pulseWebUrl()).origin,
      new URL(studioWebUrl()).origin,
      new URL(adminWebUrl()).origin,
    ]);
    return allowed.has(parsed.origin);
  } catch {
    return false;
  }
}
