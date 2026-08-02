import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  isSignInWithEmailLink,
  linkWithCredential,
  linkWithPopup,
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
  unlink,
  updatePassword,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./client";
import {
  clearSsoAttempt,
  logoutCascadeUrl,
  markSsoAttempted,
  siblingApp,
  appBaseUrl,
} from "@/lib/sso";
import { clearCachedProfile } from "@/lib/profile-cache";

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

export async function signOutUser() {
  await signOut(getFirebaseAuth());
}

/**
 * Sign out on this origin, then cascade to the sibling app so both
 * Pulse and Studio sessions are cleared (Firebase Auth is per-origin).
 */
export async function signOutEverywhere(opts: {
  current: "pulse" | "studio";
  locale: string;
  /** Path on the current app after both sessions are cleared. */
  returnPath?: string;
}) {
  await signOut(getFirebaseAuth());
  clearCachedProfile();
  clearSsoAttempt();
  // Avoid auto-SSO bounce on login right after an intentional logout.
  markSsoAttempted();

  const returnPath = opts.returnPath ?? "/login";
  const path = returnPath.startsWith("/") ? returnPath : `/${returnPath}`;
  const finalUrl = `${appBaseUrl(opts.current)}/${opts.locale}${path}`;
  window.location.replace(
    logoutCascadeUrl(siblingApp(opts.current), opts.locale, finalUrl),
  );
}

/** True when the given (or current) user has an email/password provider. */
export function hasPasswordProvider(user?: User | null): boolean {
  const u = user ?? getFirebaseAuth().currentUser;
  return u?.providerData.some((p) => p.providerId === "password") ?? false;
}

/** @deprecated Prefer [hasPasswordProvider]. */
export function usesPasswordProvider(): boolean {
  return hasPasswordProvider();
}

/** Link a backup password to the signed-in Auth user (Google → password). */
export async function linkPassword(password: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const email = user.email?.trim();
  if (!email) throw new Error("email-required");
  if (password.length < 6) throw new Error("weak-password");

  // Prefer Identity Toolkit `accounts:update` (official “link email/password”).
  // `linkWithCredential` posts to `accounts:signUp`, which 400s on the Auth
  // Emulator and some SDK builds when the email is already on the Google user.
  const idToken = await user.getIdToken();
  const apiKey = auth.app.options.apiKey || "demo-api-key";
  const host =
    typeof window !== "undefined" && window.location.hostname === "127.0.0.1"
      ? "127.0.0.1"
      : "localhost";
  const base = usingAuthEmulator()
    ? `http://${host}:9099/identitytoolkit.googleapis.com/v1`
    : "https://identitytoolkit.googleapis.com/v1";

  const res = await fetch(`${base}/accounts:update?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idToken,
      email,
      password,
      returnSecureToken: true,
    }),
  });
  const payload = (await res.json()) as {
    error?: { message?: string };
  };
  if (!res.ok) {
    const message = payload.error?.message ?? "PASSWORD_LINK_FAILED";
    // Fallback for environments where update is blocked but link works.
    if (
      message.includes("OPERATION_NOT_ALLOWED") ||
      message.includes("INVALID_ID_TOKEN")
    ) {
      await linkWithCredential(
        user,
        EmailAuthProvider.credential(email, password),
      );
      return;
    }
    const err = new Error(message) as Error & { code: string };
    err.code = toolkitMessageToCode(message);
    throw err;
  }

  // Refresh the client session so providerData includes "password".
  await signInWithEmailAndPassword(auth, email, password);
}

function toolkitMessageToCode(message: string): string {
  const raw = message.split(":")[0]?.trim().toUpperCase() ?? message;
  switch (raw) {
    case "EMAIL_EXISTS":
    case "EMAIL_ALREADY_IN_USE":
      return "auth/email-already-in-use";
    case "WEAK_PASSWORD":
      return "auth/weak-password";
    case "CREDENTIAL_TOO_OLD_LOGIN_AGAIN":
      return "auth/requires-recent-login";
    case "INVALID_ID_TOKEN":
      return "auth/invalid-user-token";
    default:
      return `auth/${raw.toLowerCase().replace(/_/g, "-")}`;
  }
}

/** Update password after reauthenticating with the current password. */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Not signed in");
  if (!hasPasswordProvider(user)) throw new Error("password-required");
  if (newPassword.length < 6) throw new Error("weak-password");
  await reauthenticate(currentPassword);
  await updatePassword(user, newPassword);
}

/**
 * Confirms the caller's identity before destructive actions.
 * Password accounts need the current password; OAuth accounts re-run the popup.
 */
export async function reauthenticate(password?: string): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Not signed in");
  if (hasPasswordProvider(user)) {
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

export function hasGoogleProvider(user?: User | null): boolean {
  const u = user ?? getFirebaseAuth().currentUser;
  return Boolean(u?.providerData.some((p) => p.providerId === "google.com"));
}

export async function linkGoogleAccount(): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Not signed in");
  if (hasGoogleProvider(user)) return;
  if (usingAuthEmulator()) {
    const email = user.email?.trim();
    if (!email) throw new Error("email-required");
    await linkWithCredential(
      user,
      emulatorGoogleCredential(email, user.displayName ?? undefined),
    );
    return;
  }
  await linkWithPopup(user, googleProvider);
}

export async function unlinkGoogleAccount(): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Not signed in");
  if (!hasGoogleProvider(user)) return;
  // Keep at least one sign-in method.
  if (user.providerData.length <= 1) {
    throw new Error("last-provider");
  }
  await unlink(user, "google.com");
}

export function currentUser(): User | null {
  return getFirebaseAuth().currentUser;
}
