import { PhoneAuthProvider, RecaptchaVerifier, type PhoneInfoOptions } from "firebase/auth";
import { getFirebaseAuth } from "./client";

const verifiers = new Map<string, RecaptchaVerifier>();

function emptyContainer(containerId: string) {
  document.getElementById(containerId)?.replaceChildren();
}

export function clearInvisibleRecaptcha(containerId?: string): void {
  const ids = containerId ? [containerId] : [...verifiers.keys()];
  for (const id of ids) {
    const verifier = verifiers.get(id);
    try {
      verifier?.clear();
    } catch {
      // Widget may already be gone (Strict Mode remount, expired callback).
    }
    verifiers.delete(id);
    emptyContainer(id);
  }
}

/**
 * Invisible reCAPTCHA bound to a body-level container. Reuses the widget
 * for retries on the same container; always recreate after a failed send.
 */
export async function getInvisibleRecaptcha(
  containerId: string,
): Promise<RecaptchaVerifier> {
  clearInvisibleRecaptcha(containerId);

  const el = document.getElementById(containerId);
  if (!el) {
    const err = new Error("recaptcha-container-missing") as Error & {
      code: string;
    };
    err.code = "auth/missing-recaptcha-token";
    throw err;
  }

  const verifier = new RecaptchaVerifier(getFirebaseAuth(), containerId, {
    size: "invisible",
    callback: () => undefined,
    "expired-callback": () => {
      clearInvisibleRecaptcha(containerId);
    },
  });
  await verifier.render();
  verifiers.set(containerId, verifier);
  return verifier;
}

export async function verifyPhoneNumberWithRecaptcha(
  request: string | PhoneInfoOptions,
  containerId: string,
): Promise<string> {
  const provider = new PhoneAuthProvider(getFirebaseAuth());
  try {
    const verifier = await getInvisibleRecaptcha(containerId);
    return await provider.verifyPhoneNumber(request, verifier);
  } catch (error) {
    clearInvisibleRecaptcha(containerId);
    throw error;
  }
}
