import type { UserProfile, AccountStatus, UserRole } from "@/lib/types";
import { needsProfileCompletion } from "@/lib/roles";

/** v3 drops PII from sessionStorage; stores needsCompletion so slim revive
 * cannot false-trigger licensed-role field checks on reload. */
const CACHE_KEY = "pulse_profile_v3";
const LEGACY_CACHE_KEYS = ["pulse_profile_v2", "pulse_profile_v1"];

type CachedProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  role: UserRole;
  isAnonymous: boolean;
  profileCompleted: boolean;
  /** Precomputed at write time from the full Firestore profile. */
  needsCompletion: boolean;
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
    needsCompletion: needsProfileCompletion(profile),
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
    // Honor precomputed flag — never infer from null NPN/address.
    profileCompleted:
      cached.needsCompletion === true ? false : cached.profileCompleted !== false,
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

function clearLegacyCaches() {
  for (const key of LEGACY_CACHE_KEYS) {
    sessionStorage.removeItem(key);
  }
}

export function readCachedProfile(uid: string): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    clearLegacyCaches();
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
    clearLegacyCaches();
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(toCached(profile)));
  } catch {
    // ignore
  }
}

export function clearCachedProfile() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CACHE_KEY);
    clearLegacyCaches();
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
