import { afterEach, describe, expect, it } from "vitest";
import { buildCallableCors, resolveEnforceAppCheck } from "./callable-cors";

describe("buildCallableCors", () => {
  afterEach(() => {
    delete process.env.FUNCTIONS_ALLOW_LOCALHOST;
    delete process.env.FUNCTIONS_ALLOWED_ORIGINS;
  });

  it("opens CORS fully on emulator", () => {
    expect(buildCallableCors({ emulator: true })).toBe(true);
  });

  it("excludes localhost in production by default", () => {
    const cors = buildCallableCors({
      emulator: false,
      allowLocalhost: false,
      extraOrigins: "",
    });
    expect(Array.isArray(cors)).toBe(true);
    if (!Array.isArray(cors)) return;
    expect(cors.some((o) => o.includes("localhost"))).toBe(false);
    expect(cors).toContain("https://pulse.everybenefits.us");
    expect(cors).toContain("https://payments.everybenefits.us");
  });

  it("includes localhost when explicitly allowed", () => {
    const cors = buildCallableCors({
      emulator: false,
      allowLocalhost: true,
    });
    expect(Array.isArray(cors)).toBe(true);
    if (!Array.isArray(cors)) return;
    expect(cors).toContain("http://localhost:3000");
  });

  it("merges extra staging origins", () => {
    const cors = buildCallableCors({
      emulator: false,
      allowLocalhost: false,
      extraOrigins: "https://staging.example.com, https://other.example.com",
    });
    expect(Array.isArray(cors)).toBe(true);
    if (!Array.isArray(cors)) return;
    expect(cors).toContain("https://staging.example.com");
    expect(cors).toContain("https://other.example.com");
  });
});

describe("resolveEnforceAppCheck", () => {
  it("never enforces on emulator", () => {
    expect(
      resolveEnforceAppCheck({ emulator: true, enforceEnv: "true" }),
    ).toBe(false);
  });

  it("enforces only when env is true", () => {
    expect(
      resolveEnforceAppCheck({ emulator: false, enforceEnv: "true" }),
    ).toBe(true);
    expect(
      resolveEnforceAppCheck({ emulator: false, enforceEnv: "false" }),
    ).toBe(false);
    expect(
      resolveEnforceAppCheck({ emulator: false, enforceEnv: undefined }),
    ).toBe(false);
  });
});
