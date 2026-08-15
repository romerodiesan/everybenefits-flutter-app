import { type UserRole } from "@pulse/shared";
export type MappedUserProfile = {
    uid: string;
    email: string | null;
    displayName: string | null;
    username?: string | null;
    photoUrl: string | null;
    role: UserRole;
    isAnonymous: boolean;
    profileCompleted: boolean;
    productTourVersion?: number;
    phoneCountryCode: string | null;
    phoneCountryIso2?: string | null;
    phoneNumber: string | null;
    phoneVerified?: boolean;
    npn: string | null;
    address: string | null;
    addressStreet: string | null;
    addressApt: string | null;
    addressCity: string | null;
    addressState: string | null;
    addressZip: string | null;
    agency: string | null;
    bio?: string | null;
    orgNodeId?: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    accountStatus?: "active" | "deactivated" | "pendingDeletion";
    approvalStatus?: "pending" | "approved" | "rejected";
    profileBadge?: {
        text: string;
        icon: string;
        backgroundColor: string;
    } | null;
};
export declare function mapUserProfile(id: string, data: Record<string, unknown>): MappedUserProfile;
//# sourceMappingURL=users.d.ts.map