import { type Functions } from "firebase/functions";
import { type OrgNode, type OrgNodeType, type UserRole } from "@pulse/shared";
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
export declare function mapAdminUserRow(entry: Record<string, unknown>): AdminUserRow;
export declare function mapOrgNode(entry: Record<string, unknown>): OrgNode;
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
    assignUserToOrgNode: (uid: string, orgNodeId: string | null) => Promise<void>;
    setUserRole: (uid: string, role: UserRole) => Promise<void>;
};
export declare function createAdminRepository(functions: Functions): AdminRepository;
