/** Firestore / Functions use hyphenated codes; RTDB uses PERMISSION_DENIED. */
export function isFirebasePermissionDenied(error: unknown): boolean {
  if (error == null) return false;
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error);
  return /permission[-_]denied/i.test(`${code} ${message}`);
}
