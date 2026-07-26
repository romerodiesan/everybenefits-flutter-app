/**
 * Cross-origin SSO between Pulse (learner) and Studio (authoring).
 * See studio/lib/sso.ts for the flow.
 */

export type PulseAppId = "pulse" | "studio";

const SSO_ATTEMPT_KEY = "pulse_sso_attempt";
const SSO_TOKEN_STASH_KEY = "pulse_sso_ht";

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

export function appBaseUrl(app: PulseAppId) {
  return app === "studio" ? studioWebUrl() : pulseWebUrl();
}

export function siblingApp(app: PulseAppId): PulseAppId {
  return app === "studio" ? "pulse" : "studio";
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

export function handoffUrlWithToken(consumeUrl: string, idToken: string) {
  const url = new URL(consumeUrl.split("#")[0]);
  url.searchParams.set("ht", idToken);
  return url.toString();
}

/**
 * Read handoff token from query (preferred) or legacy hash.
 * Keeps a sessionStorage stash so React Strict Mode effect re-runs still see it;
 * clear via `clearSsoAttempt` after a successful sign-in.
 */
export function takeHandoffToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const stashed = sessionStorage.getItem(SSO_TOKEN_STASH_KEY);
    if (stashed && stashed.length > 20) return stashed;
  } catch {
    // ignore
  }

  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get("ht");
  if (fromQuery && fromQuery.length > 20) {
    try {
      sessionStorage.setItem(SSO_TOKEN_STASH_KEY, fromQuery);
    } catch {
      // ignore
    }
    url.searchParams.delete("ht");
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    return fromQuery;
  }

  const hash = window.location.hash.replace(/^#/, "");
  const fromHash = new URLSearchParams(hash).get("idToken");
  if (fromHash && fromHash.length > 20) {
    try {
      sessionStorage.setItem(SSO_TOKEN_STASH_KEY, fromHash);
    } catch {
      // ignore
    }
    const { pathname, search } = window.location;
    window.history.replaceState(null, "", `${pathname}${search}`);
    return fromHash;
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
    sessionStorage.removeItem(SSO_TOKEN_STASH_KEY);
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
    ]);
    return allowed.has(parsed.origin);
  } catch {
    return false;
  }
}
