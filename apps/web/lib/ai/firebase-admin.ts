import "server-only";

import { createFirebaseAdmin } from "@pulse/firebase-admin";

/** Shared Admin SDK for Pulse AI + SSO (named app keeps AI routes isolated). */
const admin = createFirebaseAdmin({
  appName: "pulse-ai",
  checkPublicEmulatorFlag: false,
});

export const getAdminApp = admin.getAdminApp;
export const adminAuth = admin.adminAuth;
export const adminAppCheck = admin.adminAppCheck;
export const adminDb = admin.adminDb;
export const usingEmulators = admin.usingEmulators;
