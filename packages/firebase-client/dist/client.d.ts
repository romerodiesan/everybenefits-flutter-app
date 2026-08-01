import { type FirebaseApp } from "firebase/app";
import { type Auth } from "firebase/auth";
import { type Firestore } from "firebase/firestore";
import { type Database } from "firebase/database";
import { type FirebaseStorage } from "firebase/storage";
import { type Functions } from "firebase/functions";
import { type AppCheck } from "firebase/app-check";
export declare function getFirebaseApp(): FirebaseApp;
export declare function getFirebaseAuth(): Auth;
export declare function getFirebaseDb(): Firestore;
export declare function getFirebaseRtdb(): Database;
export declare function getFirebaseStorage(): FirebaseStorage;
export declare function getFirebaseFunctions(): Functions;
/**
 * The App Check instance, when configured. SDK calls attach tokens on their
 * own; this exists for hand-rolled `fetch` calls to our own API routes.
 */
export declare function getFirebaseAppCheck(): AppCheck | null;
export declare function initFirebaseClient(): void;
