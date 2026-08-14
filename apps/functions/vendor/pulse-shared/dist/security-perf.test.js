"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const csp_1 = require("./csp");
const money_1 = require("./payments/money");
const permissions_1 = require("./permissions");
const types_1 = require("./payments/types");
(0, vitest_1.describe)("permissions", () => {
    (0, vitest_1.it)("recognizes catalog keys", () => {
        (0, vitest_1.expect)((0, permissions_1.isPermissionKey)("forums.participate")).toBe(true);
        (0, vitest_1.expect)((0, permissions_1.isPermissionKey)("not.a.real.permission")).toBe(false);
    });
    (0, vitest_1.it)("hasPermission checks set membership", () => {
        const perms = ["forums.participate", "admin.access"];
        (0, vitest_1.expect)((0, permissions_1.hasPermission)(perms, "forums.participate")).toBe(true);
        (0, vitest_1.expect)((0, permissions_1.hasPermission)(perms, "platform.manage")).toBe(false);
    });
});
(0, vitest_1.describe)("CSP", () => {
    (0, vitest_1.it)("builds production CSP without unsafe-eval by default", () => {
        const csp = (0, csp_1.buildContentSecurityPolicy)({ includeEmulators: false });
        (0, vitest_1.expect)(csp).toContain("default-src");
        (0, vitest_1.expect)(csp).not.toContain("'unsafe-eval'");
        (0, vitest_1.expect)(csp).toContain("https://*.firebaseio.com");
    });
    (0, vitest_1.it)("includes emulator hosts when requested", () => {
        const csp = (0, csp_1.buildContentSecurityPolicy)({ includeEmulators: true });
        (0, vitest_1.expect)(csp).toContain("http://localhost:8080");
        (0, vitest_1.expect)(csp).toContain("http://127.0.0.1:9099");
    });
});
(0, vitest_1.describe)("payments money + relationship cycles", () => {
    (0, vitest_1.it)("converts dollars to integer cents", () => {
        (0, vitest_1.expect)((0, money_1.dollarsToCents)(18.5)).toBe(1850);
    });
    (0, vitest_1.it)("detects relationship cycles via upline walk", () => {
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
        (0, vitest_1.expect)((0, types_1.wouldCreateRelationshipCycle)("c", "a", edges)).toBe(true);
        (0, vitest_1.expect)((0, types_1.wouldCreateRelationshipCycle)("a", "d", edges)).toBe(false);
    });
});
