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
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./client";

const googleProvider = new GoogleAuthProvider();

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(getFirebaseAuth(), email, password);
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
  return signInWithPopup(getFirebaseAuth(), googleProvider);
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
  window.localStorage.setItem("emailForSignIn", email);
}

export async function completeMagicLink(href: string) {
  if (!isSignInWithEmailLink(getFirebaseAuth(), href)) {
    throw new Error("Invalid magic link");
  }
  let email = window.localStorage.getItem("emailForSignIn");
  if (!email) {
    email = window.prompt("Confirm your email for sign-in") ?? "";
  }
  if (!email) throw new Error("Email required");
  const cred = await signInWithEmailLink(getFirebaseAuth(), email, href);
  window.localStorage.removeItem("emailForSignIn");
  return cred;
}

export async function signOutUser() {
  await signOut(getFirebaseAuth());
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
  await reauthenticateWithPopup(user, googleProvider);
}

export function currentUser(): User | null {
  return getFirebaseAuth().currentUser;
}
