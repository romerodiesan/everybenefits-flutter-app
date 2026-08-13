import {
  callCloudFunction as callShared,
  FunctionsUnavailableError as SharedFunctionsUnavailableError,
} from "@pulse/firebase-web";
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

/**
 * Thin app wrapper around shared `@pulse/firebase-web` callable helper.
 * With `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` this hits `127.0.0.1:5001`.
 */
export async function callCloudFunction<TResult = unknown>(
  name: string,
  data: unknown = {},
  options?: { timeoutMs?: number },
): Promise<TResult> {
  try {
    return await callShared<TResult>(
      getFirebaseFunctions(),
      name,
      data,
      options,
    );
  } catch (error) {
    if (error instanceof SharedFunctionsUnavailableError) {
      throw new FunctionsUnavailableError(name);
    }
    throw error;
  }
}
