import { describe, expect, it } from "vitest";
import {
  BUILTIN_ROLE_IDS,
  DEFAULT_ROLE_PERMISSIONS,
  getDefaultPermissionsForRole,
} from "@pulse/shared";
import { actorHasPermission } from "./guards";
import { resolveRolePermissions } from "./permissions";

/**
 * Callable → catalog key contract (Fase 1). Keep in sync with requireActor
 * calls. Org tree reads stay on admin.orgs.read so agency_owner cannot dump
 * /orgNodes via a guessed client query — those paths are Functions-only.
 */
const CALLABLE_PERMISSION_KEYS = {
  listAdminUsers: "admin.users.read",
  createAdminUser: "admin.users.create",
  updateAdminUser: "admin.users.update",
  deactivateAdminUser: "admin.users.deactivate",
  adminInsights: "platform.stats.read",
  listOrgSubtree: "admin.orgs.read",
  createOrgNode: "admin.orgs.write",
  listRoles: "admin.roles.read",
  upsertPromoBanner: "platform.manage",
  upsertPoll: "platform.manage",
  listPayments: "apps.payments.access",
  importStatement: "commission.upload",
  upsertCompensationPlan: "commission.manageRules",
  castForumVote: "forums.participate",
} as const;

describe("permission matrix: shared defaults vs Functions fallback", () => {
  it("matches DEFAULT_ROLE_PERMISSIONS for every builtin when the role doc is missing", () => {
    for (const role of BUILTIN_ROLE_IDS) {
      expect(resolveRolePermissions(role, null).slice().sort()).toEqual(
        [...getDefaultPermissionsForRole(role)].sort(),
      );
      expect(resolveRolePermissions(role, { exists: false }).slice().sort()).toEqual(
        [...DEFAULT_ROLE_PERMISSIONS[role]].sort(),
      );
    }
  });

  it("fails closed for unknown custom roles without a seeded doc", () => {
    expect(resolveRolePermissions("custom-broker", null)).toEqual([]);
  });

  it("uses a seeded role document over builtin defaults", () => {
    expect(
      resolveRolePermissions("agent", {
        exists: true,
        active: true,
        permissions: ["forums.participate"],
      }),
    ).toEqual(["forums.participate"]);
  });
});

describe("permission matrix: org / payments / forums gates", () => {
  it("agency_owner can read their tree key but not admin.orgs.read", () => {
    const perms = resolveRolePermissions("agency_owner", null);
    expect(actorHasPermission(perms, "org.tree.read")).toBe(true);
    expect(actorHasPermission(perms, CALLABLE_PERMISSION_KEYS.listOrgSubtree)).toBe(
      false,
    );
    expect(actorHasPermission(perms, CALLABLE_PERMISSION_KEYS.createOrgNode)).toBe(
      false,
    );
  });

  it("admin can run org and payments callables", () => {
    const perms = resolveRolePermissions("admin", null);
    expect(actorHasPermission(perms, CALLABLE_PERMISSION_KEYS.listOrgSubtree)).toBe(
      true,
    );
    expect(actorHasPermission(perms, CALLABLE_PERMISSION_KEYS.listPayments)).toBe(
      true,
    );
    expect(actorHasPermission(perms, CALLABLE_PERMISSION_KEYS.importStatement)).toBe(
      true,
    );
  });

  it("agent can participate in forums but not moderate or manage banners", () => {
    const perms = resolveRolePermissions("agent", null);
    expect(actorHasPermission(perms, CALLABLE_PERMISSION_KEYS.castForumVote)).toBe(
      true,
    );
    expect(actorHasPermission(perms, "forums.moderate")).toBe(false);
    expect(actorHasPermission(perms, CALLABLE_PERMISSION_KEYS.upsertPromoBanner)).toBe(
      false,
    );
  });

  it("student cannot access payments or org admin callables", () => {
    const perms = resolveRolePermissions("student", null);
    expect(actorHasPermission(perms, CALLABLE_PERMISSION_KEYS.listPayments)).toBe(
      false,
    );
    expect(actorHasPermission(perms, CALLABLE_PERMISSION_KEYS.listOrgSubtree)).toBe(
      false,
    );
  });
});
