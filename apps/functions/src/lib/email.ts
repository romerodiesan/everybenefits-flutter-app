import { defineSecret, type SecretParam } from "firebase-functions/params";
import { logger } from "firebase-functions";

/**
 * Secret Manager bindings break the Functions emulator when the GCP project
 * cannot resolve secrets (403 / API disabled): discovery fails and ZERO
 * callables load. Skip defineSecret under the emulator and read process.env
 * (optionally from functions/.secret.local / .env) instead.
 */
const usingFunctionsEmulator = process.env.FUNCTIONS_EMULATOR === "true";

export const resendApiKey: SecretParam | null = usingFunctionsEmulator
  ? null
  : defineSecret("RESEND_API_KEY");
export const emailFrom: SecretParam | null = usingFunctionsEmulator
  ? null
  : defineSecret("EMAIL_FROM");

/** Secrets to attach to onCall/onDocumentWritten in production only. */
export const emailSecrets: SecretParam[] = [resendApiKey, emailFrom].filter(
  (secret): secret is SecretParam => secret != null,
);

function readSecret(secret: SecretParam | null, envKey: string): string {
  if (secret) return secret.value()?.trim() ?? "";
  return process.env[envKey]?.trim() ?? "";
}

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

/**
 * Send transactional email via Resend.
 * Soft-fails (logs + returns false) when secrets are missing or the API errors,
 * so callers can still deliver in-app / FCM notifications.
 */
export async function sendTransactionalEmail(
  input: SendEmailInput,
): Promise<boolean> {
  const apiKey = readSecret(resendApiKey, "RESEND_API_KEY");
  const from = readSecret(emailFrom, "EMAIL_FROM");
  if (!apiKey || !from) {
    logger.warn("email.skip_missing_secrets", {
      hasKey: Boolean(apiKey),
      hasFrom: Boolean(from),
      emulator: usingFunctionsEmulator,
    });
    return false;
  }

  const to = (Array.isArray(input.to) ? input.to : [input.to])
    .map((addr) => addr.trim())
    .filter(Boolean);
  if (!to.length) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: input.subject.slice(0, 200),
        html: input.html,
        text: input.text ?? undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error("email.send_failed", {
        status: res.status,
        body: body.slice(0, 500),
      });
      return false;
    }
    return true;
  } catch (error) {
    logger.error("email.send_exception", {
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export const ADMIN_WEB_URL =
  process.env.ADMIN_WEB_URL?.trim() || "https://admin.everybenefits.us";
export const PULSE_WEB_URL =
  process.env.PULSE_WEB_URL?.trim() || "https://pulse.everybenefits.us";
