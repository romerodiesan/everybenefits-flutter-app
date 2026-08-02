import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getAppCheck, type AppCheck } from "firebase-admin/app-check";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const APP_NAME = "pulse-ai";

/**
 * Service account JSON, either inline or base64 encoded. On Vercel the inline
 * form keeps newlines intact only when the value is a single-line JSON string,
 * so both encodings are accepted.
 */
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

export function getAdminApp(): App {
  const existing = getApps().find((app) => app.name === APP_NAME);
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
      APP_NAME,
    );
  } catch {
    // Another module initialised the same named app between the check and here.
    return getApp(APP_NAME);
  }
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function adminAppCheck(): AppCheck {
  return getAppCheck(getAdminApp());
}

let firestore: Firestore | null = null;

export function adminDb(): Firestore {
  if (firestore) return firestore;
  const db = getFirestore(getAdminApp());
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // settings() may only run once per Admin singleton. After Fast Refresh the
    // module cache resets but getFirestore() returns the same instance.
  }
  firestore = db;
  return db;
}

/**
 * True when the emulators are running locally. Admin SDK picks the emulator up
 * from FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST automatically.
 */
export function usingEmulators(): boolean {
  return Boolean(
    process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST,
  );
}
