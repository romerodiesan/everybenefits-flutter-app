import {
  callCloudFunction,
  FunctionsUnavailableError,
} from "./call-function";
import type {
  AdminInsights,
  AdminOrgNode,
  UserProfile,
  UserRole,
} from "../types";
import { parseRole } from "../roles";
import type { OrgNodeType } from "@pulse/shared";

function mapUserRow(entry: Record<string, unknown>): UserProfile {
  return {
    uid: String(entry.uid ?? ""),
    email: (entry.email as string) ?? null,
    displayName: (entry.displayName as string) ?? null,
    photoUrl: (entry.photoUrl as string) ?? null,
    role: parseRole(entry.role),
    isAnonymous: Boolean(entry.isAnonymous),
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
    orgNodeId: (entry.orgNodeId as string) ?? null,
    createdAt: null,
    updatedAt: null,
    accountStatus:
      entry.accountStatus === "deactivated" ||
      entry.accountStatus === "pendingDeletion"
        ? entry.accountStatus
        : "active",
    approvalStatus:
      entry.approvalStatus === "pending" ||
      entry.approvalStatus === "approved" ||
      entry.approvalStatus === "rejected"
        ? entry.approvalStatus
        : undefined,
  };
}

function mapOrgNode(entry: Record<string, unknown>): AdminOrgNode {
  return {
    id: String(entry.id ?? ""),
    name: String(entry.name ?? ""),
    type: entry.type as OrgNodeType,
    depth: Number(entry.depth) as AdminOrgNode["depth"],
    parentId: (entry.parentId as string) ?? null,
    path: Array.isArray(entry.path) ? entry.path.map(String) : [],
    managerUids: Array.isArray(entry.managerUids)
      ? entry.managerUids.map(String)
      : [],
    active: entry.active !== false,
  };
}

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

export async function setUserApproval(
  uid: string,
  status: "approved" | "rejected",
) {
  await callCloudFunction("setUserApproval", { uid, status });
}

export async function listPendingApprovals(): Promise<UserProfile[]> {
  try {
    const data = await callCloudFunction<{
      users?: Array<Record<string, unknown>>;
    }>("listPendingApprovals", {});
    return (data?.users ?? []).map(mapUserRow).filter((p) => p.uid);
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
  try {
    const data = await callCloudFunction<{
      users?: Array<Record<string, unknown>>;
    }>("listUsersForAdmin", filters ?? {});
    return (data?.users ?? []).map(mapUserRow).filter((p) => p.uid);
  } catch (error) {
    if (error instanceof FunctionsUnavailableError) return [];
    throw error;
  }
}

export async function adminDeactivateUser(uid: string) {
  await callCloudFunction("adminDeactivateUser", { uid });
}

export async function adminReactivateUser(uid: string) {
  await callCloudFunction("adminReactivateUser", { uid });
}

export async function getAdminInsights(): Promise<AdminInsights | null> {
  try {
    return await callCloudFunction<AdminInsights>("getAdminInsights", {});
  } catch (error) {
    if (error instanceof FunctionsUnavailableError) return null;
    throw error;
  }
}

export async function listOrgSubtree(parentId?: string | null): Promise<AdminOrgNode[]> {
  try {
    const data = await callCloudFunction<{
      nodes?: Array<Record<string, unknown>>;
    }>("listOrgSubtree", { parentId: parentId ?? null });
    return (data?.nodes ?? []).map(mapOrgNode).filter((n) => n.id);
  } catch (error) {
    if (error instanceof FunctionsUnavailableError) return [];
    throw error;
  }
}

export async function ensureOrgRoot(): Promise<AdminOrgNode | null> {
  try {
    const data = await callCloudFunction<{
      node?: Record<string, unknown>;
    }>("ensureOrgRoot", {});
    return data?.node ? mapOrgNode(data.node) : null;
  } catch (error) {
    if (error instanceof FunctionsUnavailableError) return null;
    throw error;
  }
}

export async function createOrgNode(input: {
  name: string;
  type: OrgNodeType;
  parentId: string;
}) {
  const data = await callCloudFunction<{ node?: Record<string, unknown> }>(
    "createOrgNode",
    input,
  );
  return data?.node ? mapOrgNode(data.node) : null;
}

export async function updateOrgNode(input: {
  id: string;
  name?: string;
  active?: boolean;
  managerUids?: string[];
}) {
  const data = await callCloudFunction<{ node?: Record<string, unknown> }>(
    "updateOrgNode",
    input,
  );
  return data?.node ? mapOrgNode(data.node) : null;
}

export async function assignUserToOrgNode(uid: string, orgNodeId: string | null) {
  await callCloudFunction("assignUserToOrgNode", { uid, orgNodeId });
}

export async function listPublicProfiles(max = 80): Promise<UserProfile[]> {
  const data = await callCloudFunction<{
    profiles?: Array<Record<string, unknown>>;
  }>("listPublicProfiles", { limit: max });
  return (data?.profiles ?? []).map(mapUserRow);
}
