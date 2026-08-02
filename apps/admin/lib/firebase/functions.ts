import {
  callCloudFunction,
  FunctionsUnavailableError,
  mapAdminUserRow,
  mapOrgNode,
  createAdminRepository,
} from "@pulse/firebase-web";
import type { OrgNodeType, UserRole } from "@pulse/shared";
import type { AdminInsights, AdminOrgNode, UserProfile } from "../types";
import { getFirebaseFunctions } from "./client";

export { FunctionsUnavailableError };

const repo = () => createAdminRepository(getFirebaseFunctions());

export async function setUserRole(uid: string, role: UserRole) {
  try {
    await callCloudFunction(getFirebaseFunctions(), "setUserRole", {
      uid,
      role,
    });
  } catch (error) {
    if (error instanceof FunctionsUnavailableError) {
      throw new Error(
        "Admin role changes need Cloud Functions. Deploy functions on a Blaze plan.",
      );
    }
    throw error;
  }
}

export async function setUserApproval(
  uid: string,
  status: "approved" | "rejected",
) {
  await callCloudFunction(getFirebaseFunctions(), "setUserApproval", {
    uid,
    status,
  });
}

export async function listPendingApprovals(): Promise<UserProfile[]> {
  try {
    const data = await callCloudFunction<{
      users?: Array<Record<string, unknown>>;
    }>(getFirebaseFunctions(), "listPendingApprovals", {});
    return (data?.users ?? []).map(mapAdminUserRow).filter((p) => p.uid) as UserProfile[];
  } catch (error) {
    if (error instanceof FunctionsUnavailableError) return [];
    throw error;
  }
}

export async function listUsersForAdmin(filters?: {
  role?: UserRole | "";
  approvalStatus?: string;
  accountStatus?: string;
  orgNodeId?: string;
  query?: string;
  limit?: number;
}): Promise<UserProfile[]> {
  return (await repo().listUsers(filters)) as UserProfile[];
}

export async function adminDeactivateUser(uid: string) {
  await repo().deactivateUser(uid);
}

export async function adminReactivateUser(uid: string) {
  await repo().reactivateUser(uid);
}

export async function getAdminInsights(): Promise<AdminInsights | null> {
  const data = await repo().getInsights();
  return data as AdminInsights | null;
}

export async function listOrgSubtree(
  parentId?: string | null,
): Promise<AdminOrgNode[]> {
  return (await repo().listOrgSubtree(parentId)) as AdminOrgNode[];
}

export async function ensureOrgRoot(): Promise<AdminOrgNode | null> {
  return (await repo().ensureOrgRoot()) as AdminOrgNode | null;
}

export async function createOrgNode(input: {
  name: string;
  type: OrgNodeType;
  parentId: string;
}) {
  return (await repo().createOrgNode(input)) as AdminOrgNode | null;
}

export async function updateOrgNode(input: {
  id: string;
  name?: string;
  active?: boolean;
  managerUids?: string[];
}) {
  return (await repo().updateOrgNode(input)) as AdminOrgNode | null;
}

export async function assignUserToOrgNode(
  uid: string,
  orgNodeId: string | null,
) {
  await repo().assignUserToOrgNode(uid, orgNodeId);
}

export async function listPublicProfiles(max = 80): Promise<UserProfile[]> {
  const data = await callCloudFunction<{
    profiles?: Array<Record<string, unknown>>;
  }>(getFirebaseFunctions(), "listPublicProfiles", { limit: max });
  return (data?.profiles ?? []).map(mapAdminUserRow) as UserProfile[];
}
