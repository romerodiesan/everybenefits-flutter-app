import { HttpsError } from "firebase-functions/v2/https";
import {
  ALL_PERMISSION_KEYS,
  filterValidPermissions,
  getDefaultPermissionsForRole,
  hasPermission,
  parseRole,
  SYSTEM_MEGA_ROLE_ID,
} from "@pulse/shared";
import { db } from "./init";

export async function loadPermissionsForRole(
  roleId: string,
): Promise<string[]> {
  const normalized =
    roleId === "teacher" ? "instructor" : roleId.trim() || "guest";
  if (normalized === SYSTEM_MEGA_ROLE_ID) {
    return [...ALL_PERMISSION_KEYS];
  }

  const snap = await db.doc(`roles/${normalized}`).get();
  if (snap.exists && snap.data()?.active !== false) {
    const raw = Array.isArray(snap.data()?.permissions)
      ? snap.data()!.permissions.map(String)
      : [];
    const filtered = filterValidPermissions(raw);
    if (filtered.length > 0 || snap.exists) {
      return filtered;
    }
  }

  return [...getDefaultPermissionsForRole(normalized)];
}

export async function loadPermissionsForUid(uid: string): Promise<{
  role: string;
  permissions: string[];
}> {
  const snap = await db.doc(`users/${uid}`).get();
  const role = String(snap.data()?.role ?? "guest");
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
  if (typeof value !== "string" || !value.trim()) return "guest";
  if (value === "teacher") return "instructor";
  return value.trim();
}

export { parseRole, hasPermission };
