import type { UserProfile, AccountStatus, UserRole } from "@/lib/types";

const CACHE_KEY = "admin_profile_v1";

type CachedProfile = {
  uid: string;
  displayName: string | null;
  photoUrl: string | null;
  role: UserRole;
  isAnonymous: boolean;
  profileCompleted: boolean;
  accountStatus?: AccountStatus;
  orgNodeId?: string | null;
};

function toCached(profile: UserProfile): CachedProfile {
  return {
    uid: profile.uid,
    displayName: profile.displayName,
    photoUrl: profile.photoUrl,
    role: profile.role,
    isAnonymous: profile.isAnonymous,
    profileCompleted: profile.profileCompleted,
    accountStatus: profile.accountStatus,
    orgNodeId: profile.orgNodeId ?? null,
  };
}

function revive(cached: CachedProfile): UserProfile {
  return {
    uid: cached.uid,
    email: null,
    displayName: cached.displayName,
    photoUrl: cached.photoUrl,
    role: cached.role,
    isAnonymous: cached.isAnonymous,
    profileCompleted: cached.profileCompleted,
    phoneCountryCode: null,
    phoneNumber: null,
    npn: null,
    address: null,
    addressStreet: null,
    addressApt: null,
    addressCity: null,
    addressState: null,
    addressZip: null,
    agency: null,
    orgNodeId: cached.orgNodeId ?? null,
    createdAt: null,
    updatedAt: null,
    accountStatus: cached.accountStatus,
    deletionScheduledAt: null,
  };
}

export function readCachedProfile(uid: string): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedProfile;
    if (parsed.uid !== uid || !isUserRole(parsed.role)) return null;
    return revive(parsed);
  } catch {
    return null;
  }
}

export function writeCachedProfile(profile: UserProfile) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(toCached(profile)));
  } catch {
    // ignore
  }
}

export function clearCachedProfile() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

export function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" &&
    [
      "guest",
      "student",
      "agent",
      "instructor",
      "manager",
      "admin",
    ].includes(value)
  );
}
