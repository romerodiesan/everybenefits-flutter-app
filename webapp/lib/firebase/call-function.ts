import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "./client";

export class FunctionsUnavailableError extends Error {
  code = "functions-unavailable";
  constructor(name: string) {
    super(
      `Cloud Function "${name}" is unavailable. Start the Functions emulator or deploy functions.`,
    );
    this.name = "FunctionsUnavailableError";
  }
}

function isUnavailable(error: unknown): boolean {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
      ? (error as { code: string }).code.replace(/^functions\//, "")
      : "";
  return (
    code === "unavailable" ||
    code === "not-found" ||
    code === "unimplemented" ||
    code === "internal" ||
    code === "deadline-exceeded"
  );
}

/**
 * Invokes a Firebase callable via the JS SDK.
 * With `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` this hits `127.0.0.1:5001`.
 */
export async function callCloudFunction<TResult = unknown>(
  name: string,
  data: unknown = {},
): Promise<TResult> {
  try {
    const callable = httpsCallable(getFirebaseFunctions(), name);
    const result = await callable(data);
    return result.data as TResult;
  } catch (error) {
    if (isUnavailable(error)) {
      throw new FunctionsUnavailableError(name);
    }
    throw error;
  }
}
