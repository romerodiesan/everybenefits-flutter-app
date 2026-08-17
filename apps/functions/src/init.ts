import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getStorage } from "firebase-admin/storage";
import { setGlobalOptions } from "firebase-functions/v2";
import {
  buildCallableCors,
  resolveEnforceAppCheck,
} from "./callable-cors";

export {
  buildCallableCors,
  isAllowedCallableOrigin,
  resolveEnforceAppCheck,
  PRODUCTION_ORIGINS,
  LOCAL_DEV_ORIGINS,
} from "./callable-cors";

function resolveProjectId(): string | undefined {
  return (
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCP_PROJECT?.trim() ||
    undefined
  );
}

function resolveDatabaseUrl(): string | undefined {
  const fromEnv = process.env.FIREBASE_DATABASE_URL?.trim();
  if (fromEnv) return fromEnv;
  const project = resolveProjectId();
  if (!project) return undefined;
  // Emulator + local Admin SDK need an explicit URL; the host redirect comes
  // from FIREBASE_DATABASE_EMULATOR_HOST set by the emulator suite.
  return `https://${project}-default-rtdb.firebaseio.com`;
}

/**
 * Default Storage bucket for Admin SDK uploads (logos, banners, avatars).
 * Emulator workers often boot without storageBucket on the default app.
 */
function resolveStorageBucket(): string | undefined {
  const fromEnv =
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    process.env.STORAGE_BUCKET?.trim();
  if (fromEnv) return fromEnv;
  const project = resolveProjectId();
  if (!project) return undefined;
  // Match apps/*/.env.example (legacy *.appspot.com bucket id).
  return `${project}.appspot.com`;
}

if (getApps().length === 0) {
  initializeApp({
    databaseURL: resolveDatabaseUrl(),
    storageBucket: resolveStorageBucket(),
  });
}

/** Explicit bucket helper — never relies on an empty default. */
export function storageBucket() {
  const name = resolveStorageBucket();
  return name ? getStorage().bucket(name) : getStorage().bucket();
}

/** Gen2 callables need explicit CORS for browser (e.g. localhost webapp). */
export const usingFunctionsEmulator = process.env.FUNCTIONS_EMULATOR === "true";

// Emulator workers return 429/resource-exhausted under low maxInstances when
// several callables cold-start; keep production capped.
setGlobalOptions({
  region: "us-central1",
  maxInstances: usingFunctionsEmulator ? 200 : 20,
});

const enforceAppCheck = resolveEnforceAppCheck();

export const callableOpts = {
  cors: buildCallableCors(),
  // Emulator clients skip App Check. Production enforces only when
  // FUNCTIONS_ENFORCE_APP_CHECK=true (see ADR-005).
  enforceAppCheck,
  // Auth is enforced inside the handler; Cloud Run must allow the OPTIONS preflight.
  invoker: "public" as const,
};

export const db = getFirestore();

let _rtdb: ReturnType<typeof getDatabase> | undefined;
/** Lazy RTDB — avoids requiring databaseURL during pure unit tests. */
export function getRtdb() {
  if (!_rtdb) _rtdb = getDatabase();
  return _rtdb;
}
/** @deprecated Prefer getRtdb() for lazy init in tests. */
export const rtdb = new Proxy({} as ReturnType<typeof getDatabase>, {
  get(_target, prop, receiver) {
    return Reflect.get(getRtdb() as object, prop, receiver);
  },
});

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
