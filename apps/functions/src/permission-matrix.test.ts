import { describe, expect, it } from "vitest";
import {
  BUILTIN_ROLE_IDS,
  DEFAULT_ROLE_PERMISSIONS,
  canAssignRoleByAuthority,
  getDefaultPermissionsForRole,
  getRequiredBuiltinChatPermissions,
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
  upsertPromoBanner: "admin.banners.write",
  listPromoBanners: "admin.banners.read",
  upsertPoll: "admin.polls.write",
  listPolls: "admin.polls.read",
  listPayments: "apps.payments.access",
  importStatement: "commission.upload",
  upsertCompensationPlan: "commission.manageRules",
  castForumVote: "forums.participate",
  manageChatGroups: "chats.groups.manage",
  moderateChatMessages: "chats.messages.moderate",
  accessAllChatContacts: "chats.contacts.all",
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
    expect(getRequiredBuiltinChatPermissions("custom-broker")).toEqual([]);
  });

  it("uses a seeded role document plus product-level chat invariants", () => {
    const permissions = resolveRolePermissions("agent", {
      exists: true,
      active: true,
      permissions: ["forums.participate"],
    });
    expect(permissions).toEqual(
      expect.arrayContaining([
        "forums.participate",
        "chats.participate",
        "chats.groups.default.join",
      ]),
    );
  });

  it("keeps new chat invariants when builtin role docs predate them", () => {
    for (const role of BUILTIN_ROLE_IDS) {
      const permissions = resolveRolePermissions(role, {
        exists: true,
        active: true,
        permissions: [],
      });
      expect(permissions).toContain("chats.participate");
      expect(permissions).toContain("chats.groups.default.join");
    }

    const admin = resolveRolePermissions("admin", {
      exists: true,
      active: true,
      permissions: ["chats.participate"],
    });
    expect(actorHasPermission(admin, CALLABLE_PERMISSION_KEYS.manageChatGroups)).toBe(
      true,
    );
    expect(
      actorHasPermission(admin, CALLABLE_PERMISSION_KEYS.moderateChatMessages),
    ).toBe(true);
    expect(
      actorHasPermission(admin, CALLABLE_PERMISSION_KEYS.accessAllChatContacts),
    ).toBe(true);

    const system = resolveRolePermissions("system", {
      exists: true,
      active: true,
      permissions: [],
    });
    expect(
      actorHasPermission(system, CALLABLE_PERMISSION_KEYS.accessAllChatContacts),
    ).toBe(true);

    for (const role of ["manager", "instructor"]) {
      const permissions = resolveRolePermissions(role, {
        exists: true,
        active: true,
        permissions: ["chats.participate"],
      });
      expect(
        actorHasPermission(permissions, CALLABLE_PERMISSION_KEYS.accessAllChatContacts),
      ).toBe(true);
      expect(
        actorHasPermission(permissions, CALLABLE_PERMISSION_KEYS.manageChatGroups),
      ).toBe(false);
    }
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

  it("admin can run org, payments, and campaign callables", () => {
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
    expect(actorHasPermission(perms, CALLABLE_PERMISSION_KEYS.listPolls)).toBe(true);
    expect(actorHasPermission(perms, CALLABLE_PERMISSION_KEYS.upsertPoll)).toBe(true);
    expect(actorHasPermission(perms, CALLABLE_PERMISSION_KEYS.listPromoBanners)).toBe(
      true,
    );
  });

  it("manager can manage campaigns without platform.manage", () => {
    const perms = resolveRolePermissions("manager", null);
    expect(actorHasPermission(perms, "platform.manage")).toBe(false);
    expect(actorHasPermission(perms, CALLABLE_PERMISSION_KEYS.listPolls)).toBe(true);
    expect(actorHasPermission(perms, CALLABLE_PERMISSION_KEYS.upsertPromoBanner)).toBe(
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
    expect(actorHasPermission(perms, CALLABLE_PERMISSION_KEYS.listPolls)).toBe(false);
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

describe("role authority ceilings", () => {
  it("allows admin to assign a lower role within its permission set", () => {
    expect(
      canAssignRoleByAuthority({
        actorRole: "admin",
        actorPermissions: DEFAULT_ROLE_PERMISSIONS.admin,
        targetRole: "student",
        targetPermissions: DEFAULT_ROLE_PERMISSIONS.student,
      }),
    ).toBe(true);
  });

  it("blocks self-promotion and equal-or-higher role assignment", () => {
    expect(
      canAssignRoleByAuthority({
        actorRole: "manager",
        actorPermissions: DEFAULT_ROLE_PERMISSIONS.manager,
        targetRole: "manager",
        targetPermissions: DEFAULT_ROLE_PERMISSIONS.manager,
      }),
    ).toBe(false);
    expect(
      canAssignRoleByAuthority({
        actorRole: "manager",
        actorPermissions: DEFAULT_ROLE_PERMISSIONS.manager,
        targetRole: "admin",
        targetPermissions: DEFAULT_ROLE_PERMISSIONS.admin,
      }),
    ).toBe(false);
  });

  it("blocks custom roles containing permissions the actor does not own", () => {
    expect(
      canAssignRoleByAuthority({
        actorRole: "admin",
        actorPermissions: DEFAULT_ROLE_PERMISSIONS.admin,
        targetRole: "custom-power-role",
        targetPermissions: ["platform.roles.system.edit"],
      }),
    ).toBe(false);
  });
});
