import type { AdminUserFilters } from "@pulse/firebase-web";
import type { RoleCategory } from "@pulse/shared";

export const adminQueryKeys = {
  all: ["admin"] as const,
  insights: () => [...adminQueryKeys.all, "insights"] as const,
  users: (filters: AdminUserFilters) =>
    [...adminQueryKeys.all, "users", filters] as const,
  agencies: (opts: {
    pageSize?: number;
    pageToken?: string | null;
    query?: string;
    includeInactive?: boolean;
  }) => [...adminQueryKeys.all, "agencies", opts] as const,
  orgRoots: () => [...adminQueryKeys.all, "org", "roots"] as const,
  orgChildren: (parentId: string) =>
    [...adminQueryKeys.all, "org", "children", parentId] as const,
  orgByType: (type: string, pageSize?: number) =>
    [...adminQueryKeys.all, "org", "type", type, pageSize ?? 100] as const,
  pendingApprovals: () =>
    [...adminQueryKeys.all, "approvals", "pending"] as const,
  roles: (opts?: {
    category?: RoleCategory | "";
    includeInactive?: boolean;
    includeSystem?: boolean;
  }) => [...adminQueryKeys.all, "roles", opts ?? {}] as const,
};
