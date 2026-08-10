import {
  can,
  getDefaultPermissionsForRole,
  hasPermission,
  resolvePermissionSet,
} from "./permissions";

export type UserRole =
  | "guest"
  | "student"
  | "agent"
  | "instructor"
  | "manager"
  | "admin"
  | "system";

/** Built-in role slugs used across clients and Firestore rules. */
export const ALL_ROLES: readonly UserRole[] = [
  "guest",
  "student",
  "agent",
  "instructor",
  "manager",
  "admin",
  "system",
] as const;

/** Product system roles (editable only by `system` in Admin). */
export const SYSTEM_ROLE_IDS = [
  "system",
  "admin",
  "manager",
  "agent",
  "student",
] as const satisfies readonly UserRole[];

/** Legacy built-ins kept for compatibility. */
export const LEGACY_ROLE_IDS = [
  "guest",
  "instructor",
] as const satisfies readonly UserRole[];

/**
 * Role IDs that may be targeted for group seed / auto-join pickers.
 * This is a data filter (which roles can be selected), not an authz check.
 */
export const GROUP_SEED_ROLES = [
  "student",
  "agent",
  "instructor",
  "manager",
  "admin",
] as const satisfies readonly UserRole[];

export type RoleOrPermissions =
  | UserRole
  | string
  | string[]
  | readonly string[]
  | null
  | undefined;

export function parseRole(value: unknown): UserRole {
  if (typeof value !== "string") return "guest";
  // Legacy every-benefits-us used "teacher" for course authors.
  if (value === "teacher") return "instructor";
  if ((ALL_ROLES as readonly string[]).includes(value)) {
    return value as UserRole;
  }
  // Custom role slugs are stored as-is on users; treat as opaque string
  // typed through UserRole for backwards compatibility with call sites.
  if (value.trim() && value !== "guest") {
    return value as UserRole;
  }
  return "guest";
}

/** Mega-role above admin — DB-only assignment and role-doc edits. */
export function isSystemRole(role: UserRole | string) {
  return role === "system";
}

export function canAuthorCourses(roleOrPermissions: RoleOrPermissions) {
  return can(roleOrPermissions, "courses.author");
}

export function canAuthorPaths(roleOrPermissions: RoleOrPermissions) {
  return can(roleOrPermissions, "paths.author");
}

export function canManageCourses(roleOrPermissions: RoleOrPermissions) {
  return (
    can(roleOrPermissions, "courses.manage") ||
    can(roleOrPermissions, "courses.publish")
  );
}

export function canEditCourse(
  course: { createdBy: string; status: string },
  viewer: { uid: string; role: UserRole; permissions?: readonly string[] },
) {
  const perms = viewer.permissions ?? getDefaultPermissionsForRole(viewer.role);
  if (hasPermission(perms, "courses.edit.any")) return true;
  if (!hasPermission(perms, "courses.author")) return false;
  return course.createdBy === viewer.uid && course.status !== "published";
}

export function canEditPath(
  path: { createdBy: string; status: string },
  viewer: { uid: string; role: UserRole; permissions?: readonly string[] },
) {
  const perms = viewer.permissions ?? getDefaultPermissionsForRole(viewer.role);
  if (hasPermission(perms, "paths.edit.any")) return true;
  if (!hasPermission(perms, "paths.author")) return false;
  return path.createdBy === viewer.uid && path.status !== "published";
}

export function belongsInDefaultAgentGroup(
  roleOrPermissions: RoleOrPermissions,
) {
  return can(roleOrPermissions, "chats.groups.default.join");
}

export function canAccessTools(roleOrPermissions: RoleOrPermissions) {
  return can(roleOrPermissions, "tools.access");
}

export function canCreateChatGroups(roleOrPermissions: RoleOrPermissions) {
  return can(roleOrPermissions, "chats.groups.create");
}

export function canConfigureGroupAutoJoin(
  roleOrPermissions: RoleOrPermissions,
) {
  return can(roleOrPermissions, "chats.groups.autojoin.configure");
}

export function canParticipateInForums(
  roleOrPermissions: RoleOrPermissions,
  isAnonymous: boolean,
) {
  if (isAnonymous) return false;
  const perms = resolvePermissionSet(roleOrPermissions);
  if (
    typeof roleOrPermissions === "string" &&
    (roleOrPermissions === "guest" || !roleOrPermissions)
  ) {
    return false;
  }
  return hasPermission(perms, "forums.participate");
}

export function canParticipateInChats(
  roleOrPermissions: RoleOrPermissions,
  isAnonymous: boolean,
) {
  if (isAnonymous) return false;
  return can(roleOrPermissions, "chats.participate");
}

export function canAccessSupport(
  roleOrPermissions: RoleOrPermissions,
  isAnonymous: boolean,
) {
  if (isAnonymous) return false;
  return can(roleOrPermissions, "support.access");
}

export function canAccessAdmin(roleOrPermissions: RoleOrPermissions) {
  return (
    can(roleOrPermissions, "admin.access") ||
    can(roleOrPermissions, "apps.admin.access")
  );
}

export function canManagePlatform(roleOrPermissions: RoleOrPermissions) {
  return can(roleOrPermissions, "platform.manage");
}

export function canModerateForums(roleOrPermissions: RoleOrPermissions) {
  return can(roleOrPermissions, "forums.moderate");
}

export function canAccessStudio(roleOrPermissions: RoleOrPermissions) {
  return (
    can(roleOrPermissions, "apps.studio.access") ||
    can(roleOrPermissions, "courses.author")
  );
}
