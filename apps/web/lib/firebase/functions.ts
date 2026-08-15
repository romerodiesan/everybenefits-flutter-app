import {
  callCloudFunction,
  FunctionsUnavailableError,
} from "./call-function";
import { getFirebaseAuth } from "./client";
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

/** Self-service account lifecycle; all enforce `uid == request.auth.uid`. */
export async function deactivateAccount(): Promise<void> {
  await callCloudFunction("deactivateAccount", {});
}

export async function reactivateAccount(): Promise<void> {
  await callCloudFunction("reactivateAccount", {});
}

export async function requestAccountDeletion(): Promise<{
  deletionScheduledAt: number;
}> {
  return callCloudFunction("requestAccountDeletion", {});
}

export async function cancelAccountDeletion(): Promise<void> {
  await callCloudFunction("cancelAccountDeletion", {});
}

export async function updateAccountEmail(email: string): Promise<{ email: string }> {
  const result = await callCloudFunction<{ email: string }>("updateAccountEmail", {
    email,
  });
  await getFirebaseAuth().currentUser?.reload();
  return result;
}

export async function updateUsername(username: string): Promise<{ username: string }> {
  return callCloudFunction<{ username: string }>("updateUsername", { username });
}

export async function listPublicProfiles(max = 80): Promise<UserProfile[]> {
  const data = await callCloudFunction<{
    profiles?: Array<Record<string, unknown>>;
  }>("listPublicProfiles", { limit: max });
  return (data?.profiles ?? []).map((entry) => ({
    uid: String(entry.uid ?? ""),
    email: null,
    displayName: (entry.displayName as string) ?? null,
    username: (entry.username as string) ?? null,
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
    bio: (entry.bio as string) ?? null,
    createdAt: null,
    updatedAt: null,
  }));
}

export async function searchDirectory(
  query: string,
  limit = 40,
): Promise<UserProfile[]> {
  const data = await callCloudFunction<{
    profiles?: Array<Record<string, unknown>>;
  }>("searchDirectory", { query, limit });
  return (data?.profiles ?? []).map((entry) => ({
    uid: String(entry.uid ?? ""),
    email: (entry.email as string) ?? null,
    displayName: (entry.displayName as string) ?? null,
    username: (entry.username as string) ?? null,
    photoUrl: (entry.photoUrl as string) ?? null,
    role: parseRole(entry.role),
    isAnonymous: false,
    profileCompleted: (entry.profileCompleted as boolean) ?? true,
    phoneCountryCode: null,
    phoneNumber: null,
    npn: (entry.npn as string) ?? null,
    address: null,
    addressStreet: null,
    addressApt: null,
    addressCity: null,
    addressState: null,
    addressZip: null,
    agency: (entry.agency as string) ?? null,
    bio: (entry.bio as string) ?? null,
    createdAt: null,
    updatedAt: null,
  }));
}

export async function listPendingApprovals(): Promise<UserProfile[]> {
  const data = await callCloudFunction<{
    users?: Array<Record<string, unknown>>;
  }>("listPendingApprovals", {});
  return (data?.users ?? []).map((entry) => ({
    uid: String(entry.uid ?? ""),
    email: (entry.email as string) ?? null,
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
    bio: (entry.bio as string) ?? null,
    createdAt: null,
    updatedAt: null,
    approvalStatus: "pending",
  }));
}

export async function setUserApproval(
  uid: string,
  status: "approved" | "rejected",
): Promise<void> {
  await callCloudFunction("setUserApproval", { uid, status });
}
