"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFirebaseApp = getFirebaseApp;
exports.getFirebaseAuth = getFirebaseAuth;
exports.getFirebaseDb = getFirebaseDb;
exports.getFirebaseRtdb = getFirebaseRtdb;
exports.getFirebaseStorage = getFirebaseStorage;
exports.getFirebaseFunctions = getFirebaseFunctions;
exports.getFirebaseAppCheck = getFirebaseAppCheck;
exports.initFirebaseClient = initFirebaseClient;
const app_1 = require("firebase/app");
const auth_1 = require("firebase/auth");
const firestore_1 = require("firebase/firestore");
const database_1 = require("firebase/database");
const storage_1 = require("firebase/storage");
const functions_1 = require("firebase/functions");
const app_check_1 = require("firebase/app-check");
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
let appCheck = null;
let emulatorsConnected = false;
function getFirebaseApp() {
    if ((0, app_1.getApps)().length)
        return (0, app_1.getApp)();
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        throw new Error("Firebase web config missing. Set NEXT_PUBLIC_FIREBASE_* in .env.local.");
    }
    return (0, app_1.initializeApp)(firebaseConfig);
}
function getFirebaseAuth() {
    return (0, auth_1.getAuth)(getFirebaseApp());
}
function getFirebaseDb() {
    return (0, firestore_1.getFirestore)(getFirebaseApp());
}
function getFirebaseRtdb() {
    const app = getFirebaseApp();
    const url = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
    return url ? (0, database_1.getDatabase)(app, url) : (0, database_1.getDatabase)(app);
}
function getFirebaseStorage() {
    return (0, storage_1.getStorage)(getFirebaseApp());
}
function getFirebaseFunctions() {
    const region = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION ?? "us-central1";
    return (0, functions_1.getFunctions)(getFirebaseApp(), region);
}
/**
 * The App Check instance, when configured. SDK calls attach tokens on their
 * own; this exists for hand-rolled `fetch` calls to our own API routes.
 */
function getFirebaseAppCheck() {
    return appCheck;
}
function initFirebaseClient() {
    if (typeof window === "undefined")
        return;
    const app = getFirebaseApp();
    const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
    if (useEmulators && !emulatorsConnected) {
        // Loopback when the page is on localhost — LAN IPs (phones/Flutter) often
        // go stale and cause auth/network-request-failed → Firestore offline.
        // Only use NEXT_PUBLIC_FIREBASE_EMULATOR_HOST when browsing via that host.
        const pageHost = window.location.hostname;
        const fromEnv = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST?.trim();
        const host = pageHost === "localhost" || pageHost === "127.0.0.1"
            ? pageHost
            : fromEnv || pageHost;
        // Connect BEFORE any Auth/Firestore/RTDB use — otherwise the SDK may latch
        // onto production and ignore later connect*Emulator calls.
        try {
            (0, auth_1.connectAuthEmulator)(getFirebaseAuth(), `http://${host}:9099`, {
                disableWarnings: true,
            });
            (0, firestore_1.connectFirestoreEmulator)(getFirebaseDb(), host, 8080);
            (0, database_1.connectDatabaseEmulator)(getFirebaseRtdb(), host, 9000);
            (0, storage_1.connectStorageEmulator)(getFirebaseStorage(), host, 9199);
            (0, functions_1.connectFunctionsEmulator)(getFirebaseFunctions(), host, 5001);
        }
        catch (error) {
            // HMR / Strict Mode can re-enter after emulators are already attached.
            console.warn("Firebase emulator connect skipped:", error);
        }
        emulatorsConnected = true;
    }
    // Site key is reCAPTCHA Enterprise when configured for this Firebase app.
    // Skip against emulators — tokens aren't needed and fail with "App not registered".
    const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY?.trim();
    if (!useEmulators && siteKey && !appCheck) {
        try {
            appCheck = (0, app_check_1.initializeAppCheck)(app, {
                provider: new app_check_1.ReCaptchaEnterpriseProvider(siteKey),
                isTokenAutoRefreshEnabled: true,
            });
        }
        catch (error) {
            console.warn("App Check init skipped:", error);
        }
    }
}
