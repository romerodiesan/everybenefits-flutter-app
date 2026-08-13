import { httpsCallable, type Functions } from "firebase/functions";

export class FunctionsUnavailableError extends Error {
  constructor(message = "Cloud Functions unavailable") {
    super(message);
    this.name = "FunctionsUnavailableError";
  }
}

function isUnavailableCode(code: string): boolean {
  const normalized = code.replace(/^functions\//, "");
  return (
    normalized.includes("unavailable") ||
    normalized.includes("not-found") ||
    normalized.includes("failed-precondition") ||
    normalized.includes("unimplemented") ||
    normalized.includes("deadline-exceeded")
  );
}

/**
 * Shared callable invoker for Next clients (admin / payments / studio / web).
 */
export async function callCloudFunction<T>(
  functions: Functions,
  name: string,
  data?: unknown,
  options?: { timeoutMs?: number },
): Promise<T> {
  try {
    const callable = httpsCallable(
      functions,
      name,
      options?.timeoutMs != null ? { timeout: options.timeoutMs } : undefined,
    );
    const result = await callable(data ?? {});
    return result.data as T;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (isUnavailableCode(code)) {
      throw new FunctionsUnavailableError(
        error instanceof Error ? error.message : String(error),
      );
    }
    throw error;
  }
}
