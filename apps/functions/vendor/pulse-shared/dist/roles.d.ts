export type UserRole = "guest" | "student" | "agent" | "instructor" | "manager" | "admin" | "system";
/** Built-in role slugs used across clients and Firestore rules. */
export declare const ALL_ROLES: readonly UserRole[];
/** Product system roles (editable only by `system` in Admin). */
export declare const SYSTEM_ROLE_IDS: readonly ["system", "admin", "manager", "agent", "student"];
/** Legacy built-ins kept for compatibility. */
export declare const LEGACY_ROLE_IDS: readonly ["guest", "instructor"];
/**
 * Role IDs that may be targeted for group seed / auto-join pickers.
 * This is a data filter (which roles can be selected), not an authz check.
 */
export declare const GROUP_SEED_ROLES: readonly ["student", "agent", "instructor", "manager", "admin"];
export type RoleOrPermissions = UserRole | string | string[] | readonly string[] | null | undefined;
export declare function parseRole(value: unknown): UserRole;
/** Mega-role above admin — DB-only assignment and role-doc edits. */
export declare function isSystemRole(role: UserRole | string): role is "system";
export declare function canAuthorCourses(roleOrPermissions: RoleOrPermissions): boolean;
export declare function canAuthorPaths(roleOrPermissions: RoleOrPermissions): boolean;
export declare function canManageCourses(roleOrPermissions: RoleOrPermissions): boolean;
export declare function canEditCourse(course: {
    createdBy: string;
    status: string;
}, viewer: {
    uid: string;
    role: UserRole;
    permissions?: readonly string[];
}): boolean;
export declare function canEditPath(path: {
    createdBy: string;
    status: string;
}, viewer: {
    uid: string;
    role: UserRole;
    permissions?: readonly string[];
}): boolean;
export declare function belongsInDefaultAgentGroup(roleOrPermissions: RoleOrPermissions): boolean;
export declare function canAccessTools(roleOrPermissions: RoleOrPermissions): boolean;
export declare function canCreateChatGroups(roleOrPermissions: RoleOrPermissions): boolean;
export declare function canConfigureGroupAutoJoin(roleOrPermissions: RoleOrPermissions): boolean;
export declare function canParticipateInForums(roleOrPermissions: RoleOrPermissions, isAnonymous: boolean): boolean;
export declare function canParticipateInChats(roleOrPermissions: RoleOrPermissions, isAnonymous: boolean): boolean;
export declare function canAccessSupport(roleOrPermissions: RoleOrPermissions, isAnonymous: boolean): boolean;
export declare function canAccessAdmin(roleOrPermissions: RoleOrPermissions): boolean;
export declare function canManagePlatform(roleOrPermissions: RoleOrPermissions): boolean;
export declare function canModerateForums(roleOrPermissions: RoleOrPermissions): boolean;
export declare function canAccessStudio(roleOrPermissions: RoleOrPermissions): boolean;
//# sourceMappingURL=roles.d.ts.map