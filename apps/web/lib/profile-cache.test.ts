import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearCachedProfile,
  hasTrustedShellCache,
  isTrustedShellCacheEntry,
  writeCachedProfile,
} from "@/lib/profile-cache";
import type { UserProfile } from "@/lib/types";

const CACHE_KEY = "pulse_profile_v5";

function installSessionStorage() {
  const store = new Map<string, string>();
  const api = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, "sessionStorage", {
    value: api,
    configurable: true,
  });
  Object.defineProperty(globalThis, "window", {
    value: { sessionStorage: api },
    configurable: true,
  });
}

function baseProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: "user-1",
    email: "a@example.com",
    displayName: "Ada Lovelace",
    photoUrl: null,
    role: "agent",
    isAnonymous: false,
    profileCompleted: true,
    phoneCountryCode: "+1",
    phoneNumber: "5551234567",
    npn: "12345678",
    address: "1 Main St, Austin, TX 78701",
    addressStreet: "1 Main St",
    addressApt: null,
    addressCity: "Austin",
    addressState: "TX",
    addressZip: "78701",
    agency: "Every",
    createdAt: null,
    updatedAt: null,
    accountStatus: "active",
    approvalStatus: "approved",
    deletionScheduledAt: null,
    productTourVersion: 1,
    ...overrides,
  };
}

beforeEach(() => {
  installSessionStorage();
});

afterEach(() => {
  clearCachedProfile();
});

describe("isTrustedShellCacheEntry", () => {
  it("rejects anonymous and incomplete profiles", () => {
    expect(
      isTrustedShellCacheEntry({
        uid: "u",
        email: null,
        displayName: null,
        photoUrl: null,
        role: "guest",
        isAnonymous: true,
        profileCompleted: false,
        needsCompletion: false,
        agency: null,
      }),
    ).toBe(false);

    expect(
      isTrustedShellCacheEntry({
        uid: "u",
        email: "a@example.com",
        displayName: "Ada",
        photoUrl: null,
        role: "agent",
        isAnonymous: false,
        profileCompleted: false,
        needsCompletion: true,
        agency: null,
      }),
    ).toBe(false);
  });

  it("rejects pending approval", () => {
    expect(
      isTrustedShellCacheEntry({
        uid: "u",
        email: "a@example.com",
        displayName: "Ada",
        photoUrl: null,
        role: "agent",
        isAnonymous: false,
        profileCompleted: true,
        needsCompletion: false,
        agency: "Every",
        approvalStatus: "pending",
      }),
    ).toBe(false);
  });

  it("accepts an approved completed profile", () => {
    expect(
      isTrustedShellCacheEntry({
        uid: "u",
        email: "a@example.com",
        displayName: "Ada",
        photoUrl: null,
        role: "agent",
        isAnonymous: false,
        profileCompleted: true,
        needsCompletion: false,
        agency: "Every",
        approvalStatus: "approved",
      }),
    ).toBe(true);
  });
});

describe("hasTrustedShellCache", () => {
  it("returns false when cache is missing or uid mismatches", () => {
    expect(hasTrustedShellCache("user-1")).toBe(false);
    writeCachedProfile(baseProfile());
    expect(hasTrustedShellCache("other")).toBe(false);
  });

  it("returns true for a trusted cached shell profile", () => {
    writeCachedProfile(baseProfile());
    expect(hasTrustedShellCache("user-1")).toBe(true);
  });

  it("returns false for pending approval in sessionStorage", () => {
    writeCachedProfile(baseProfile({ approvalStatus: "pending" }));
    expect(hasTrustedShellCache("user-1")).toBe(false);
  });

  it("returns false for invalid role payloads", () => {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        uid: "user-1",
        email: "a@example.com",
        displayName: "Ada",
        photoUrl: null,
        role: "not-a-role",
        isAnonymous: false,
        profileCompleted: true,
        needsCompletion: false,
        agency: "Every",
        approvalStatus: "approved",
      }),
    );
    expect(hasTrustedShellCache("user-1")).toBe(false);
  });
});
