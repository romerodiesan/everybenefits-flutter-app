import type { PulseAppId } from "@pulse/shared";
import {
  CODE_MIN_LEN,
  SSO_ATTEMPT_KEY,
  SSO_CODE_STASH_KEY,
  SSO_CUSTOM_TOKEN_KEY,
  SSO_LEGACY_HT_KEY,
} from "./constants";
import { SsoClientError, parseSsoErrorCode } from "./errors";
import type { SsoApiErrorBody, SsoErrorCode } from "./types";
import {
  appBaseUrl,
  handoffUrlWithCode,
  ssoConsumeUrl,
} from "./urls";

export type GetAppCheckToken = () => Promise<string | null | undefined>;

async function appCheckHeaders(
  getAppCheckToken?: GetAppCheckToken,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (!getAppCheckToken) return headers;
  try {
    const token = await getAppCheckToken();
    if (token) headers["x-firebase-appcheck"] = token;
  } catch {
    // Optional when App Check is not enforced locally.
  }
  return headers;
}

async function readErrorBody(res: Response): Promise<SsoApiErrorBody | null> {
  return (await res.json().catch(() => null)) as SsoApiErrorBody | null;
}

function throwFromResponse(
  res: Response,
  payload: SsoApiErrorBody | null,
  fallback: string,
): never {
  const code = parseSsoErrorCode(payload?.code);
  throw new SsoClientError(
    code === "unknown" && res.status === 429 ? "rate-limited" : code,
    payload?.error ?? fallback,
    res.status,
  );
}

/**
 * Mint an opaque handoff code on this origin, then build the sibling consume URL.
 * Never puts the Firebase ID token in the query string.
 */
export async function buildSsoHandoffUrl(
  consumeUrl: string,
  idToken: string,
  getAppCheckToken?: GetAppCheckToken,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch("/api/auth/create-sso-handoff", {
      method: "POST",
      headers: await appCheckHeaders(getAppCheckToken),
      body: JSON.stringify({ idToken }),
    });
  } catch {
    throw new SsoClientError("network", "Network error creating SSO handoff");
  }
  if (!res.ok) {
    throwFromResponse(
      res,
      await readErrorBody(res),
      `handoff failed (${res.status})`,
    );
  }
  const data = (await res.json()) as { code?: string };
  if (!data.code || data.code.length < CODE_MIN_LEN) {
    throw new SsoClientError("unknown", "handoff code missing");
  }
  return handoffUrlWithCode(consumeUrl, data.code);
}

export async function exchangeHandoffCode(
  code: string,
  getAppCheckToken?: GetAppCheckToken,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch("/api/auth/exchange-sso", {
      method: "POST",
      headers: await appCheckHeaders(getAppCheckToken),
      body: JSON.stringify({ code }),
    });
  } catch {
    throw new SsoClientError("network", "Network error exchanging SSO handoff");
  }
  if (!res.ok) {
    throwFromResponse(
      res,
      await readErrorBody(res),
      `exchange failed (${res.status})`,
    );
  }
  const data = (await res.json()) as { customToken?: string };
  if (!data.customToken) {
    throw new SsoClientError("unknown", "customToken missing");
  }
  return data.customToken;
}

/**
 * Resolve navigation URL when switching apps.
 * Signed-in users always use SSO handoff (throws on failure — no silent fallback).
 * Signed-out users get a plain destination URL.
 */
export async function resolveSwitchUrl(opts: {
  target: PulseAppId;
  homePath: string;
  locale: string;
  getIdToken: () => Promise<string | null>;
  getAppCheckToken?: GetAppCheckToken;
}): Promise<string> {
  const idToken = await opts.getIdToken();
  if (!idToken) {
    return `${appBaseUrl(opts.target)}/${opts.locale}${opts.homePath}`;
  }
  const consume = ssoConsumeUrl(opts.target, opts.locale, opts.homePath);
  return buildSsoHandoffUrl(consume, idToken, opts.getAppCheckToken);
}

/**
 * Read opaque handoff code from query. Stashes in sessionStorage for Strict Mode.
 * Strips legacy `ht` / hash idToken params without using them.
 */
export function takeHandoffCode(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const stashed = sessionStorage.getItem(SSO_CODE_STASH_KEY);
    if (stashed && stashed.length >= CODE_MIN_LEN) return stashed;
  } catch {
    // ignore
  }

  const url = new URL(window.location.href);
  let dirty = false;

  if (url.searchParams.has("ht")) {
    url.searchParams.delete("ht");
    dirty = true;
  }

  const fromQuery = url.searchParams.get("hc");
  if (fromQuery && fromQuery.length >= CODE_MIN_LEN) {
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

export function clearHandoffCodeStash() {
  try {
    sessionStorage.removeItem(SSO_CODE_STASH_KEY);
  } catch {
    // ignore
  }
}

export function readStashedCustomToken(): string | null {
  try {
    const token = sessionStorage.getItem(SSO_CUSTOM_TOKEN_KEY);
    return token && token.length > 20 ? token : null;
  } catch {
    return null;
  }
}

export function stashCustomToken(token: string) {
  try {
    sessionStorage.setItem(SSO_CUSTOM_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function clearStashedCustomToken() {
  try {
    sessionStorage.removeItem(SSO_CUSTOM_TOKEN_KEY);
  } catch {
    // ignore
  }
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
    sessionStorage.removeItem(SSO_LEGACY_HT_KEY);
  } catch {
    // ignore
  }
}

export function asSsoClientError(error: unknown): SsoClientError {
  if (error instanceof SsoClientError) return error;
  if (error instanceof Error && error.message === "missing-token") {
    return new SsoClientError("missing-token", error.message);
  }
  const code = (error as { ssoCode?: SsoErrorCode })?.ssoCode;
  if (code) {
    return new SsoClientError(
      parseSsoErrorCode(code),
      error instanceof Error ? error.message : "SSO failed",
      (error as { status?: number }).status,
    );
  }
  return new SsoClientError(
    "unknown",
    error instanceof Error ? error.message : "SSO failed",
  );
}
