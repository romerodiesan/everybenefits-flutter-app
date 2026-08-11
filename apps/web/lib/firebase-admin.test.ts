import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFirestore } from "firebase-admin/firestore";

/**
 * After Fast Refresh, the module cache for `firestore` resets to null while the
 * Admin SDK keeps the same Firestore singleton (settings already applied).
 * `adminDb()` must not throw on that second entry.
 */
describe("adminDb", () => {
  beforeEach(() => {
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    process.env.FIREBASE_PROJECT_ID = "every-insurance";
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("survives settings already applied (HMR / concurrent init)", async () => {
    const { getAdminApp } = await import("./firebase-admin");
    const primed = getFirestore(getAdminApp());
    primed.settings({ ignoreUndefinedProperties: true });

    vi.resetModules();

    const { adminDb } = await import("./firebase-admin");
    expect(() => adminDb()).not.toThrow();
    expect(adminDb()).toBe(primed);
  });
});
