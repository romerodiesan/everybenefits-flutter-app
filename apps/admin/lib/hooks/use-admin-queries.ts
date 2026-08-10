"use client";

import {
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import type {
  AdminInsights,
  AdminUserFilters,
  AdminUserRow,
  ListAgenciesResult,
  ListRolesResult,
  ListUsersResult,
} from "@pulse/firebase-web";
import type { OrgNode, RoleCategory } from "@pulse/shared";
import { getAdminRepository } from "@/lib/repositories/admin-repository";
import { adminQueryKeys } from "@/lib/admin-query-keys";
import { listPendingApprovals } from "@/lib/firebase/functions";
import type { UserProfile } from "@/lib/types";

export function useAdminInsightsQuery(): UseQueryResult<AdminInsights | null> {
  return useQuery({
    queryKey: adminQueryKeys.insights(),
    queryFn: () => getAdminRepository().getInsights(),
  });
}

export function useAdminUsersQuery(
  filters: AdminUserFilters,
): UseQueryResult<ListUsersResult> {
  return useQuery({
    queryKey: adminQueryKeys.users(filters),
    queryFn: () => getAdminRepository().listUsers(filters),
    placeholderData: (prev) => prev,
  });
}

export function useAdminAgenciesQuery(
  opts: {
    pageSize?: number;
    pageToken?: string | null;
    query?: string;
    includeInactive?: boolean;
  },
  enabled = true,
): UseQueryResult<ListAgenciesResult> {
  return useQuery({
    queryKey: adminQueryKeys.agencies(opts),
    queryFn: () => getAdminRepository().listAgencies(opts),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useOrgNodesByTypeQuery(
  type: OrgNode["type"],
  pageSize = 100,
  enabled = true,
) {
  return useQuery({
    queryKey: adminQueryKeys.orgByType(type, pageSize),
    queryFn: () => getAdminRepository().listOrgNodesByType(type, pageSize),
    enabled,
  });
}

export function useOrgRootsQuery(enabled = true) {
  return useQuery({
    queryKey: adminQueryKeys.orgRoots(),
    queryFn: () =>
      getAdminRepository().listOrgSubtree(null, { includeInactive: true }),
    enabled,
  });
}

export async function fetchOrgChildren(
  client: QueryClient,
  parentId: string,
) {
  return client.fetchQuery({
    queryKey: adminQueryKeys.orgChildren(parentId),
    queryFn: () =>
      getAdminRepository().listOrgSubtree(parentId, {
        includeInactive: true,
      }),
    staleTime: 45_000,
  });
}

export function usePendingApprovalsQuery(): UseQueryResult<UserProfile[]> {
  return useQuery({
    queryKey: adminQueryKeys.pendingApprovals(),
    queryFn: () => listPendingApprovals(),
  });
}

export function useAdminRolesQuery(
  opts?: {
    category?: RoleCategory | "";
    includeInactive?: boolean;
    includeSystem?: boolean;
  },
  enabled = true,
): UseQueryResult<ListRolesResult> {
  return useQuery({
    queryKey: adminQueryKeys.roles(opts),
    queryFn: () => getAdminRepository().listRoles(opts),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useInvalidateAdminQueries() {
  const client = useQueryClient();
  return {
    invalidateUsers: () =>
      client.invalidateQueries({ queryKey: [...adminQueryKeys.all, "users"] }),
    invalidateInsights: () =>
      client.invalidateQueries({ queryKey: adminQueryKeys.insights() }),
    invalidateAgencies: () =>
      client.invalidateQueries({
        queryKey: [...adminQueryKeys.all, "agencies"],
      }),
    invalidateOrgs: () =>
      client.invalidateQueries({ queryKey: [...adminQueryKeys.all, "org"] }),
    invalidateApprovals: () =>
      client.invalidateQueries({
        queryKey: adminQueryKeys.pendingApprovals(),
      }),
    invalidateRoles: () =>
      client.invalidateQueries({ queryKey: [...adminQueryKeys.all, "roles"] }),
    invalidateAll: () =>
      client.invalidateQueries({ queryKey: adminQueryKeys.all }),
  };
}

export type { AdminUserRow };
