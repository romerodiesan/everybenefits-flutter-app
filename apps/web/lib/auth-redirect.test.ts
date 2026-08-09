import { describe, expect, it } from "vitest";
import {
  nextQuery,
  postLoginPath,
  readLoginNext,
  resolvePostAuthDestination,
} from "@/lib/auth-redirect";
import type { UserProfile } from "@/lib/types";

describe("readLoginNext", () => {
  it("returns null when missing so callers default to /home", () => {
    expect(readLoginNext(null)).toBeNull();
    expect(readLoginNext(undefined)).toBeNull();
    expect(readLoginNext("")).toBeNull();
  });

  it("accepts safe internal paths", () => {
    expect(readLoginNext("/home")).toBe("/home");
    expect(readLoginNext("/chats/abc?x=1")).toBe("/chats/abc?x=1");
  });

  it("rejects open redirects", () => {
    expect(readLoginNext("//evil.com")).toBeNull();
    expect(readLoginNext("https://evil.com")).toBeNull();
  });
});

describe("postLoginPath", () => {
  it("falls back to /home", () => {
    expect(postLoginPath(null)).toBe("/home");
    expect(postLoginPath("/academy")).toBe("/academy");
  });
});

describe("nextQuery", () => {
  it("encodes only safe next paths", () => {
    expect(nextQuery(null)).toBe("");
    expect(nextQuery("/chats/1")).toBe("?next=%2Fchats%2F1");
    expect(nextQuery("//evil")).toBe("");
  });
});

describe("resolvePostAuthDestination", () => {
  const baseProfile = {
    uid: "u1",
    email: "a@example.com",
    displayName: "Ada Lovelace",
    photoUrl: null,
    role: "agent",
    isAnonymous: false,
    profileCompleted: true,
    phoneCountryCode: "+1",
    phoneNumber: "555",
    npn: "12345678",
    address: "1 Main",
    addressStreet: "1 Main",
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
  } as UserProfile;

  it("routes Google users without password to set-password with next", () => {
    expect(
      resolvePostAuthDestination({
        user: { isAnonymous: false, email: "a@example.com" },
        profile: baseProfile,
        next: "/chats/1",
        hasPassword: false,
      }),
    ).toEqual({
      kind: "set-password",
      path: "/set-password?next=%2Fchats%2F1",
    });
  });

  it("routes incomplete profiles to complete-profile with next", () => {
    expect(
      resolvePostAuthDestination({
        user: { isAnonymous: false, email: "a@example.com" },
        profile: { ...baseProfile, profileCompleted: false, npn: null },
        next: "/home",
        hasPassword: true,
      }),
    ).toEqual({
      kind: "complete-profile",
      path: "/complete-profile?next=%2Fhome",
    });
  });

  it("routes finished users to home/deep link", () => {
    expect(
      resolvePostAuthDestination({
        user: { isAnonymous: false, email: "a@example.com" },
        profile: baseProfile,
        next: "/academy",
        hasPassword: true,
      }),
    ).toEqual({ kind: "home", path: "/academy" });
  });
});
