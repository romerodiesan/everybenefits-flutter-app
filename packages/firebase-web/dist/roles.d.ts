import { type Firestore } from "firebase/firestore";
/** Live permissions for a role slug (defaults until / while Firestore loads). */
export declare function watchRolePermissions(db: Firestore, roleId: string, onChange: (permissions: string[]) => void, onError?: (error: Error) => void): () => void;
/** One-shot permissions for role slugs (used by instructor pickers). */
export declare function loadPermissionsForRoles(db: Firestore, roleIds: readonly string[]): Promise<Record<string, string[]>>;
//# sourceMappingURL=roles.d.ts.map