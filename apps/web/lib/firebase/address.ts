import {
  callCloudFunction,
  FunctionsUnavailableError,
} from "./call-function";

export type ValidateUsAddressResult = {
  ok: boolean;
  skipped: boolean;
  verdict: "valid" | "confirm" | "fix" | "skipped";
  normalized?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  formattedAddress?: string | null;
  message?: string;
};

/**
 * Server-side US address check (Address Validation API via Cloud Functions).
 * Soft-fails open when Functions/API key are unavailable so local validators remain.
 */
export async function validateUsAddress(input: {
  street: string;
  city: string;
  state: string;
  zip: string;
  apt?: string | null;
}): Promise<ValidateUsAddressResult> {
  try {
    return await callCloudFunction<ValidateUsAddressResult>(
      "validateUsAddress",
      input,
    );
  } catch (error) {
    if (error instanceof FunctionsUnavailableError) {
      return {
        ok: true,
        skipped: true,
        verdict: "skipped",
        normalized: {
          street: input.street.trim(),
          city: input.city.trim(),
          state: input.state.trim().toUpperCase().slice(0, 2),
          zip: input.zip.trim(),
        },
        message: error.message,
      };
    }
    throw error;
  }
}
