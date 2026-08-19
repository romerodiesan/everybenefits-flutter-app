import { describe, expect, it } from "vitest";
import {
  ALL_PERMISSION_KEYS,
  BUILTIN_ROLE_IDS,
  DEFAULT_ROLE_PERMISSIONS,
  builtinRoleSeedDocs,
  builtinRoleSeedVersion,
  mergeBuiltinRolePermissions,
} from "./permissions";

describe("builtin role seed", () => {
  it("ships a document for every built-in role", () => {
    const docs = builtinRoleSeedDocs();
    expect(docs.map((doc) => doc.id)).toEqual([...BUILTIN_ROLE_IDS]);
    for (const doc of docs) {
      expect(doc.builtIn).toBe(true);
      expect(doc.active).toBe(true);
      expect(doc.permissions).toEqual([...DEFAULT_ROLE_PERMISSIONS[doc.id]]);
    }
  });

  it("gives system the full permission catalog", () => {
    const system = builtinRoleSeedDocs().find((doc) => doc.id === "system");
    expect(system?.permissions).toEqual([...ALL_PERMISSION_KEYS]);
  });

  it("adds newly shipped keys without dropping extras", () => {
    expect(
      mergeBuiltinRolePermissions("agent", ["forums.participate", "custom.extra"]),
    ).toEqual(
      expect.arrayContaining([
        "forums.participate",
        "custom.extra",
        "apps.web.access",
        "chats.participate",
      ]),
    );
  });

  it("fills empty built-in docs from product defaults", () => {
    expect(mergeBuiltinRolePermissions("student", [])).toEqual([
      ...DEFAULT_ROLE_PERMISSIONS.student,
    ]);
    expect(mergeBuiltinRolePermissions("student", null)).toEqual([
      ...DEFAULT_ROLE_PERMISSIONS.student,
    ]);
  });

  it("resets system to the live catalog", () => {
    expect(mergeBuiltinRolePermissions("system", ["admin.access"])).toEqual([
      ...ALL_PERMISSION_KEYS,
    ]);
  });

  it("keeps a stable version fingerprint for the same catalog", () => {
    expect(builtinRoleSeedVersion()).toBe(builtinRoleSeedVersion());
    expect(builtinRoleSeedVersion()).toMatch(/^[0-9a-f]{8}$/);
  });
});
