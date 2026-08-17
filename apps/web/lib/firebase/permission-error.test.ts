import { describe, expect, it } from "vitest";
import { isFirebasePermissionDenied } from "./permission-error";

describe("isFirebasePermissionDenied", () => {
  it("matches Firestore and Functions codes", () => {
    expect(
      isFirebasePermissionDenied({ code: "permission-denied", message: "" }),
    ).toBe(true);
    expect(
      isFirebasePermissionDenied({
        code: "functions/permission-denied",
        message: "",
      }),
    ).toBe(true);
  });

  it("matches Realtime Database permission_denied errors", () => {
    expect(
      isFirebasePermissionDenied({
        code: "PERMISSION_DENIED",
        message:
          "permission_denied at /typing/agents-default: Client doesn't have permission to access the desired data.",
      }),
    ).toBe(true);
    expect(
      isFirebasePermissionDenied(
        new Error("permission_denied at /typing/agents-default"),
      ),
    ).toBe(true);
  });

  it("rejects unrelated errors", () => {
    expect(isFirebasePermissionDenied(new Error("unavailable"))).toBe(false);
    expect(isFirebasePermissionDenied(null)).toBe(false);
  });
});
