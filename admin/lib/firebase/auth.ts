import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  isSignInWithEmailLink,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPopup,
  signInWithCustomToken,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./client";

const googleProvider = new GoogleAuthProvider();

function usingAuthEmulator() {
  return process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
}

/** Fake Google ID token the Auth Emulator accepts (no real OAuth popup). */
function emulatorGoogleCredential(email: string, name?: string) {
  return GoogleAuthProvider.credential(
    JSON.stringify({
      sub: `emulator-google-${email}`,
      email,
      email_verified: true,
      name: name ?? email.split("@")[0],
    }),
  );
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export async function signInWithCustomAuthToken(customToken: string) {
  return signInWithCustomToken(getFirebaseAuth(), customToken);
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string,
) {
  const cred = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    email,
    password,
  );
  if (displayName?.trim()) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
  }
  return cred;
}

export async function signInWithGoogle() {
  const auth = getFirebaseAuth();
  // Auth Emulator popup relay breaks across localhost↔127.0.0.1 ("No matching
  // frame"). Use a fake Google credential instead — still creates a google.com user.
  if (usingAuthEmulator()) {
    const email =
      window
        .prompt(
          "Auth emulator — Google sign-in email",
          "agent@example.com",
        )
        ?.trim() ?? "";
    if (!email) throw new Error("cancelled");
    return signInWithCredential(auth, emulatorGoogleCredential(email));
  }
  return signInWithPopup(auth, googleProvider);
}

export async function signInAsGuest() {
  return signInAnonymously(getFirebaseAuth());
}

export async function resetPassword(email: string) {
  return sendPasswordResetEmail(getFirebaseAuth(), email);
}

export async function sendMagicLink(email: string, locale?: string) {
  const fromPath = window.location.pathname.match(/^\/(en|es)(?:\/|$)/)?.[1];
  const resolved = locale || fromPath || "en";
  const url = `${window.location.origin}/${resolved}/login`;
  await sendSignInLinkToEmail(getFirebaseAuth(), email, {
    url,
    handleCodeInApp: true,
  });
  window.sessionStorage.setItem("emailForSignIn", email);
}

export async function completeMagicLink(href: string) {
  if (!isSignInWithEmailLink(getFirebaseAuth(), href)) {
    throw new Error("Invalid magic link");
  }
  let email =
    window.sessionStorage.getItem("emailForSignIn") ??
    window.localStorage.getItem("emailForSignIn");
  if (!email) {
    email = window.prompt("Confirm your email for sign-in") ?? "";
  }
  if (!email) throw new Error("Email required");
  const cred = await signInWithEmailLink(getFirebaseAuth(), email, href);
  window.sessionStorage.removeItem("emailForSignIn");
  window.localStorage.removeItem("emailForSignIn");
  return cred;
}

import {
  clearSsoAttempt,
  logoutCascadeUrl,
  markSsoAttempted,
  appBaseUrl,
  otherApps,
} from "@/lib/sso";
import { clearCachedProfile } from "@/lib/profile-cache";

export async function signOutUser() {
  await signOut(getFirebaseAuth());
}

/**
 * Sign out on this origin, then cascade through the other Pulse apps so
 * all origin sessions are cleared (Firebase Auth is per-origin).
 */
export async function signOutEverywhere(opts: {
  current: "pulse" | "studio" | "admin";
  locale: string;
  /** Path on the current app after all sessions are cleared. */
  returnPath?: string;
}) {
  await signOut(getFirebaseAuth());
  clearCachedProfile();
  clearSsoAttempt();
  markSsoAttempted();

  const returnPath = opts.returnPath ?? "/login";
  const path = returnPath.startsWith("/") ? returnPath : `/${returnPath}`;
  const finalUrl = `${appBaseUrl(opts.current)}/${opts.locale}${path}`;
  const chain = otherApps(opts.current);
  let next = finalUrl;
  for (let i = chain.length - 1; i >= 0; i--) {
    next = logoutCascadeUrl(chain[i]!, opts.locale, next);
  }
  window.location.replace(next);
}

/** True when the current user signed in with email + password. */
export function usesPasswordProvider(): boolean {
  const user = getFirebaseAuth().currentUser;
  return (
    user?.providerData.some((p) => p.providerId === "password") ?? false
  );
}

/**
 * Confirms the caller's identity before destructive actions.
 * Password accounts need the current password; OAuth accounts re-run the popup.
 */
export async function reauthenticate(password?: string): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Not signed in");
  if (usesPasswordProvider()) {
    if (!user.email || !password) throw new Error("password-required");
    await reauthenticateWithCredential(
      user,
      EmailAuthProvider.credential(user.email, password),
    );
    return;
  }
  if (usingAuthEmulator()) {
    const email = user.email?.trim();
    if (!email) throw new Error("email-required");
    await reauthenticateWithCredential(
      user,
      emulatorGoogleCredential(email, user.displayName ?? undefined),
    );
    return;
  }
  await reauthenticateWithPopup(user, googleProvider);
}

export function currentUser(): User | null {
  return getFirebaseAuth().currentUser;
}
