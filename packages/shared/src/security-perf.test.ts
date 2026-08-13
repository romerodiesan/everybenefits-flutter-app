import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "./csp";
import { dollarsToCents } from "./payments/money";
import { hasPermission, isPermissionKey } from "./permissions";
import { wouldCreateRelationshipCycle } from "./payments/types";

describe("permissions", () => {
  it("recognizes catalog keys", () => {
    expect(isPermissionKey("forums.participate")).toBe(true);
    expect(isPermissionKey("not.a.real.permission")).toBe(false);
  });

  it("hasPermission checks set membership", () => {
    const perms = ["forums.participate", "admin.access"];
    expect(hasPermission(perms, "forums.participate")).toBe(true);
    expect(hasPermission(perms, "platform.manage")).toBe(false);
  });
});

describe("CSP", () => {
  it("builds production CSP without unsafe-eval by default", () => {
    const csp = buildContentSecurityPolicy({ includeEmulators: false });
    expect(csp).toContain("default-src");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("https://*.firebaseio.com");
  });

  it("includes emulator hosts when requested", () => {
    const csp = buildContentSecurityPolicy({ includeEmulators: true });
    expect(csp).toContain("http://localhost:8080");
    expect(csp).toContain("http://127.0.0.1:9099");
  });
});

describe("payments money + relationship cycles", () => {
  it("converts dollars to integer cents", () => {
    expect(dollarsToCents(18.5)).toBe(1850);
  });

  it("detects relationship cycles via upline walk", () => {
    const edges = [
      {
        uplineParticipantId: "a",
        downlineParticipantId: "b",
        active: true,
      },
      {
        uplineParticipantId: "b",
        downlineParticipantId: "c",
        active: true,
      },
    ];
    // Adding c → a would cycle (a already ancestors through b→c? walk from a: a has no upline → false)
    expect(wouldCreateRelationshipCycle("c", "a", edges)).toBe(true);
    expect(wouldCreateRelationshipCycle("a", "d", edges)).toBe(false);
  });
});
