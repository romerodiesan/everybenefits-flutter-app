import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getAppCheck, type AppCheck } from "firebase-admin/app-check";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

export type FirebaseAdminAppName =
  | "pulse-admin"
  | "pulse-studio"
  | "pulse-ai"
  | (string & {});

export type FirebaseAdminOptions = {
  appName: FirebaseAdminAppName;
  /** When true, also treat NEXT_PUBLIC_USE_FIREBASE_EMULATORS as emulator mode. */
  checkPublicEmulatorFlag?: boolean;
};

export type FirebaseAdminApi = {
  getAdminApp: () => App;
  adminAuth: () => Auth;
  adminAppCheck: () => AppCheck;
  adminDb: () => Firestore;
  usingEmulators: () => boolean;
};

function readServiceAccount() {
  const raw =
    process.env.SERVICE_ACCOUNT_KEY ??
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ??
    process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw?.trim()) return null;

  const text = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");

  const parsed = JSON.parse(text) as {
    project_id?: string;
    projectId?: string;
    client_email?: string;
    clientEmail?: string;
    private_key?: string;
    privateKey?: string;
  };

  const projectId = parsed.project_id ?? parsed.projectId;
  const clientEmail = parsed.client_email ?? parsed.clientEmail;
  const privateKey = (parsed.private_key ?? parsed.privateKey)?.replace(
    /\\n/g,
    "\n",
  );
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

/**
 * Creates a named Firebase Admin SDK bootstrap for a Next.js app.
 * Each host app should call this once with a unique `appName`.
 */
export function createFirebaseAdmin(
  options: FirebaseAdminOptions,
): FirebaseAdminApi {
  const { appName, checkPublicEmulatorFlag = true } = options;
  let firestore: Firestore | null = null;

  function getAdminApp(): App {
    const existing = getApps().find((app) => app.name === appName);
    if (existing) return existing;

    const serviceAccount = readServiceAccount();
    const projectId =
      serviceAccount?.projectId ??
      process.env.FIREBASE_PROJECT_ID ??
      process.env.GOOGLE_CLOUD_PROJECT ??
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!projectId) {
      throw new Error(
        "Firebase Admin is not configured: set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_PROJECT_ID.",
      );
    }

    try {
      return initializeApp(
        serviceAccount
          ? { credential: cert(serviceAccount), projectId }
          : { projectId },
        appName,
      );
    } catch {
      return getApp(appName);
    }
  }

  function adminAuth(): Auth {
    return getAuth(getAdminApp());
  }

  function adminAppCheck(): AppCheck {
    return getAppCheck(getAdminApp());
  }

  function adminDb(): Firestore {
    if (firestore) return firestore;
    const db = getFirestore(getAdminApp());
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      // settings() may only run once per Admin singleton.
    }
    firestore = db;
    return db;
  }

  function usingEmulators(): boolean {
    return Boolean(
      process.env.FIRESTORE_EMULATOR_HOST ||
        process.env.FIREBASE_AUTH_EMULATOR_HOST ||
        (checkPublicEmulatorFlag &&
          process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true"),
    );
  }

  return { getAdminApp, adminAuth, adminAppCheck, adminDb, usingEmulators };
}
