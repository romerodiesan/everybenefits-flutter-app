import type { UserProfile, AccountStatus, UserRole } from "@/lib/types";

/** v2 drops phone/NPN/address from sessionStorage (XSS / shared-device blast radius). */
const CACHE_KEY = "pulse_profile_v2";
const LEGACY_CACHE_KEY = "pulse_profile_v1";

type CachedProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  role: UserRole;
  isAnonymous: boolean;
  profileCompleted: boolean;
  agency: string | null;
  accountStatus?: AccountStatus;
};

function toCached(profile: UserProfile): CachedProfile {
  return {
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName,
    photoUrl: profile.photoUrl,
    role: profile.role,
    isAnonymous: profile.isAnonymous,
    profileCompleted: profile.profileCompleted,
    agency: profile.agency,
    accountStatus: profile.accountStatus,
  };
}

/** Expand a slim cache entry into a UserProfile with PII fields left empty. */
function revive(cached: CachedProfile): UserProfile {
  return {
    uid: cached.uid,
    email: cached.email,
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
    agency: cached.agency,
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

export function isAccountStatus(value: unknown): value is AccountStatus {
  return (
    value === "active" ||
    value === "deactivated" ||
    value === "pendingDeletion"
  );
}
