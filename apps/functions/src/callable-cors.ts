/** CORS + App Check flag helpers (no Admin SDK side effects). */

import {
  APP_HOSTING_PREVIEW_ORIGIN_RE,
  LOCAL_DEV_APP_ORIGINS,
  PRODUCTION_APP_ORIGINS,
  isAppHostingPreviewOrigin,
} from "@pulse/shared";

export const PRODUCTION_ORIGINS = PRODUCTION_APP_ORIGINS;
export const LOCAL_DEV_ORIGINS = LOCAL_DEV_APP_ORIGINS;

/**
 * CORS for Gen2 callables.
 * - Emulator: open (preflight quirks).
 * - Production: everybenefits.us + App Hosting default domains.
 * - Preview App Hosting: `*-every-benefits-us.us-central1.hosted.app`
 *   (also set FUNCTIONS_ALLOWED_ORIGINS for any other staging hosts).
 * Localhost is never included in production unless FUNCTIONS_ALLOW_LOCALHOST=true
 * (emergency / preview only).
 */
export function allowedCallableOrigins(
  opts: {
    emulator?: boolean;
    allowLocalhost?: boolean;
    extraOrigins?: string;
  } = {},
): string[] {
  const allowLocalhost =
    opts.allowLocalhost ?? process.env.FUNCTIONS_ALLOW_LOCALHOST === "true";
  const extra = (opts.extraOrigins ?? process.env.FUNCTIONS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [
    ...PRODUCTION_ORIGINS,
    ...(allowLocalhost ? LOCAL_DEV_ORIGINS : []),
    ...extra,
  ];
}

export function isAllowedCallableOrigin(
  origin: string,
  opts?: Parameters<typeof allowedCallableOrigins>[0],
): boolean {
  const trimmed = origin.trim();
  if (!trimmed) return false;
  if (allowedCallableOrigins(opts).includes(trimmed)) return true;
  return isAppHostingPreviewOrigin(trimmed);
}

export function buildCallableCors(
  opts: {
    emulator?: boolean;
    allowLocalhost?: boolean;
    extraOrigins?: string;
  } = {},
): true | Array<string | RegExp> {
  const emulator =
    opts.emulator ?? process.env.FUNCTIONS_EMULATOR === "true";
  if (emulator) return true;
  return [...allowedCallableOrigins(opts), APP_HOSTING_PREVIEW_ORIGIN_RE];
}

/** Opt-in: set FUNCTIONS_ENFORCE_APP_CHECK=true when App Check is ready. */
export function resolveEnforceAppCheck(
  opts: { emulator?: boolean; enforceEnv?: string } = {},
): boolean {
  const emulator =
    opts.emulator ?? process.env.FUNCTIONS_EMULATOR === "true";
  if (emulator) return false;
  const raw = opts.enforceEnv ?? process.env.FUNCTIONS_ENFORCE_APP_CHECK;
  return raw === "true";
}
