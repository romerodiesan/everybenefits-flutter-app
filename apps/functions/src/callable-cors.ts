/** CORS + App Check flag helpers (no Admin SDK side effects). */

export const PRODUCTION_ORIGINS = [
  "https://every-insurance.web.app",
  "https://every-insurance.firebaseapp.com",
  "https://pulse.everybenefits.us",
  "https://studio.everybenefits.us",
  "https://admin.everybenefits.us",
  "https://payments.everybenefits.us",
  "https://pulse-web-app--every-benefits-us.us-central1.hosted.app",
  "https://studio-web-app--every-benefits-us.us-central1.hosted.app",
  "https://admin-web-app--every-benefits-us.us-central1.hosted.app",
  "https://payments-web-app--every-benefits-us.us-central1.hosted.app",
] as const;

export const LOCAL_DEV_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3002",
  "http://localhost:3004",
  "http://127.0.0.1:3004",
] as const;

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

const APP_HOSTING_PREVIEW_SUFFIX =
  "-every-benefits-us.us-central1.hosted.app";

export function isAllowedCallableOrigin(
  origin: string,
  opts?: Parameters<typeof allowedCallableOrigins>[0],
): boolean {
  const trimmed = origin.trim();
  if (!trimmed) return false;
  if (allowedCallableOrigins(opts).includes(trimmed)) return true;
  try {
    const host = new URL(trimmed).hostname;
    return host.endsWith(APP_HOSTING_PREVIEW_SUFFIX);
  } catch {
    return false;
  }
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
  return [
    ...allowedCallableOrigins(opts),
    /^https:\/\/[a-z0-9-]+-every-benefits-us\.us-central1\.hosted\.app$/i,
  ];
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
