import type { UserRole, OrgNodeType, OrgDepth } from "@pulse/shared";

export type {
  UserRole,
  OrgNodeType,
  OrgDepth,
  OrgNode,
  ApprovalStatus,
} from "@pulse/shared";

export {
  ORG_NODE_TYPES,
  ORG_TYPE_DEPTH,
  ORG_DEPTH_TYPE,
  DEFAULT_ORG_ROOT_NAME,
  parseOrgNodeType,
  depthForType,
  typeForDepth,
  isValidChildType,
  ALL_ROLES,
} from "@pulse/shared";

export const DEFAULT_AGENCY = "Every Benefits";

export type AccountStatus = "active" | "deactivated" | "pendingDeletion";

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  role: UserRole;
  isAnonymous: boolean;
  profileCompleted: boolean;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  npn: string | null;
  address: string | null;
  addressStreet: string | null;
  addressApt: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  agency: string | null;
  orgNodeId?: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  accountStatus?: AccountStatus;
  deletionScheduledAt?: Date | null;
  approvalStatus?: import("@pulse/shared").ApprovalStatus;
  appearance?: {
    theme: "system" | "light" | "dark";
    accent: string;
    locale?: "inherit" | "en" | "es";
  } | null;
};

export type AdminOrgNode = {
  id: string;
  name: string;
  type: OrgNodeType;
  depth: OrgDepth;
  parentId: string | null;
  path: string[];
  managerUids: string[];
  active: boolean;
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
