import { describe, expect, it } from "vitest";
import { isSafeInternalPath, safeInternalPath } from "./paths";
import {
  buildLogoutCascadeUrl,
  isAllowedLogoutNext,
  isAllowedSsoReturnUrl,
  PULSE_ACCOUNT_PATH,
  pulseAccountUrl,
  pulseHubLoginUrl,
} from "./urls";
import { parseSsoErrorCode, ssoMessageKeyForCode } from "./errors";
import { rateLimitDocId } from "./server";

describe("isSafeInternalPath", () => {
  it("accepts normal relative paths", () => {
    expect(isSafeInternalPath("/home")).toBe(true);
    expect(isSafeInternalPath("/auth/sso")).toBe(true);
    expect(isSafeInternalPath("/a/b?x=1")).toBe(true);
    expect(
      isSafeInternalPath(
        "/auth/bridge?return=http://localhost:3001/en/auth/sso?next=%2F",
      ),
    ).toBe(true);
  });

  it("rejects open-redirect patterns", () => {
    expect(isSafeInternalPath("//evil.com")).toBe(false);
    expect(isSafeInternalPath("/\\evil")).toBe(false);
    expect(isSafeInternalPath("https://evil.com")).toBe(false);
    expect(isSafeInternalPath("/foo://bar")).toBe(false);
    expect(isSafeInternalPath("")).toBe(false);
    expect(isSafeInternalPath(null)).toBe(false);
  });

  it("safeInternalPath falls back", () => {
    expect(safeInternalPath("//evil", "/home")).toBe("/home");
    expect(safeInternalPath("/ok", "/home")).toBe("/ok");
  });
});

describe("isAllowedSsoReturnUrl", () => {
  it("allows pulse/studio/admin consume URLs", () => {
    expect(
      isAllowedSsoReturnUrl("http://localhost:3000/en/auth/sso?next=%2Fhome"),
    ).toBe(true);
    expect(
      isAllowedSsoReturnUrl("http://localhost:3001/es/auth/sso?next=%2F"),
    ).toBe(true);
    expect(
      isAllowedSsoReturnUrl("http://localhost:3002/en/auth/sso?next=%2F"),
    ).toBe(true);
  });

  it("rejects foreign origins and non-sso paths", () => {
    expect(isAllowedSsoReturnUrl("https://evil.com/en/auth/sso")).toBe(false);
    expect(isAllowedSsoReturnUrl("http://localhost:3000/en/home")).toBe(false);
  });
});

describe("isAllowedLogoutNext", () => {
  it("allows safe relative and family origins", () => {
    expect(isAllowedLogoutNext("/login")).toBe(true);
    expect(isAllowedLogoutNext("http://localhost:3002/en/login")).toBe(true);
    expect(isAllowedLogoutNext("//evil.com")).toBe(false);
  });
});

describe("auth hub helpers", () => {
  it("builds Pulse hub login that resumes bridge", () => {
    const consume = "http://localhost:3001/en/auth/sso?next=%2F";
    const url = pulseHubLoginUrl("en", consume);
    expect(url.startsWith("http://localhost:3000/en/login?next=")).toBe(true);
    const next = decodeURIComponent(new URL(url).searchParams.get("next")!);
    expect(next.startsWith("/auth/bridge?return=")).toBe(true);
    const resumed = new URLSearchParams(next.slice(next.indexOf("?") + 1)).get(
      "return",
    );
    expect(resumed).toContain("localhost:3001");
    expect(resumed).toContain("/auth/sso");
  });

  it("builds account URL on Pulse", () => {
    expect(pulseAccountUrl("es")).toBe(`http://localhost:3000/es${PULSE_ACCOUNT_PATH}`);
    expect(pulseAccountUrl("en", "/account?section=security")).toContain(
      "section=security",
    );
  });

  it("cascades logout through every sibling", () => {
    const finalUrl = "http://localhost:3001/en/login";
    const url = buildLogoutCascadeUrl("studio", "en", finalUrl);
    expect(url).toContain("/auth/logout?next=");
    // otherApps(studio)=[pulse,admin,payments]; reverse-wrap → outermost is pulse.
    expect(url.startsWith("http://localhost:3000/en/auth/logout?next=")).toBe(
      true,
    );
    let decoded = url;
    for (let i = 0; i < 8; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    expect(decoded).toContain("localhost:3002/en/auth/logout");
    expect(decoded).toContain("localhost:3004/en/auth/logout");
    expect(decoded).toContain(finalUrl);
  });
});

describe("error mapping", () => {
  it("parses known codes", () => {
    expect(parseSsoErrorCode("rate-limited")).toBe("rate-limited");
    expect(parseSsoErrorCode("nope")).toBe("unknown");
  });

  it("maps to message keys", () => {
    expect(ssoMessageKeyForCode("missing-token")).toBe("ssoMissingToken");
    expect(ssoMessageKeyForCode("rate-limited")).toBe("ssoRateLimited");
    expect(ssoMessageKeyForCode("appcheck-invalid")).toBe("ssoAppCheckFailed");
    expect(ssoMessageKeyForCode("account-disabled")).toBe("ssoAccountDisabled");
    expect(ssoMessageKeyForCode("invalid-code")).toBe("ssoFailed");
  });
});

describe("rateLimitDocId", () => {
  it("is stable within a minute for the same identity", () => {
    const a = rateLimitDocId("exchange_ip", "1.2.3.4");
    const b = rateLimitDocId("exchange_ip", "1.2.3.4");
    expect(a).toBe(b);
    expect(a).toContain("exchange_ip_");
  });
});
