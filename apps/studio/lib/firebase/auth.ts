import {
  signInWithCustomToken,
  signOut,
} from "firebase/auth";
import { getFirebaseAuth } from "./client";
import {
  buildLogoutCascadeUrl,
  clearSsoAttempt,
  markSsoAttempted,
} from "@/lib/sso";
import { clearCachedProfile } from "@/lib/profile-cache";

export async function signInWithCustomAuthToken(customToken: string) {
  return signInWithCustomToken(getFirebaseAuth(), customToken);
}

export async function signOutUser() {
  await signOut(getFirebaseAuth());
}

/**
 * Sign out on this origin, then cascade through sibling apps so Pulse/Admin
 * sessions clear too. Lands on `returnPath` on the current origin.
 */
export async function signOutAndRedirect(opts: {
  current: "pulse" | "studio" | "admin" | "payments";
  locale: string;
  /** Path on the current app after the cascade finishes. */
  returnPath?: string;
}) {
  await signOut(getFirebaseAuth());
  clearCachedProfile();
  clearSsoAttempt();
  // Avoid auto-SSO bounce on login right after an intentional logout.
  markSsoAttempted();

  const returnPath = opts.returnPath ?? "/login";
  const path = returnPath.startsWith("/") ? returnPath : `/${returnPath}`;
  const finalUrl = `${window.location.origin}/${opts.locale}${path}`;
  window.location.replace(
    buildLogoutCascadeUrl(opts.current, opts.locale, finalUrl),
  );
}
