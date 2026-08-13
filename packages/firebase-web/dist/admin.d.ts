import { type Functions } from "firebase/functions";
import { type OrgNode, type OrgNodeType, type PromoBanner, type PromoBannerAudience, type PromoBannerFormat, type PromoBannerLocalizedString, type PromoBannerSurface, type PromoBannerType, type RoleCategory, type RoleDoc, type UserRole } from "@pulse/shared";
import { FunctionsUnavailableError, callCloudFunction } from "./callables";
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
export declare function mapAdminUserRow(entry: Record<string, unknown>): AdminUserRow;
export declare function mapOrgNode(entry: Record<string, unknown>): OrgNode;
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
    }) => Promise<AdminUserRow | null>;
    deactivateUser: (uid: string) => Promise<void>;
    reactivateUser: (uid: string) => Promise<void>;
    bulkSetUserApproval: (uids: string[], status: "pending" | "approved" | "rejected") => Promise<BulkResult>;
    bulkSetUserAccountStatus: (uids: string[], status: "active" | "deactivated") => Promise<BulkResult>;
    bulkSetUserRole: (uids: string[], role: string) => Promise<BulkResult>;
    bulkAssignUsersToOrgNode: (uids: string[], orgNodeId: string | null) => Promise<BulkResult>;
    bulkSetOrgNodesActive: (ids: string[], active: boolean) => Promise<BulkResult>;
    getInsights: () => Promise<AdminInsights | null>;
    listOrgSubtree: (parentId?: string | null, opts?: {
        full?: boolean;
        includeInactive?: boolean;
    }) => Promise<OrgNode[]>;
    listAgencies: (opts?: {
        pageSize?: number;
        pageToken?: string | null;
        query?: string;
        includeInactive?: boolean;
    }) => Promise<ListAgenciesResult>;
    listOrgNodesByType: (type: OrgNodeType, pageSize?: number) => Promise<OrgNode[]>;
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
    assignUserToOrgNode: (uid: string, orgNodeId: string | null) => Promise<void>;
    migrateSubAgenciesToAgencies: () => Promise<{
        scanned: number;
        updated: number;
        done: boolean;
    }>;
    uploadOrgLogo: (input: {
        orgNodeId: string;
        contentType: string;
        bytesBase64: string;
    }) => Promise<{
        downloadUrl: string;
        path: string;
    } | null>;
    setUserRole: (uid: string, role: UserRole | string) => Promise<void>;
    listRoles: (filters?: ListRolesFilters) => Promise<ListRolesResult>;
    createRole: (input: {
        id: string;
        name: string;
        description?: string;
        category?: RoleCategory;
        permissions?: string[];
        sortOrder?: number;
    }) => Promise<RoleDoc | null>;
    updateRole: (input: {
        id: string;
        name?: string;
        description?: string;
        category?: RoleCategory;
        permissions?: string[];
        active?: boolean;
        sortOrder?: number;
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
    listPromoBanners: () => Promise<{
        banners: PromoBanner[];
    }>;
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
    }) => Promise<{
        downloadUrl: string;
        path: string;
    } | null>;
};
export declare function createAdminRepository(functions: Functions): AdminRepository;
//# sourceMappingURL=admin.d.ts.map