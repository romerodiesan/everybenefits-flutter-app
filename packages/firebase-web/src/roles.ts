import { doc, getDoc, onSnapshot, type Firestore } from "firebase/firestore";
import {
  getDefaultPermissionsForRole,
  isBuiltinRoleId,
  resolvePermissionsFromRoleDoc,
} from "@pulse/shared";

function normalizeRoleId(roleId: string): string {
  return roleId === "teacher" ? "instructor" : roleId.trim() || "student";
}

function optimisticPermissions(roleId: string): string[] {
  // Custom roles stay fail-closed until the Firestore doc lands.
  if (!isBuiltinRoleId(roleId)) return [];
  return [...getDefaultPermissionsForRole(roleId)];
}

/** Live permissions for a role slug (defaults until / while Firestore loads). */
export function watchRolePermissions(
  db: Firestore,
  roleId: string,
  onChange: (permissions: string[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const normalized = normalizeRoleId(roleId);
  onChange(optimisticPermissions(normalized));
  return onSnapshot(
    doc(db, "roles", normalized),
    (snap) => {
      onChange(resolvePermissionsFromRoleDoc(normalized, snap.data()));
    },
    (error) => {
      onChange(optimisticPermissions(normalized));
      onError?.(error);
    },
  );
}

/** One-shot permissions for role slugs (used by instructor pickers). */
export async function loadPermissionsForRoles(
  db: Firestore,
  roleIds: readonly string[],
): Promise<Record<string, string[]>> {
  const unique = [...new Set(roleIds.map(normalizeRoleId))];
  const entries = await Promise.all(
    unique.map(async (roleId) => {
      try {
        const snap = await getDoc(doc(db, "roles", roleId));
        return [
          roleId,
          resolvePermissionsFromRoleDoc(roleId, snap.data()),
        ] as const;
      } catch {
        return [roleId, [...getDefaultPermissionsForRole(roleId)]] as const;
      }
    }),
  );
  return Object.fromEntries(
    entries.map(([roleId, perms]) => [roleId, [...perms]]),
  );
}
