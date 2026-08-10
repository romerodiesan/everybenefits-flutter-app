import {
  watchRolePermissions as watchRolePermissionsShared,
  loadPermissionsForRoles as loadPermissionsForRolesShared,
} from "@pulse/firebase-web";
import { getFirebaseDb } from "@/lib/firebase/client";

/** Live permissions for a role slug (defaults until / while Firestore loads). */
export function watchRolePermissions(
  roleId: string,
  onChange: (permissions: string[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return watchRolePermissionsShared(
    getFirebaseDb(),
    roleId,
    onChange,
    onError,
  );
}

/** One-shot permissions for role slugs (used by instructor pickers). */
export async function loadPermissionsForRoles(
  roleIds: readonly string[],
): Promise<Record<string, string[]>> {
  return loadPermissionsForRolesShared(getFirebaseDb(), roleIds);
}
