export type UserRole = "guest" | "student" | "agent" | "instructor" | "manager" | "admin";
export declare const ALL_ROLES: readonly UserRole[];
/** Roles that may read/write forums (non-anonymous). */
export declare const FORUM_ROLES: readonly UserRole[];
/** Default agent group membership. */
export declare const DEFAULT_GROUP_ROLES: readonly UserRole[];
/** Who may create non-support chat groups. */
export declare const GROUP_CREATOR_ROLES: readonly UserRole[];
export declare function parseRole(value: unknown): UserRole;
/** Instructors, managers, and admins can author courses in Studio. */
export declare function canAuthorCourses(role: UserRole): role is "instructor" | "manager" | "admin";
/** Same authors who write courses can draft learning paths. */
export declare function canAuthorPaths(role: UserRole): role is "instructor" | "manager" | "admin";
/** Only admins publish and approve courses and paths. */
export declare function canManageCourses(role: UserRole): role is "admin";
/** Authors keep editing until an admin publishes; admins always may. */
export declare function canEditCourse(course: {
    createdBy: string;
    status: string;
}, viewer: {
    uid: string;
    role: UserRole;
}): boolean;
/** Authors keep editing their path until an admin publishes; admins always may. */
export declare function canEditPath(path: {
    createdBy: string;
    status: string;
}, viewer: {
    uid: string;
    role: UserRole;
}): boolean;
export declare function belongsInDefaultAgentGroup(role: UserRole): boolean;
/** Agent tools (quote calculators, etc.) — not for students or guests. */
export declare function canAccessTools(role: UserRole): boolean;
export declare function canCreateChatGroups(role: UserRole): boolean;
/** Who may enable persistent auto-join-by-role on a group. */
export declare function canConfigureGroupAutoJoin(role: UserRole): role is "manager" | "admin";
/** Roles that can be targeted for group seed / auto-join (not guest). */
export declare const GROUP_SEED_ROLES: readonly ["student", "agent", "instructor", "manager", "admin"];
export declare function canParticipateInForums(role: UserRole, isAnonymous: boolean): boolean;
export declare function canParticipateInChats(role: UserRole, isAnonymous: boolean): boolean;
/** Support inbox is for members who need help — not staff (admin/manager). */
export declare function canAccessSupport(role: UserRole, isAnonymous: boolean): boolean;
/** Pulse Admin portal — managers and admins only. */
export declare function canAccessAdmin(role: UserRole): role is "manager" | "admin";
/** Platform-wide ops (role changes, deactivate any user, root org). */
export declare function canManagePlatform(role: UserRole): role is "admin";
