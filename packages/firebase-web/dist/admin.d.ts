import { type Functions } from "firebase/functions";
import { type OrgNode, type OrgNodeType, type RoleCategory, type RoleDoc, type UserRole } from "@pulse/shared";
export declare class FunctionsUnavailableError extends Error {
    constructor(message?: string);
}
export declare function callCloudFunction<T>(functions: Functions, name: string, data?: unknown): Promise<T>;
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
    }) => Promise<OrgNode | null>;
    updateOrgNode: (input: {
        id: string;
        name?: string;
        active?: boolean;
        managerUids?: string[];
    }) => Promise<OrgNode | null>;
    assignUserToOrgNode: (uid: string, orgNodeId: string | null) => Promise<void>;
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
};
export declare function createAdminRepository(functions: Functions): AdminRepository;
//# sourceMappingURL=admin.d.ts.map