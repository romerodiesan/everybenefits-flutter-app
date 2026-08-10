import type { UserProfile, AccountStatus, UserRole } from "@/lib/types";

/**
 * Studio only needs identity + role for shell gates. Never persist phone/NPN/
 * address/email in sessionStorage.
 */
const CACHE_KEY = "studio_profile_v2";
const LEGACY_CACHE_KEY = "studio_profile_v1";

type CachedProfile = {
  uid: string;
  displayName: string | null;
  photoUrl: string | null;
  role: string;
  isAnonymous: boolean;
  profileCompleted: boolean;
  accountStatus?: AccountStatus;
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
  };
}

function revive(cached: CachedProfile): UserProfile {
  return {
    uid: cached.uid,
    email: null,
    displayName: cached.displayName,
    photoUrl: cached.photoUrl,
    role: cached.role as UserRole,
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
    createdAt: null,
    updatedAt: null,
    accountStatus: cached.accountStatus,
    deletionScheduledAt: null,
  };
}

export function readCachedProfile(uid: string): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    sessionStorage.removeItem(LEGACY_CACHE_KEY);
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
    sessionStorage.removeItem(LEGACY_CACHE_KEY);
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(toCached(profile)));
  } catch {
    // ignore
  }
}

export function clearCachedProfile() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(LEGACY_CACHE_KEY);
  } catch {
    // ignore
  }
}

export function isUserRole(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isAccountStatus(value: unknown): value is AccountStatus {
  return (
    value === "active" ||
    value === "deactivated" ||
    value === "pendingDeletion"
  );
}
