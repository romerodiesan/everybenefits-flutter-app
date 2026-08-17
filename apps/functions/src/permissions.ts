import { HttpsError } from "firebase-functions/v2/https";
import {
  ALL_PERMISSION_KEYS,
  filterValidPermissions,
  getDefaultPermissionsForRole,
  hasPermission,
  isBuiltinRoleId,
  parseRole,
  SYSTEM_MEGA_ROLE_ID,
} from "@pulse/shared";
import { db } from "./init";

/**
 * Resolve permissions from a `roles/{id}` snapshot.
 * Seeded docs win. Missing docs: builtins → DEFAULT_ROLE_PERMISSIONS;
 * custom slugs → [] (fail closed). Matches Firestore `hasPermission` once
 * roles are seeded (required in every environment).
 */
export function resolveRolePermissions(
  roleId: string,
  roleDoc: { exists: boolean; active?: unknown; permissions?: unknown } | null,
): string[] {
  const normalized =
    roleId === "teacher" ? "instructor" : roleId.trim() || "student";
  if (normalized === SYSTEM_MEGA_ROLE_ID) {
    return [...ALL_PERMISSION_KEYS];
  }
  if (roleDoc?.exists && roleDoc.active !== false) {
    const raw = Array.isArray(roleDoc.permissions)
      ? roleDoc.permissions.map(String)
      : [];
    return filterValidPermissions(raw);
  }
  if (isBuiltinRoleId(normalized)) {
    return [...getDefaultPermissionsForRole(normalized)];
  }
  return [];
}

export async function loadPermissionsForRole(
  roleId: string,
): Promise<string[]> {
  const normalized =
    roleId === "teacher" ? "instructor" : roleId.trim() || "student";
  if (normalized === SYSTEM_MEGA_ROLE_ID) {
    return [...ALL_PERMISSION_KEYS];
  }

  const snap = await db.doc(`roles/${normalized}`).get();
  return resolveRolePermissions(normalized, {
    exists: snap.exists,
    active: snap.data()?.active,
    permissions: snap.data()?.permissions,
  });
}

export async function loadPermissionsForUid(uid: string): Promise<{
  role: string;
  permissions: string[];
}> {
  const snap = await db.doc(`users/${uid}`).get();
  const role = String(snap.data()?.role ?? "student");
  const permissions = await loadPermissionsForRole(role);
  return { role, permissions };
}

export async function requirePermission(
  uid: string,
  key: string | string[],
): Promise<{ role: string; permissions: string[] }> {
  const loaded = await loadPermissionsForUid(uid);
  const keys = Array.isArray(key) ? key : [key];
  const ok = keys.some((k) => hasPermission(loaded.permissions, k));
  if (!ok) {
    throw new HttpsError("permission-denied", "Missing required permission.");
  }
  return loaded;
}

export async function callerHasPermission(
  uid: string,
  key: string | string[],
): Promise<boolean> {
  const { permissions } = await loadPermissionsForUid(uid);
  const keys = Array.isArray(key) ? key : [key];
  return keys.some((k) => hasPermission(permissions, k));
}

/** Normalize stored role for stats / chat helpers without collapsing custom slugs. */
export function parseStoredRoleSlug(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "student";
  if (value === "teacher") return "instructor";
  return value.trim();
}

export { parseRole, hasPermission };
