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
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from "firebase/app-check";

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

let appCheckInitialized = false;
let emulatorsConnected = false;

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApp();
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

export function initFirebaseClient() {
  if (typeof window === "undefined") return;

  const app = getFirebaseApp();
  // Touch RTDB once so config/URL errors surface early with a clear message.
  try {
    getFirebaseRtdb();
  } catch (error) {
    console.warn("Realtime Database init failed:", error);
  }

  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
  if (siteKey && !appCheckInitialized) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      }) as AppCheck;
      appCheckInitialized = true;
    } catch (error) {
      console.warn("App Check init skipped:", error);
    }
  }

  const useEmulators =
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
  if (useEmulators && !emulatorsConnected) {
    connectAuthEmulator(getFirebaseAuth(), "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(getFirebaseDb(), "127.0.0.1", 8080);
    connectDatabaseEmulator(getFirebaseRtdb(), "127.0.0.1", 9000);
    connectStorageEmulator(getFirebaseStorage(), "127.0.0.1", 9199);
    connectFunctionsEmulator(getFirebaseFunctions(), "127.0.0.1", 5001);
    emulatorsConnected = true;
  }
}
