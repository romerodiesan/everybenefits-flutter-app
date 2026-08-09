import { describe, expect, it } from "vitest";
import { FunctionsUnavailableError } from "./call-function";
import { mapCallableError } from "./callable-errors";

const labels = {
  generic: "generic",
  auth: "auth",
  permissionDenied: "denied",
  dmBlocked: "dm-blocked",
  unavailable: "unavailable",
};

describe("mapCallableError", () => {
  it("maps direct-messages-disabled from Error.message", () => {
    expect(
      mapCallableError(new Error("direct-messages-disabled"), labels),
    ).toBe("dm-blocked");
  });

  it("maps Firebase failed-precondition shaped errors", () => {
    expect(
      mapCallableError(
        {
          code: "functions/failed-precondition",
          message: "direct-messages-disabled",
        },
        labels,
      ),
    ).toBe("dm-blocked");
  });

  it("maps permission-denied and unauthenticated codes", () => {
    expect(
      mapCallableError({ code: "functions/permission-denied", message: "" }, labels),
    ).toBe("denied");
    expect(
      mapCallableError({ code: "unauthenticated", message: "unauthenticated" }, labels),
    ).toBe("auth");
  });

  it("maps FunctionsUnavailableError to unavailable / generic", () => {
    expect(
      mapCallableError(new FunctionsUnavailableError("createDm"), labels),
    ).toBe("unavailable");
    expect(
      mapCallableError(new FunctionsUnavailableError("createDm"), {
        ...labels,
        unavailable: undefined,
      }),
    ).toBe("generic");
  });

  it("surfaces allowlisted client-thrown messages", () => {
    expect(
      mapCallableError(new Error("Group name required"), labels),
    ).toBe("Group name required");
    expect(
      mapCallableError(new Error("Not allowed to create groups"), labels),
    ).toBe("Not allowed to create groups");
  });

  it("does not surface arbitrary server messages", () => {
    expect(
      mapCallableError(new Error("internal stack dump xyz"), labels),
    ).toBe("generic");
    expect(
      mapCallableError(
        { code: "functions/internal", message: "secret detail" },
        labels,
      ),
    ).toBe("generic");
  });

  it("falls back to generic", () => {
    expect(mapCallableError(null, labels)).toBe("generic");
    expect(mapCallableError({}, labels)).toBe("generic");
  });
});
