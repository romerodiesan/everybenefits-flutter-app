import { appearanceAccentFrom, parseRole, resolveBadgeBackgroundColor, type UserRole } from "@pulse/shared";
import { toDate } from "./dates";

export type MappedUserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  role: UserRole;
  isAnonymous: boolean;
  profileCompleted: boolean;
  productTourVersion?: number;
  phoneCountryCode: string | null;
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

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function mapUserProfile(
  id: string,
  data: Record<string, unknown>,
): MappedUserProfile {
  const accountStatus =
    data.accountStatus === "deactivated" ||
    data.accountStatus === "pendingDeletion"
      ? data.accountStatus
      : data.accountStatus === "active"
        ? "active"
        : undefined;
  const approvalStatus =
    data.approvalStatus === "pending" ||
    data.approvalStatus === "approved" ||
    data.approvalStatus === "rejected"
      ? data.approvalStatus
      : undefined;

  return {
    uid: id,
    email: asString(data.email),
    displayName: asString(data.displayName),
    photoUrl: asString(data.photoUrl),
    role: parseRole(data.role),
    isAnonymous: data.isAnonymous === true,
    profileCompleted: data.profileCompleted !== false,
    productTourVersion:
      typeof data.productTourVersion === "number"
        ? data.productTourVersion
        : undefined,
    phoneCountryCode: asString(data.phoneCountryCode),
    phoneNumber: asString(data.phoneNumber),
    phoneVerified:
      typeof data.phoneVerified === "boolean" ? data.phoneVerified : undefined,
    npn: asString(data.npn),
    address: asString(data.address),
    addressStreet: asString(data.addressStreet),
    addressApt: asString(data.addressApt),
    addressCity: asString(data.addressCity),
    addressState: asString(data.addressState),
    addressZip: asString(data.addressZip),
    agency: asString(data.agency),
    bio: asString(data.bio),
    orgNodeId: asString(data.orgNodeId),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    accountStatus,
    approvalStatus,
    profileBadge: parsePublicBadge(data.profileBadge, data.appearance),
  };
}

function parsePublicBadge(
  raw: unknown,
  appearance?: unknown,
): MappedUserProfile["profileBadge"] {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (data.enabled === false) return null;
  const text = typeof data.text === "string" ? data.text.trim() : "";
  if (!text) return null;
  const accent = appearanceAccentFrom(appearance);
  const backgroundColor =
    typeof data.backgroundColor === "string" && data.backgroundColor.startsWith("#")
      ? data.backgroundColor
      : resolveBadgeBackgroundColor(
          typeof data.color === "string" ? data.color : "accent",
          accent,
        );
  return {
    text: text.slice(0, 40),
    icon: typeof data.icon === "string" ? data.icon : "badge",
    backgroundColor,
  };
}
