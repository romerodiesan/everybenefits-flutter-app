import {
  PhoneAuthProvider,
  updatePhoneNumber,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./client";
import {
  clearInvisibleRecaptcha,
  verifyPhoneNumberWithRecaptcha,
} from "./recaptcha-verifier";

export function clearProfilePhoneRecaptcha(): void {
  clearInvisibleRecaptcha("profile-phone-recaptcha");
}

function requireUser(): User {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Not signed in");
  return user;
}

export async function startProfilePhoneVerification(
  e164: string,
  containerId = "profile-phone-recaptcha",
): Promise<string> {
  requireUser();
  return verifyPhoneNumberWithRecaptcha(e164.trim(), containerId);
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

export function phoneAuthErrorKey(err: unknown): string | null {
  const code =
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string"
      ? (err as { code: string }).code
      : "";
  if (
    code.includes("invalid-phone-number") ||
    code.includes("missing-phone-number")
  ) {
    return "phoneVerifyInvalid";
  }
  if (code.includes("too-many-requests") || code.includes("quota-exceeded")) {
    return "phoneVerifyTooMany";
  }
  if (
    code.includes("captcha") ||
    code.includes("invalid-app-credential") ||
    code.includes("missing-recaptcha") ||
    code.includes("network-request-failed")
  ) {
    return "phoneVerifyError";
  }
  if (
    code.includes("invalid-verification-code") ||
    code.includes("code-expired") ||
    code.includes("invalid-verification-id")
  ) {
    return "mfaInvalidCode";
  }
  if (code.includes("credential-already-in-use")) {
    return "phoneVerifyInUse";
  }
  return null;
}
