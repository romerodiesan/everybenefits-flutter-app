import {
  callCloudFunction,
  FunctionsUnavailableError,
} from "./call-function";

export type AgencyOption = {
  id: string;
  name: string;
};

/** Sentinel dropdown values (not org node ids). */
export const AGENCY_SOLO_ID = "__solo__";
export const AGENCY_OWN_ID = "__own__";

/** Canonical profile.agency value when the agent runs solo. */
export const AGENCY_SOLO_VALUE = "I run solo";

/** Canonical profile.agency value when the agent has their own agency. */
export const AGENCY_OWN_VALUE = "I have my own agency";

/**
 * Active agencies from orgNodes (via Cloud Function).
 * Soft-fails to [] when Functions are unavailable.
 */
export async function listAgenciesForProfile(): Promise<AgencyOption[]> {
  try {
    const data = await callCloudFunction<{ agencies?: AgencyOption[] }>(
      "listAgenciesForProfile",
      {},
    );
    return (data.agencies ?? [])
      .filter((row) => row?.id && row?.name)
      .map((row) => ({ id: String(row.id), name: String(row.name).trim() }))
      .filter((row) => row.name.length > 0);
  } catch (error) {
    if (error instanceof FunctionsUnavailableError) return [];
    throw error;
  }
}
