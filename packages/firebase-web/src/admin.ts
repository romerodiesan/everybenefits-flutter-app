import { type Functions } from "firebase/functions";
import {
  parseOrgNodeType,
  parseRole,
  withBannerCompatDefaults,
  type OrgDepth,
  type OrgNode,
  type OrgNodeType,
  type PromoBanner,
  type PromoBannerAudience,
  type PromoBannerFormat,
  type PromoBannerLocalizedString,
  type PromoBannerSurface,
  type PromoBannerType,
  type RoleCategory,
  type RoleDoc,
  type UserRole,
} from "@pulse/shared";
import {
  FunctionsUnavailableError,
  callCloudFunction,
} from "./callables";

export { FunctionsUnavailableError, callCloudFunction };
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
  profileBadge?: {
    enabled: boolean;
    text: string;
    icon: string;
    color: string;
  } | null;
  accountStatus: "active" | "deactivated" | "pendingDeletion";
  approvalStatus?: "pending" | "approved" | "rejected";
  createdAt?: number | null;
};

export type AdminInsights = {
  totalUsers: number;
  byRole: Record<string, number>;
  pendingApprovals: number;
  active: number;
  deactivated: number;
  pendingDeletion: number;
  orgNodeCount: number;
};

export type ListUsersResult = {
  users: AdminUserRow[];
  nextPageToken: string | null;
};

export type ListAgenciesResult = {
  agencies: OrgNode[];
  nextPageToken: string | null;
};

export type ListRolesFilters = {
  category?: RoleCategory | "";
  includeInactive?: boolean;
  includeSystem?: boolean;
};

export type ListRolesResult = {
  roles: RoleDoc[];
};

export type BulkFailure = {
  id: string;
  code: string;
  message: string;
};

export type BulkResult = {
  ok: boolean;
  succeeded: string[];
  failed: BulkFailure[];
};

function mapRoleDoc(entry: Record<string, unknown>): RoleDoc {
  const category = String(entry.category ?? "custom");
  return {
    id: String(entry.id ?? ""),
    name: String(entry.name ?? ""),
    description:
      typeof entry.description === "string" ? entry.description : undefined,
    category: (category as RoleCategory) || "custom",
    permissions: Array.isArray(entry.permissions)
      ? entry.permissions.map(String)
      : [],
    builtIn: entry.builtIn === true,
    editableBySystemOnly: entry.editableBySystemOnly === true,
    locked: entry.locked === true,
    active: entry.active !== false,
    sortOrder: typeof entry.sortOrder === "number" ? entry.sortOrder : 100,
    badgeText: typeof entry.badgeText === "string" ? entry.badgeText : null,
    badgeIcon: typeof entry.badgeIcon === "string" ? entry.badgeIcon : null,
    badgeColor: typeof entry.badgeColor === "string" ? entry.badgeColor : null,
    createdAt: typeof entry.createdAt === "number" ? entry.createdAt : null,
    updatedAt: typeof entry.updatedAt === "number" ? entry.updatedAt : null,
    updatedBy: typeof entry.updatedBy === "string" ? entry.updatedBy : null,
  };
}

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
    profileBadge:
      entry.profileBadge && typeof entry.profileBadge === "object"
        ? {
            enabled: (entry.profileBadge as { enabled?: unknown }).enabled === true,
            text: String((entry.profileBadge as { text?: unknown }).text ?? ""),
            icon: String((entry.profileBadge as { icon?: unknown }).icon ?? "badge"),
            color: String((entry.profileBadge as { color?: unknown }).color ?? "accent"),
          }
        : null,
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
    createdAt:
      typeof entry.createdAt === "number" ? entry.createdAt : null,
  };
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
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
    ownerUids: Array.isArray(entry.ownerUids)
      ? entry.ownerUids.map(String).filter(Boolean)
      : [],
    logoUrl: stringOrNull(entry.logoUrl),
    email: stringOrNull(entry.email),
    paymentsEmail: stringOrNull(entry.paymentsEmail),
    npn: stringOrNull(entry.npn),
    agencyLicense: stringOrNull(entry.agencyLicense),
    ein: stringOrNull(entry.ein),
    active: entry.active !== false,
  };
}

export type AdminUserFilters = {
  role?: UserRole | "";
  approvalStatus?: string;
  accountStatus?: string;
  orgNodeId?: string;
  query?: string;
  pageSize?: number;
  pageToken?: string | null;
  /** @deprecated use pageSize */
  limit?: number;
};

export type AdminRepository = {
  listUsers: (filters?: AdminUserFilters) => Promise<ListUsersResult>;
  createUser: (input: {
    email: string;
    password: string;
    displayName?: string;
    role?: UserRole | string;
    orgNodeId?: string | null;
    npn?: string | null;
    approvalStatus?: "pending" | "approved" | "rejected";
  }) => Promise<AdminUserRow | null>;
  updateUser: (input: {
    uid: string;
    email?: string;
    displayName?: string;
    role?: UserRole | string;
    orgNodeId?: string | null;
    npn?: string | null;
    approvalStatus?: "pending" | "approved" | "rejected";
    profileBadge?: {
      enabled: boolean;
      text: string;
      icon: string;
      color: string;
    } | null;
  }) => Promise<AdminUserRow | null>;
  deactivateUser: (uid: string) => Promise<void>;
  reactivateUser: (uid: string) => Promise<void>;
  bulkSetUserApproval: (
    uids: string[],
    status: "pending" | "approved" | "rejected",
  ) => Promise<BulkResult>;
  bulkSetUserAccountStatus: (
    uids: string[],
    status: "active" | "deactivated",
  ) => Promise<BulkResult>;
  bulkSetUserRole: (uids: string[], role: string) => Promise<BulkResult>;
  bulkAssignUsersToOrgNode: (
    uids: string[],
    orgNodeId: string | null,
  ) => Promise<BulkResult>;
  bulkSetOrgNodesActive: (
    ids: string[],
    active: boolean,
  ) => Promise<BulkResult>;
  getInsights: () => Promise<AdminInsights | null>;
  listOrgSubtree: (
    parentId?: string | null,
    opts?: { full?: boolean; includeInactive?: boolean },
  ) => Promise<OrgNode[]>;
  listAgencies: (opts?: {
    pageSize?: number;
    pageToken?: string | null;
    query?: string;
    includeInactive?: boolean;
  }) => Promise<ListAgenciesResult>;
  listOrgNodesByType: (
    type: OrgNodeType,
    pageSize?: number,
  ) => Promise<OrgNode[]>;
  ensureOrgRoot: () => Promise<OrgNode | null>;
  createOrgNode: (input: {
    name: string;
    type: OrgNodeType;
    parentId: string;
    logoUrl?: string | null;
    ownerUids?: string[];
    email?: string | null;
    paymentsEmail?: string | null;
    npn?: string | null;
    agencyLicense?: string | null;
    ein?: string | null;
  }) => Promise<OrgNode | null>;
  updateOrgNode: (input: {
    id: string;
    name?: string;
    active?: boolean;
    managerUids?: string[];
    logoUrl?: string | null;
    ownerUids?: string[];
    email?: string | null;
    paymentsEmail?: string | null;
    npn?: string | null;
    agencyLicense?: string | null;
    ein?: string | null;
  }) => Promise<OrgNode | null>;
  assignUserToOrgNode: (
    uid: string,
    orgNodeId: string | null,
  ) => Promise<void>;
  migrateSubAgenciesToAgencies: () => Promise<{
    scanned: number;
    updated: number;
    done: boolean;
  }>;
  uploadOrgLogo: (input: {
    orgNodeId: string;
    contentType: string;
    bytesBase64: string;
  }) => Promise<{ downloadUrl: string; path: string } | null>;
  setUserRole: (uid: string, role: UserRole | string) => Promise<void>;
  listRoles: (filters?: ListRolesFilters) => Promise<ListRolesResult>;
  createRole: (input: {
    id: string;
    name: string;
    description?: string;
    category?: RoleCategory;
    permissions?: string[];
    sortOrder?: number;
    badgeText?: string | null;
    badgeIcon?: string | null;
    badgeColor?: string | null;
  }) => Promise<RoleDoc | null>;
  updateRole: (input: {
    id: string;
    name?: string;
    description?: string;
    category?: RoleCategory;
    permissions?: string[];
    active?: boolean;
    sortOrder?: number;
    badgeText?: string | null;
    badgeIcon?: string | null;
    badgeColor?: string | null;
  }) => Promise<RoleDoc | null>;
  deleteRole: (id: string, hard?: boolean) => Promise<void>;
  seedSystemRoles: () => Promise<ListRolesResult>;
  backfillUserSearchFields: (input?: {
    pageSize?: number;
    pageToken?: string | null;
  }) => Promise<{
    scanned: number;
    updated: number;
    done: boolean;
    nextPageToken: string | null;
  }>;
  listPromoBanners: () => Promise<{ banners: PromoBanner[] }>;
  upsertPromoBanner: (input: {
    id?: string;
    version?: number;
    active?: boolean;
    type?: PromoBannerType;
    format?: PromoBannerFormat;
    surface: PromoBannerSurface;
    audiences: PromoBannerAudience[];
    dismissible?: boolean;
    showCta?: boolean;
    showImage?: boolean;
    eyebrow: PromoBannerLocalizedString;
    title: PromoBannerLocalizedString;
    body: PromoBannerLocalizedString;
    ctaLabel?: PromoBannerLocalizedString;
    href?: string;
    imageUrl?: string | null;
    imagePath?: string | null;
    startsAt?: number | null;
    endsAt?: number | null;
    bumpVersion?: boolean;
  }) => Promise<PromoBanner | null>;
  deletePromoBanner: (id: string, hard?: boolean) => Promise<void>;
  uploadPromoBannerImage: (input: {
    bannerId: string;
    contentType: string;
    bytesBase64: string;
  }) => Promise<{ downloadUrl: string; path: string } | null>;
};

function mapPromoBanner(entry: Record<string, unknown>): PromoBanner {
  const localized = (value: unknown): PromoBannerLocalizedString => {
    if (!value || typeof value !== "object") return { en: "", es: "" };
    const record = value as Record<string, unknown>;
    return {
      en: typeof record.en === "string" ? record.en : "",
      es: typeof record.es === "string" ? record.es : "",
    };
  };
  return withBannerCompatDefaults({
    id: String(entry.id ?? ""),
    version: typeof entry.version === "number" ? entry.version : 1,
    active: entry.active === true,
    type: entry.type as PromoBannerType | undefined,
    format: entry.format as PromoBannerFormat | undefined,
    surface: (entry.surface as PromoBannerSurface) ?? "home",
    audiences: Array.isArray(entry.audiences)
      ? (entry.audiences.map(String) as PromoBannerAudience[])
      : ["all"],
    dismissible: entry.dismissible !== false,
    showCta: entry.showCta !== false,
    showImage:
      typeof entry.showImage === "boolean" ? entry.showImage : undefined,
    eyebrow: localized(entry.eyebrow),
    title: localized(entry.title),
    body: localized(entry.body),
    ctaLabel: localized(entry.ctaLabel),
    href: typeof entry.href === "string" ? entry.href : "",
    imageUrl: typeof entry.imageUrl === "string" ? entry.imageUrl : null,
    imagePath: typeof entry.imagePath === "string" ? entry.imagePath : null,
    startsAt: typeof entry.startsAt === "number" ? entry.startsAt : null,
    endsAt: typeof entry.endsAt === "number" ? entry.endsAt : null,
    createdAt: typeof entry.createdAt === "number" ? entry.createdAt : null,
    updatedAt: typeof entry.updatedAt === "number" ? entry.updatedAt : null,
    updatedBy: typeof entry.updatedBy === "string" ? entry.updatedBy : null,
  });
}
export function createAdminRepository(functions: Functions): AdminRepository {
  return {
    async listUsers(filters) {
      try {
        const data = await callCloudFunction<{
          users?: Array<Record<string, unknown>>;
          nextPageToken?: string | null;
        }>(functions, "listUsersForAdmin", {
          ...filters,
          pageSize: filters?.pageSize ?? filters?.limit ?? 25,
          pageToken: filters?.pageToken ?? undefined,
        });
        return {
          users: (data?.users ?? [])
            .map(mapAdminUserRow)
            .filter((p) => p.uid),
          nextPageToken: data?.nextPageToken ?? null,
        };
      } catch (error) {
        if (error instanceof FunctionsUnavailableError) {
          return { users: [], nextPageToken: null };
        }
        throw error;
      }
    },
    async createUser(input) {
      const data = await callCloudFunction<{
        user?: Record<string, unknown>;
      }>(functions, "adminCreateUser", input);
      return data?.user ? mapAdminUserRow(data.user) : null;
    },
    async updateUser(input) {
      const data = await callCloudFunction<{
        user?: Record<string, unknown>;
      }>(functions, "adminUpdateUser", input);
      return data?.user ? mapAdminUserRow(data.user) : null;
    },
    async deactivateUser(uid) {
      await callCloudFunction(functions, "adminDeactivateUser", { uid });
    },
    async reactivateUser(uid) {
      await callCloudFunction(functions, "adminReactivateUser", { uid });
    },
    async bulkSetUserApproval(uids, status) {
      return await callCloudFunction<BulkResult>(
        functions,
        "bulkSetUserApproval",
        { uids, status },
      );
    },
    async bulkSetUserAccountStatus(uids, status) {
      return await callCloudFunction<BulkResult>(
        functions,
        "bulkSetUserAccountStatus",
        { uids, status },
      );
    },
    async bulkSetUserRole(uids, role) {
      return await callCloudFunction<BulkResult>(
        functions,
        "bulkSetUserRole",
        { uids, role },
      );
    },
    async bulkAssignUsersToOrgNode(uids, orgNodeId) {
      return await callCloudFunction<BulkResult>(
        functions,
        "bulkAssignUsersToOrgNode",
        { uids, orgNodeId },
      );
    },
    async bulkSetOrgNodesActive(ids, active) {
      return await callCloudFunction<BulkResult>(
        functions,
        "bulkSetOrgNodesActive",
        { ids, active },
      );
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
    async listOrgSubtree(parentId, opts) {
      try {
        const data = await callCloudFunction<{
          nodes?: Array<Record<string, unknown>>;
        }>(functions, "listOrgSubtree", {
          parentId: parentId ?? null,
          full: opts?.full === true,
          includeInactive: opts?.includeInactive === true,
        });
        return (data?.nodes ?? []).map(mapOrgNode).filter((n) => n.id);
      } catch (error) {
        if (error instanceof FunctionsUnavailableError) return [];
        throw error;
      }
    },
    async listAgencies(opts) {
      const data = await callCloudFunction<{
        agencies?: Array<Record<string, unknown>>;
        nextPageToken?: string | null;
      }>(functions, "listAgenciesForAdmin", opts ?? {});
      return {
        agencies: (data?.agencies ?? []).map(mapOrgNode).filter((n) => n.id),
        nextPageToken: data?.nextPageToken ?? null,
      };
    },
    async listOrgNodesByType(type, pageSize = 100) {
      const data = await callCloudFunction<{
        nodes?: Array<Record<string, unknown>>;
      }>(functions, "listOrgNodesByType", { type, pageSize });
      return (data?.nodes ?? []).map(mapOrgNode).filter((n) => n.id);
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
    async migrateSubAgenciesToAgencies() {
      const data = await callCloudFunction<{
        scanned?: number;
        updated?: number;
        done?: boolean;
      }>(functions, "migrateSubAgenciesToAgencies", {});
      return {
        scanned: Number(data?.scanned ?? 0),
        updated: Number(data?.updated ?? 0),
        done: data?.done !== false,
      };
    },
    async uploadOrgLogo(input) {
      const data = await callCloudFunction<{
        downloadUrl?: string;
        path?: string;
      }>(functions, "uploadOrgLogo", input);
      if (!data?.downloadUrl) return null;
      return {
        downloadUrl: String(data.downloadUrl),
        path: String(data.path ?? ""),
      };
    },
    async setUserRole(uid, role) {
      await callCloudFunction(functions, "setUserRole", { uid, role });
    },
    async listRoles(filters) {
      try {
        const data = await callCloudFunction<{
          roles?: Array<Record<string, unknown>>;
        }>(functions, "listRoles", filters ?? {});
        return {
          roles: (data?.roles ?? [])
            .map(mapRoleDoc)
            .filter((r) => r.id),
        };
      } catch (error) {
        if (error instanceof FunctionsUnavailableError) {
          return { roles: [] };
        }
        throw error;
      }
    },
    async createRole(input) {
      const data = await callCloudFunction<{
        role?: Record<string, unknown>;
      }>(functions, "createRole", input);
      return data?.role ? mapRoleDoc(data.role) : null;
    },
    async updateRole(input) {
      const data = await callCloudFunction<{
        role?: Record<string, unknown>;
      }>(functions, "updateRole", input);
      return data?.role ? mapRoleDoc(data.role) : null;
    },
    async deleteRole(id, hard = false) {
      await callCloudFunction(functions, "deleteRole", { id, hard });
    },
    async seedSystemRoles() {
      const data = await callCloudFunction<{
        roles?: Array<Record<string, unknown>>;
      }>(functions, "seedSystemRoles", {});
      return {
        roles: (data?.roles ?? []).map(mapRoleDoc).filter((r) => r.id),
      };
    },
    async backfillUserSearchFields(input) {
      const data = await callCloudFunction<{
        scanned?: number;
        updated?: number;
        done?: boolean;
        nextPageToken?: string | null;
      }>(functions, "backfillUserSearchFields", {
        pageSize: input?.pageSize,
        pageToken: input?.pageToken ?? undefined,
      });
      return {
        scanned: Number(data?.scanned ?? 0),
        updated: Number(data?.updated ?? 0),
        done: Boolean(data?.done),
        nextPageToken: data?.nextPageToken ?? null,
      };
    },
    async listPromoBanners() {
      try {
        const data = await callCloudFunction<{
          banners?: Array<Record<string, unknown>>;
        }>(functions, "listPromoBanners", {});
        return {
          banners: (data?.banners ?? [])
            .map(mapPromoBanner)
            .filter((b) => b.id),
        };
      } catch (error) {
        if (error instanceof FunctionsUnavailableError) {
          return { banners: [] };
        }
        throw error;
      }
    },
    async upsertPromoBanner(input) {
      const data = await callCloudFunction<{
        banner?: Record<string, unknown>;
      }>(functions, "upsertPromoBanner", input);
      return data?.banner ? mapPromoBanner(data.banner) : null;
    },
    async deletePromoBanner(id, hard = false) {
      await callCloudFunction(functions, "deletePromoBanner", { id, hard });
    },
    async uploadPromoBannerImage(input) {
      const data = await callCloudFunction<{
        downloadUrl?: string;
        path?: string;
      }>(functions, "uploadPromoBannerImage", input);
      if (!data?.downloadUrl) return null;
      return {
        downloadUrl: String(data.downloadUrl),
        path: String(data.path ?? ""),
      };
    },
  };
}
