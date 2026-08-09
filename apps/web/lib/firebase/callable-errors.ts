import { FunctionsUnavailableError } from "./call-function";

export type CallableErrorLabels = {
  generic: string;
  auth: string;
  permissionDenied: string;
  dmBlocked: string;
  unavailable?: string;
};

/** Known client-thrown strings that are safe to surface as-is. */
const ALLOWED_CLIENT_MESSAGES = new Set([
  "Not allowed to create groups",
  "Group name required",
  "Pick at least one member or role",
  "Group creation failed",
  "Support is not available for this account",
]);

function errorCode(error: unknown): string {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  const code = (error as { code: unknown }).code;
  return typeof code === "string" ? code.replace(/^functions\//, "") : "";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.trim();
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message.trim();
  }
  return "";
}

function isDirectMessagesDisabled(error: unknown): boolean {
  const message = errorMessage(error);
  return message === "direct-messages-disabled" || message.includes("direct-messages-disabled");
}

/**
 * Map Firebase callable / HttpsError shapes to user-facing copy.
 * Shared by DM and group create so privacy + permission codes stay consistent.
 * Arbitrary server messages are never surfaced — only code mapping + allowlisted
 * client-thrown strings.
 */
export function mapCallableError(
  error: unknown,
  labels: CallableErrorLabels,
): string {
  if (isDirectMessagesDisabled(error)) return labels.dmBlocked;
  if (error instanceof FunctionsUnavailableError) {
    return labels.unavailable ?? labels.generic;
  }

  const code = errorCode(error);
  if (code === "permission-denied") return labels.permissionDenied;
  if (code === "unauthenticated") return labels.auth;

  const message = errorMessage(error);
  if (message && ALLOWED_CLIENT_MESSAGES.has(message)) {
    return message;
  }
  return labels.generic;
}
