/**
 * Cross-origin SSO between Pulse (learner) and Studio (authoring).
 *
 * Firebase Auth persistence is per-origin, so localhost:3000 and :3001 (or
 * pulse.* / studio.*) do not share sessions. We hand off via:
 * 1) source gets an ID token
 * 2) redirect to dest `/auth/sso?next=…&ht=…` (query survives middleware redirects;
 *    hash alone is dropped on 3xx and also breaks under React Strict Mode)
 * 3) dest exchanges it for a custom token (`exchangeSsoToken`) and signs in
 *
 * `/auth/bridge` on an app that already has a session completes the handoff
 * when the other app asks “are you signed in?”.
 */

export type PulseAppId = "pulse" | "studio";

const SSO_ATTEMPT_KEY = "pulse_sso_attempt";
/** Same-tab stash so Strict Mode remounts still see the token once. */
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

/** Absolute SSO consume URL on `app`, with optional post-login path. */
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

/** Absolute bridge URL: if this app has a session, hand off to `returnUrl`. */
export function ssoBridgeUrl(
  app: PulseAppId,
  locale: string,
  returnUrl: string,
) {
  return `${appBaseUrl(app)}/${locale}/auth/bridge?return=${encodeURIComponent(returnUrl)}`;
}

/**
 * Build the URL we send users to when switching apps while signed in.
 * Token goes in the `ht` query param so locale middleware redirects keep it.
 */
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
