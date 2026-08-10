import { watchRolePermissions as watchRolePermissionsShared } from "@pulse/firebase-web";
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
