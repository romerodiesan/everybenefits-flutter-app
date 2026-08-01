"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PULSE_WEB_URL = exports.ADMIN_WEB_URL = exports.emailSecrets = exports.emailFrom = exports.resendApiKey = void 0;
exports.sendTransactionalEmail = sendTransactionalEmail;
const params_1 = require("firebase-functions/params");
const firebase_functions_1 = require("firebase-functions");
/**
 * Secret Manager bindings break the Functions emulator when the GCP project
 * cannot resolve secrets (403 / API disabled): discovery fails and ZERO
 * callables load. Skip defineSecret under the emulator and read process.env
 * (optionally from functions/.secret.local / .env) instead.
 */
const usingFunctionsEmulator = process.env.FUNCTIONS_EMULATOR === "true";
exports.resendApiKey = usingFunctionsEmulator
    ? null
    : (0, params_1.defineSecret)("RESEND_API_KEY");
exports.emailFrom = usingFunctionsEmulator
    ? null
    : (0, params_1.defineSecret)("EMAIL_FROM");
/** Secrets to attach to onCall/onDocumentWritten in production only. */
exports.emailSecrets = [exports.resendApiKey, exports.emailFrom].filter((secret) => secret != null);
function readSecret(secret, envKey) {
    if (secret)
        return secret.value()?.trim() ?? "";
    return process.env[envKey]?.trim() ?? "";
}
/**
 * Send transactional email via Resend.
 * Soft-fails (logs + returns false) when secrets are missing or the API errors,
 * so callers can still deliver in-app / FCM notifications.
 */
async function sendTransactionalEmail(input) {
    const apiKey = readSecret(exports.resendApiKey, "RESEND_API_KEY");
    const from = readSecret(exports.emailFrom, "EMAIL_FROM");
    if (!apiKey || !from) {
        firebase_functions_1.logger.warn("email.skip_missing_secrets", {
            hasKey: Boolean(apiKey),
            hasFrom: Boolean(from),
            emulator: usingFunctionsEmulator,
        });
        return false;
    }
    const to = (Array.isArray(input.to) ? input.to : [input.to])
        .map((addr) => addr.trim())
        .filter(Boolean);
    if (!to.length)
        return false;
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
            firebase_functions_1.logger.error("email.send_failed", {
                status: res.status,
                body: body.slice(0, 500),
            });
            return false;
        }
        return true;
    }
    catch (error) {
        firebase_functions_1.logger.error("email.send_exception", {
            message: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}
exports.ADMIN_WEB_URL = process.env.ADMIN_WEB_URL?.trim() || "https://admin.everybenefits.us";
exports.PULSE_WEB_URL = process.env.PULSE_WEB_URL?.trim() || "https://pulse.everybenefits.us";
//# sourceMappingURL=email.js.map