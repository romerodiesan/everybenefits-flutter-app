/**
 * Consent-gated Firebase Analytics for Pulse web.
 *
 * Sentry is intentionally not added: mobile Crashlytics covers native crashes;
 * web stays on opt-in Analytics only (privacy-first / no extra vendor).
 *
 * Important: do NOT call getAnalytics() until the user opts in — initializing
 * the SDK injects googletagmanager.com/gtag even when collection is disabled.
 */
import { getFirebaseApp } from "@pulse/firebase-client";

const CONSENT_KEY = "pulse_analytics_consent_v1";

export function getAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

export async function setAnalyticsConsent(enabled: boolean): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CONSENT_KEY, enabled ? "1" : "0");
    } catch {
      // Ignore quota / private mode failures; collection still applies in-session.
    }
  }
  await applyAnalyticsCollection(enabled);
}

/** Apply stored consent (default: collection off). Safe to call on every boot. */
export async function hydrateTelemetry(): Promise<void> {
  await applyAnalyticsCollection(getAnalyticsConsent());
}

async function applyAnalyticsCollection(enabled: boolean): Promise<void> {
  if (typeof window === "undefined") return;
  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
  if (!measurementId) return;

  // GA disable flag works even before the gtag script exists.
  const disableKey = `ga-disable-${measurementId}`;
  (window as unknown as Record<string, boolean>)[disableKey] = !enabled;

  // Privacy-first: never inject gtag until the user opts in.
  if (!enabled) return;

  try {
    const { getAnalytics, isSupported, setAnalyticsCollectionEnabled } =
      await import("firebase/analytics");
    if (!(await isSupported())) return;
    const analytics = getAnalytics(getFirebaseApp());
    setAnalyticsCollectionEnabled(analytics, true);
  } catch {
    // Analytics optional — never block auth/boot.
  }
}
