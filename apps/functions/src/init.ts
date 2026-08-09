import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getStorage } from "firebase-admin/storage";
import { setGlobalOptions } from "firebase-functions/v2";

function resolveDatabaseUrl(): string | undefined {
  const fromEnv = process.env.FIREBASE_DATABASE_URL?.trim();
  if (fromEnv) return fromEnv;
  const project =
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim();
  if (!project) return undefined;
  // Emulator + local Admin SDK need an explicit URL; the host redirect comes
  // from FIREBASE_DATABASE_EMULATOR_HOST set by the emulator suite.
  return `https://${project}-default-rtdb.firebaseio.com`;
}

if (getApps().length === 0) {
  initializeApp({
    databaseURL: resolveDatabaseUrl(),
  });
}
setGlobalOptions({ region: "us-central1", maxInstances: 20 });

/** Gen2 callables need explicit CORS for browser (e.g. localhost webapp). */
const usingFunctionsEmulator = process.env.FUNCTIONS_EMULATOR === "true";
/** Opt-out: set FUNCTIONS_ENFORCE_APP_CHECK=false only for emergency. Prod defaults on. */
const enforceAppCheck =
  !usingFunctionsEmulator &&
  process.env.FUNCTIONS_ENFORCE_APP_CHECK !== "false";

export const callableOpts = {
  // Emulator Gen2 often drops Access-Control headers on preflight when cors is
  // an allow-list; open it fully locally. Production keeps an explicit list.
  cors: usingFunctionsEmulator
    ? true
    : [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "https://every-insurance.web.app",
        "https://every-insurance.firebaseapp.com",
        "https://pulse.everybenefits.us",
        "https://studio.everybenefits.us",
        "https://admin.everybenefits.us",
        "https://pulse-web-app--every-benefits-us.us-central1.hosted.app",
        "https://studio-web-app--every-benefits-us.us-central1.hosted.app",
        "https://admin-web-app--every-benefits-us.us-central1.hosted.app",
        ...(process.env.FUNCTIONS_ALLOWED_ORIGINS ?? "")
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean),
      ],
  // Emulator clients skip App Check. Production enforces unless
  // FUNCTIONS_ENFORCE_APP_CHECK=false (emergency only).
  enforceAppCheck,
  // Auth is enforced inside the handler; Cloud Run must allow the OPTIONS preflight.
  invoker: "public" as const,
};

export const db = getFirestore();
export const rtdb = getDatabase();

/**
 * Compatibility facade for call sites that used `import * as admin from "firebase-admin"`.
 * Prefer modular `getAuth()` / `getMessaging()` in new code.
 */
export const admin = {
  auth: getAuth,
  messaging: getMessaging,
  storage: getStorage,
  firestore: Object.assign(getFirestore, {
    // Namespace-style access used as `admin.firestore.DocumentData` in older files
    // is replaced by modular DocumentData imports; keep runtime shape only.
  }),
  database: getDatabase,
  apps: getApps(),
};
