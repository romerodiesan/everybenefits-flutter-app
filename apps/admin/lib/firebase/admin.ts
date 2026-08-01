import "server-only";

import { createFirebaseAdmin } from "@pulse/firebase-admin";

const admin = createFirebaseAdmin({ appName: "pulse-admin" });

export const getAdminApp = admin.getAdminApp;
export const adminAuth = admin.adminAuth;
export const adminAppCheck = admin.adminAppCheck;
export const adminDb = admin.adminDb;
export const usingEmulators = admin.usingEmulators;
