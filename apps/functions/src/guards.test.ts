import { describe, expect, it } from "vitest";
import { ALL_PERMISSION_KEYS } from "@pulse/shared";
import { actorHasPermission } from "./guards";
import { resolveRolePermissions } from "./permissions";

describe("resolveRolePermissions", () => {
  it("gives system the full catalog", () => {
    expect(resolveRolePermissions("system", null)).toEqual([...ALL_PERMISSION_KEYS]);
  });

  it("uses seeded role docs when active", () => {
    const permissions = resolveRolePermissions("agent", {
      exists: true,
      active: true,
      permissions: ["forums.participate", "not.a.key"],
    });
    expect(permissions).toEqual(
      expect.arrayContaining([
        "forums.participate",
        "chats.participate",
        "chats.groups.default.join",
      ]),
    );
    expect(permissions).not.toContain("not.a.key");
  });

  it("falls back to builtin defaults when the role doc is missing", () => {
    const perms = resolveRolePermissions("student", null);
    expect(perms).toContain("forums.participate");
    expect(perms).toContain("chats.groups.default.join");
    expect(perms).not.toContain("admin.access");
  });

  it("denies custom roles when the role doc is missing", () => {
    expect(resolveRolePermissions("custom-broker", null)).toEqual([]);
  });

  it("maps legacy teacher to instructor defaults", () => {
    const perms = resolveRolePermissions("teacher", { exists: false });
    expect(perms).toContain("courses.author");
  });
});

describe("actorHasPermission", () => {
  it("treats platform.manage as a mega-grant", () => {
    expect(actorHasPermission(["platform.manage"], "admin.users.read")).toBe(
      true,
    );
  });

  it("matches any of several keys", () => {
    expect(
      actorHasPermission(["admin.orgs.read"], ["admin.orgs.write", "admin.orgs.read"]),
    ).toBe(true);
    expect(actorHasPermission(["forums.participate"], "forums.moderate")).toBe(
      false,
    );
  });
});
