/**
 * Shared Firebase web client bootstrap used by Pulse / Studio / Admin / Payments.
 * App Check initializes only when NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY is set
 * (ADR-005 — Enforce remains an ops step).
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import {
  getDatabase,
  connectDatabaseEmulator,
  type Database,
} from "firebase/database";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";
import {
  getFunctions,
  connectFunctionsEmulator,
  type Functions,
} from "firebase/functions";
import type { AppCheck } from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let emulatorsConnected = false;
let appCheckInstance: AppCheck | null | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApp();
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error(
      "Firebase web config missing. Set NEXT_PUBLIC_FIREBASE_* in .env.local.",
    );
  }
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export function getFirebaseRtdb(): Database {
  const app = getFirebaseApp();
  const url = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  return url ? getDatabase(app, url) : getDatabase(app);
}

export function getFirebaseStorage(): FirebaseStorage {
  return getStorage(getFirebaseApp());
}

export function getFirebaseFunctions(): Functions {
  const region =
    process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION ?? "us-central1";
  return getFunctions(getFirebaseApp(), region);
}

/**
 * Returns an initialized App Check instance when
 * `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` is set; otherwise null.
 * Does not enforce tokens — Functions/SSO flags control enforcement (ADR-005).
 */
export function getFirebaseAppCheck(): AppCheck | null {
  if (typeof window === "undefined") return null;
  if (appCheckInstance !== undefined) return appCheckInstance;

  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY?.trim();
  if (!siteKey) {
    appCheckInstance = null;
    return null;
  }

  try {
    // Dynamic import keeps the App Check chunk out of cold paths when unset.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {
      initializeAppCheck,
      ReCaptchaEnterpriseProvider,
    } = require("firebase/app-check") as typeof import("firebase/app-check");
    appCheckInstance = initializeAppCheck(getFirebaseApp(), {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    console.warn("App Check init skipped:", error);
    appCheckInstance = null;
  }
  return appCheckInstance;
}

export function initFirebaseClient() {
  if (typeof window === "undefined") return;

  getFirebaseApp();
  getFirebaseAppCheck();

  const useEmulators =
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
  if (useEmulators && !emulatorsConnected) {
    // Loopback when the page is on localhost — LAN IPs (phones/Flutter) often
    // go stale and cause auth/network-request-failed → Firestore offline.
    // Only use NEXT_PUBLIC_FIREBASE_EMULATOR_HOST when browsing via that host.
    const pageHost = window.location.hostname;
    const fromEnv = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST?.trim();
    const host =
      pageHost === "localhost" || pageHost === "127.0.0.1"
        ? pageHost
        : fromEnv || pageHost;
    // Connect BEFORE any Auth/Firestore/RTDB use — otherwise the SDK may latch
    // onto production and ignore later connect*Emulator calls.
    try {
      const auth = getFirebaseAuth();
      // Auth emulator cannot exercise production reCAPTCHA Enterprise keys;
      // without this, SMS MFA / phone verify fails with "Invalid site key".
      auth.settings.appVerificationDisabledForTesting = true;
      connectAuthEmulator(auth, `http://${host}:9099`, {
        disableWarnings: true,
      });
      connectFirestoreEmulator(getFirebaseDb(), host, 8080);
      connectDatabaseEmulator(getFirebaseRtdb(), host, 9000);
      connectStorageEmulator(getFirebaseStorage(), host, 9199);
      connectFunctionsEmulator(getFirebaseFunctions(), host, 5001);
    } catch (error) {
      // HMR / Strict Mode can re-enter after emulators are already attached.
      console.warn("Firebase emulator connect skipped:", error);
    }
    emulatorsConnected = true;
  }
}
