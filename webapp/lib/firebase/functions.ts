import {
  callCloudFunction,
  FunctionsUnavailableError,
} from "./call-function";
import type { UserProfile, UserRole } from "../types";
import { parseRole } from "../roles";

export async function setUserRole(uid: string, role: UserRole) {
  try {
    await callCloudFunction("setUserRole", { uid, role });
  } catch (error) {
    if (error instanceof FunctionsUnavailableError) {
      throw new Error(
        "Admin role changes need Cloud Functions. Deploy functions on a Blaze plan.",
      );
    }
    throw error;
  }
}

export async function listStudentsForPromotion(): Promise<UserProfile[]> {
  try {
    const data = await callCloudFunction<{
      students?: Array<Record<string, unknown>>;
    }>("listStudentsForPromotion", {});
    return (data?.students ?? [])
      .map((entry) => ({
        uid: String(entry.uid ?? ""),
        email: (entry.email as string) ?? null,
        displayName: (entry.displayName as string) ?? null,
        photoUrl: (entry.photoUrl as string) ?? null,
        role: parseRole(entry.role),
        isAnonymous: Boolean(entry.isAnonymous),
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
        agency: null,
        createdAt: null,
        updatedAt: null,
      }))
      .filter((p) => p.uid && p.role === "student");
  } catch (error) {
    if (error instanceof FunctionsUnavailableError) {
      return [];
    }
    throw error;
  }
}
