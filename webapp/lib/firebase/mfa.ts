import {
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
  TotpMultiFactorGenerator,
  getMultiFactorResolver,
  multiFactor,
  type AuthError,
  type MultiFactorError,
  type MultiFactorInfo,
  type MultiFactorResolver,
  type TotpSecret,
  type User,
  type UserCredential,
} from "firebase/auth";
import { getFirebaseAuth } from "./client";

export type EnrolledFactor = {
  uid: string;
  factorId: string;
  displayName: string | null;
  phoneNumber: string | null;
};

export type PendingTotpEnrollment = {
  secret: TotpSecret;
  qrCodeUrl: string;
  secretKey: string;
};

function requireUser(): User {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Not signed in");
  return user;
}

export function mapFactor(info: MultiFactorInfo): EnrolledFactor {
  return {
    uid: info.uid,
    factorId: info.factorId,
    displayName: info.displayName ?? null,
    phoneNumber:
      "phoneNumber" in info && typeof (info as { phoneNumber?: string }).phoneNumber === "string"
        ? (info as { phoneNumber: string }).phoneNumber
        : null,
  };
}

export async function listEnrolledFactors(): Promise<EnrolledFactor[]> {
  const user = requireUser();
  return multiFactor(user).enrolledFactors.map(mapFactor);
}

export function isMultiFactorError(error: unknown): error is MultiFactorError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as AuthError).code === "auth/multi-factor-auth-required"
  );
}

export function resolverFromError(error: unknown): MultiFactorResolver | null {
  if (!isMultiFactorError(error)) return null;
  return getMultiFactorResolver(getFirebaseAuth(), error);
}

let recaptchaVerifier: RecaptchaVerifier | null = null;

export function clearRecaptcha(): void {
  try {
    recaptchaVerifier?.clear();
  } catch {
    // ignore
  }
  recaptchaVerifier = null;
}

function getOrCreateRecaptcha(containerId: string): RecaptchaVerifier {
  clearRecaptcha();
  recaptchaVerifier = new RecaptchaVerifier(getFirebaseAuth(), containerId, {
    size: "invisible",
  });
  return recaptchaVerifier;
}

export async function startTotpEnrollment(
  accountName?: string,
): Promise<PendingTotpEnrollment> {
  const user = requireUser();
  const session = await multiFactor(user).getSession();
  const secret = await TotpMultiFactorGenerator.generateSecret(session);
  const qrCodeUrl = secret.generateQrCodeUrl(
    accountName ?? user.email ?? user.uid,
    "Every Benefits",
  );
  return { secret, qrCodeUrl, secretKey: secret.secretKey };
}

export async function finishTotpEnrollment(
  secret: TotpSecret,
  verificationCode: string,
  displayName = "Authenticator",
): Promise<void> {
  const user = requireUser();
  const assertion = TotpMultiFactorGenerator.assertionForEnrollment(
    secret,
    verificationCode.trim(),
  );
  await multiFactor(user).enroll(assertion, displayName);
}

export async function startPhoneEnrollment(
  phoneNumber: string,
  recaptchaContainerId: string,
): Promise<string> {
  const user = requireUser();
  const session = await multiFactor(user).getSession();
  const verifier = getOrCreateRecaptcha(recaptchaContainerId);
  const provider = new PhoneAuthProvider(getFirebaseAuth());
  return provider.verifyPhoneNumber(
    { phoneNumber: phoneNumber.trim(), session },
    verifier,
  );
}

export async function finishPhoneEnrollment(
  verificationId: string,
  smsCode: string,
  displayName = "Phone",
): Promise<void> {
  const user = requireUser();
  const cred = PhoneAuthProvider.credential(verificationId, smsCode.trim());
  const assertion = PhoneMultiFactorGenerator.assertion(cred);
  await multiFactor(user).enroll(assertion, displayName);
  clearRecaptcha();
}

export async function unenrollFactor(factorUid: string): Promise<void> {
  const user = requireUser();
  await multiFactor(user).unenroll(factorUid);
}

export async function sendMfaSmsChallenge(
  resolver: MultiFactorResolver,
  hint: MultiFactorInfo,
  recaptchaContainerId: string,
): Promise<string> {
  const verifier = getOrCreateRecaptcha(recaptchaContainerId);
  const provider = new PhoneAuthProvider(getFirebaseAuth());
  return provider.verifyPhoneNumber(
    { multiFactorHint: hint, session: resolver.session },
    verifier,
  );
}

export async function resolveMfaWithSms(
  resolver: MultiFactorResolver,
  verificationId: string,
  smsCode: string,
): Promise<UserCredential> {
  const cred = PhoneAuthProvider.credential(verificationId, smsCode.trim());
  const assertion = PhoneMultiFactorGenerator.assertion(cred);
  clearRecaptcha();
  return resolver.resolveSignIn(assertion);
}

export async function resolveMfaWithTotp(
  resolver: MultiFactorResolver,
  enrollmentId: string,
  otp: string,
): Promise<UserCredential> {
  const assertion = TotpMultiFactorGenerator.assertionForSignIn(
    enrollmentId,
    otp.trim(),
  );
  return resolver.resolveSignIn(assertion);
}

export { TotpMultiFactorGenerator, PhoneMultiFactorGenerator };
