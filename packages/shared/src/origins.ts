/**
 * Canonical browser origins for Pulse-family apps.
 * Callables CORS, SSO allowlists, and CSP form/connect extras share this list.
 */

export const PRODUCTION_APP_ORIGINS = [
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

export const LOCAL_DEV_APP_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3002",
  "http://localhost:3004",
  "http://127.0.0.1:3004",
] as const;

export const APP_HOSTING_PREVIEW_SUFFIX =
  "-every-benefits-us.us-central1.hosted.app";

export const APP_HOSTING_PREVIEW_ORIGIN_RE =
  /^https:\/\/[a-z0-9-]+-every-benefits-us\.us-central1\.hosted\.app$/i;

export function isAppHostingPreviewOrigin(origin: string): boolean {
  const trimmed = origin.trim();
  if (!trimmed.startsWith("https://")) return false;
  const host = trimmed.slice("https://".length).split("/")[0] ?? "";
  return host.endsWith(APP_HOSTING_PREVIEW_SUFFIX);
}

/** Space-separated production origins for CSP directives. */
export function productionAppOriginsCsp(): string {
  return PRODUCTION_APP_ORIGINS.join(" ");
}
