import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import { callableOpts } from "./init";
import { requireCaller } from "./auth";

const googleMapsApiKey = defineString("GOOGLE_MAPS_API_KEY", {
  default: "",
  description:
    "Maps Platform key for Address Validation API (server). Leave empty to skip validation.",
});

export type ValidateUsAddressInput = {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  apt?: string | null;
};

export type ValidateUsAddressResult = {
  ok: boolean;
  /** True when no API key is configured — client should rely on local checks. */
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

type AddressValidationResponse = {
  result?: {
    verdict?: {
      addressComplete?: boolean;
      hasUnconfirmedComponents?: boolean;
      hasInferredComponents?: boolean;
      validationGranularity?: string;
    };
    address?: {
      formattedAddress?: string;
      postalAddress?: {
        addressLines?: string[];
        locality?: string;
        administrativeArea?: string;
        postalCode?: string;
        regionCode?: string;
      };
    };
  };
  error?: { message?: string; status?: string };
};

function normalizeState(raw: string) {
  return raw.trim().toUpperCase().slice(0, 2);
}

function normalizeZip(raw: string) {
  const trimmed = raw.trim();
  const m = trimmed.match(/^(\d{5})(?:-?\d{4})?$/);
  return m ? trimmed.replace(/^(\d{5})(\d{4})$/, "$1-$2") : trimmed;
}

/**
 * Validate + optionally normalize a US mailing address via Address Validation API.
 * Auth required. Soft-skips when GOOGLE_MAPS_API_KEY is empty (local/dev).
 */
export const validateUsAddress = onCall(
  callableOpts,
  async (request): Promise<ValidateUsAddressResult> => {
    await requireCaller(request, "validateUsAddress");

    const data = (request.data ?? {}) as ValidateUsAddressInput;
    const street = String(data.street ?? "").trim();
    const city = String(data.city ?? "").trim();
    const state = normalizeState(String(data.state ?? ""));
    const zip = normalizeZip(String(data.zip ?? ""));
    const apt = String(data.apt ?? "").trim();

    if (!street || !city || !state || !zip) {
      throw new HttpsError(
        "invalid-argument",
        "street, city, state, and zip are required.",
      );
    }

    const apiKey =
      googleMapsApiKey.value()?.trim() ||
      process.env.GOOGLE_MAPS_API_KEY?.trim() ||
      "";

    if (!apiKey) {
      return {
        ok: true,
        skipped: true,
        verdict: "skipped",
        normalized: { street, city, state, zip },
        message: "Address Validation API key not configured.",
      };
    }

    const addressLines = apt ? [street, apt] : [street];
    const body = {
      address: {
        regionCode: "US",
        addressLines,
        locality: city,
        administrativeArea: state,
        postalCode: zip,
      },
    };

    let payload: AddressValidationResponse;
    try {
      const res = await fetch(
        `https://addressvalidation.googleapis.com/v1:validateAddress?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      payload = (await res.json()) as AddressValidationResponse;
      if (!res.ok) {
        throw new HttpsError(
          "internal",
          payload.error?.message ?? `Address Validation failed (${res.status})`,
        );
      }
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError(
        "unavailable",
        "Could not reach Address Validation API.",
      );
    }

    const verdict = payload.result?.verdict;
    const postal = payload.result?.address?.postalAddress;
    const complete = verdict?.addressComplete === true;
    const unconfirmed = verdict?.hasUnconfirmedComponents === true;
    const ok = complete && !unconfirmed;

    const normalizedStreet =
      postal?.addressLines?.[0]?.trim() || street;
    const normalizedCity = postal?.locality?.trim() || city;
    const normalizedState = normalizeState(
      postal?.administrativeArea ?? state,
    );
    const normalizedZip = normalizeZip(postal?.postalCode ?? zip);

    let label: ValidateUsAddressResult["verdict"] = "valid";
    if (!ok) {
      label =
        complete || verdict?.hasInferredComponents ? "confirm" : "fix";
    }

    return {
      ok,
      skipped: false,
      verdict: label,
      normalized: {
        street: normalizedStreet,
        city: normalizedCity,
        state: normalizedState,
        zip: normalizedZip,
      },
      formattedAddress: payload.result?.address?.formattedAddress ?? null,
      message: ok
        ? undefined
        : "We could not fully verify this address. Check street, city, state, and ZIP.",
    };
  },
);
