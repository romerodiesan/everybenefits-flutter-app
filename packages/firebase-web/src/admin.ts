import { httpsCallable, type Functions } from "firebase/functions";
import {
  parseOrgNodeType,
  parseRole,
  type OrgDepth,
  type OrgNode,
  type OrgNodeType,
  type UserRole,
} from "@pulse/shared";

export class FunctionsUnavailableError extends Error {
  constructor(message = "Cloud Functions unavailable") {
    super(message);
    this.name = "FunctionsUnavailableError";
  }
}

export async function callCloudFunction<T>(
  functions: Functions,
  name: string,
  data?: unknown,
): Promise<T> {
  try {
    const callable = httpsCallable(functions, name);
    const result = await callable(data ?? {});
    return result.data as T;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (
      code.includes("unavailable") ||
      code.includes("not-found") ||
      code.includes("failed-precondition")
    ) {
      throw new FunctionsUnavailableError(
        error instanceof Error ? error.message : String(error),
      );
    }
    throw error;
  }
}

export type AdminUserRow = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  role: UserRole;
  isAnonymous: boolean;
  profileCompleted: boolean;
  npn: string | null;
  agency: string | null;
  orgNodeId: string | null;
  accountStatus: "active" | "deactivated" | "pendingDeletion";
  approvalStatus?: "pending" | "approved" | "rejected";
};

export type AdminInsights = {
  totalUsers: number;
  byRole: Record<string, number>;
  pendingApprovals: number;
  active: number;
  deactivated: number;
  pendingDeletion: number;
  orgNodeCount: number;
  recentRegistrations: Array<{
    uid: string;
    displayName: string | null;
    email: string | null;
    role: string;
    createdAt: number | null;
  }>;
};

export function mapAdminUserRow(entry: Record<string, unknown>): AdminUserRow {
  return {
    uid: String(entry.uid ?? ""),
    email: (entry.email as string) ?? null,
    displayName: (entry.displayName as string) ?? null,
    photoUrl: (entry.photoUrl as string) ?? null,
    role: parseRole(entry.role),
    isAnonymous: Boolean(entry.isAnonymous),
    profileCompleted: (entry.profileCompleted as boolean) ?? true,
    npn: (entry.npn as string) ?? null,
    agency: (entry.agency as string) ?? null,
    orgNodeId: (entry.orgNodeId as string) ?? null,
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

export function mapOrgNode(entry: Record<string, unknown>): OrgNode {
  const type = parseOrgNodeType(entry.type) ?? "organization";
  const depth = Number(entry.depth);
  return {
    id: String(entry.id ?? ""),
    name: String(entry.name ?? ""),
    type,
    depth: (depth >= 1 && depth <= 7 ? depth : 1) as OrgDepth,
    parentId: (entry.parentId as string) ?? null,
    path: Array.isArray(entry.path) ? entry.path.map(String) : [],
    managerUids: Array.isArray(entry.managerUids)
      ? entry.managerUids.map(String)
      : [],
    active: entry.active !== false,
  };
}

export type AdminRepository = {
  listUsers: (filters?: {
    role?: UserRole | "";
    approvalStatus?: string;
    accountStatus?: string;
    orgNodeId?: string;
    query?: string;
    limit?: number;
  }) => Promise<AdminUserRow[]>;
  deactivateUser: (uid: string) => Promise<void>;
  reactivateUser: (uid: string) => Promise<void>;
  getInsights: () => Promise<AdminInsights | null>;
  listOrgSubtree: (parentId?: string | null) => Promise<OrgNode[]>;
  ensureOrgRoot: () => Promise<OrgNode | null>;
  createOrgNode: (input: {
    name: string;
    type: OrgNodeType;
    parentId: string;
  }) => Promise<OrgNode | null>;
  updateOrgNode: (input: {
    id: string;
    name?: string;
    active?: boolean;
    managerUids?: string[];
  }) => Promise<OrgNode | null>;
  assignUserToOrgNode: (
    uid: string,
    orgNodeId: string | null,
  ) => Promise<void>;
  setUserRole: (uid: string, role: UserRole) => Promise<void>;
};

export function createAdminRepository(functions: Functions): AdminRepository {
  return {
    async listUsers(filters) {
      try {
        const data = await callCloudFunction<{
          users?: Array<Record<string, unknown>>;
        }>(functions, "listUsersForAdmin", filters ?? {});
        return (data?.users ?? []).map(mapAdminUserRow).filter((p) => p.uid);
      } catch (error) {
        if (error instanceof FunctionsUnavailableError) return [];
        throw error;
      }
    },
    async deactivateUser(uid) {
      await callCloudFunction(functions, "adminDeactivateUser", { uid });
    },
    async reactivateUser(uid) {
      await callCloudFunction(functions, "adminReactivateUser", { uid });
    },
    async getInsights() {
      try {
        return await callCloudFunction<AdminInsights>(
          functions,
          "getAdminInsights",
          {},
        );
      } catch (error) {
        if (error instanceof FunctionsUnavailableError) return null;
        throw error;
      }
    },
    async listOrgSubtree(parentId) {
      try {
        const data = await callCloudFunction<{
          nodes?: Array<Record<string, unknown>>;
        }>(functions, "listOrgSubtree", { parentId: parentId ?? null });
        return (data?.nodes ?? []).map(mapOrgNode).filter((n) => n.id);
      } catch (error) {
        if (error instanceof FunctionsUnavailableError) return [];
        throw error;
      }
    },
    async ensureOrgRoot() {
      try {
        const data = await callCloudFunction<{
          node?: Record<string, unknown>;
        }>(functions, "ensureOrgRoot", {});
        return data?.node ? mapOrgNode(data.node) : null;
      } catch (error) {
        if (error instanceof FunctionsUnavailableError) return null;
        throw error;
      }
    },
    async createOrgNode(input) {
      const data = await callCloudFunction<{
        node?: Record<string, unknown>;
      }>(functions, "createOrgNode", input);
      return data?.node ? mapOrgNode(data.node) : null;
    },
    async updateOrgNode(input) {
      const data = await callCloudFunction<{
        node?: Record<string, unknown>;
      }>(functions, "updateOrgNode", input);
      return data?.node ? mapOrgNode(data.node) : null;
    },
    async assignUserToOrgNode(uid, orgNodeId) {
      await callCloudFunction(functions, "assignUserToOrgNode", {
        uid,
        orgNodeId,
      });
    },
    async setUserRole(uid, role) {
      await callCloudFunction(functions, "setUserRole", { uid, role });
    },
  };
}
