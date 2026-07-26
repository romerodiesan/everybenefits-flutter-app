import type { UserProfile, AccountStatus, UserRole } from "@/lib/types";

const CACHE_KEY = "pulse_profile_v1";

type CachedProfile = Omit<
  UserProfile,
  "createdAt" | "updatedAt" | "deletionScheduledAt"
> & {
  createdAt: string | null;
  updatedAt: string | null;
  deletionScheduledAt: string | null;
};

function revive(cached: CachedProfile): UserProfile {
  return {
    ...cached,
    createdAt: cached.createdAt ? new Date(cached.createdAt) : null,
    updatedAt: cached.updatedAt ? new Date(cached.updatedAt) : null,
    deletionScheduledAt: cached.deletionScheduledAt
      ? new Date(cached.deletionScheduledAt)
      : null,
  };
}

function serialize(profile: UserProfile): CachedProfile {
  return {
    ...profile,
    createdAt: profile.createdAt?.toISOString() ?? null,
    updatedAt: profile.updatedAt?.toISOString() ?? null,
    deletionScheduledAt: profile.deletionScheduledAt?.toISOString() ?? null,
  };
}

export function readCachedProfile(uid: string): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedProfile;
    if (parsed.uid !== uid) return null;
    return revive(parsed);
  } catch {
    return null;
  }
}

export function writeCachedProfile(profile: UserProfile) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(serialize(profile)));
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

/** Narrow type guards kept local so cache stays resilient to role drift. */
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
