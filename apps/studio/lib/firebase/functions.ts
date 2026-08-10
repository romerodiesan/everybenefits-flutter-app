import {
  callCloudFunction,
} from "./call-function";
import type { UserProfile } from "../types";
import { parseRole } from "../roles";

export async function listPublicProfiles(max = 80): Promise<UserProfile[]> {
  const data = await callCloudFunction<{
    profiles?: Array<Record<string, unknown>>;
  }>("listPublicProfiles", { limit: max });
  return (data?.profiles ?? []).map((entry) => ({
    uid: String(entry.uid ?? ""),
    email: null,
    displayName: (entry.displayName as string) ?? null,
    photoUrl: (entry.photoUrl as string) ?? null,
    role: parseRole(entry.role),
    isAnonymous: false,
    profileCompleted: (entry.profileCompleted as boolean) ?? true,
    phoneCountryCode: null,
    phoneNumber: null,
    npn: null,
    address: null,
    addressStreet: null,
    addressApt: null,
    addressCity: null,
    addressState: null,
    addressZip: null,
    agency: (entry.agency as string) ?? null,
    createdAt: null,
    updatedAt: null,
  }));
}
