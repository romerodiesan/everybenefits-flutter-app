import {
  PhoneAuthProvider,
  RecaptchaVerifier,
  updatePhoneNumber,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./client";

let recaptchaVerifier: RecaptchaVerifier | null = null;

export function clearProfilePhoneRecaptcha(): void {
  try {
    recaptchaVerifier?.clear();
  } catch {
    // ignore
  }
  recaptchaVerifier = null;
}

function getOrCreateRecaptcha(containerId: string): RecaptchaVerifier {
  clearProfilePhoneRecaptcha();
  recaptchaVerifier = new RecaptchaVerifier(getFirebaseAuth(), containerId, {
    size: "invisible",
  });
  return recaptchaVerifier;
}

function requireUser(): User {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Not signed in");
  return user;
}

/** Start SMS verification for profile phone (not MFA enrollment). */
export async function startProfilePhoneVerification(
  e164: string,
  containerId = "profile-phone-recaptcha",
): Promise<string> {
  requireUser();
  const provider = new PhoneAuthProvider(getFirebaseAuth());
  const verifier = getOrCreateRecaptcha(containerId);
  return provider.verifyPhoneNumber(e164.trim(), verifier);
}

export async function confirmProfilePhone(
  verificationId: string,
  smsCode: string,
): Promise<void> {
  const user = requireUser();
  const credential = PhoneAuthProvider.credential(
    verificationId,
    smsCode.trim(),
  );
  await updatePhoneNumber(user, credential);
  clearProfilePhoneRecaptcha();
}

export function toE164(countryCode: string, nationalNumber: string): string {
  const code = countryCode.trim().startsWith("+")
    ? countryCode.trim()
    : `+${countryCode.trim()}`;
  const digits = nationalNumber.trim().replace(/\D/g, "");
  return `${code}${digits}`;
}
