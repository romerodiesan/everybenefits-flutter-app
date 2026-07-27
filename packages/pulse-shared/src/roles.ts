export type UserRole =
  | "guest"
  | "student"
  | "agent"
  | "instructor"
  | "manager"
  | "admin";

export const ALL_ROLES: readonly UserRole[] = [
  "guest",
  "student",
  "agent",
  "instructor",
  "manager",
  "admin",
] as const;

/** Roles that may read/write forums (non-anonymous). */
export const FORUM_ROLES: readonly UserRole[] = [
  "student",
  "agent",
  "instructor",
  "manager",
  "admin",
] as const;

/** Default agent group membership. */
export const DEFAULT_GROUP_ROLES: readonly UserRole[] = [
  "agent",
  "instructor",
  "manager",
  "admin",
] as const;

/** Who may create non-support chat groups. */
export const GROUP_CREATOR_ROLES: readonly UserRole[] = [
  "instructor",
  "manager",
  "admin",
] as const;

export function parseRole(value: unknown): UserRole {
  if (typeof value === "string" && (ALL_ROLES as readonly string[]).includes(value)) {
    return value as UserRole;
  }
  return "guest";
}

/** Instructors, managers, and admins can author courses in Studio. */
export function canAuthorCourses(role: UserRole) {
  return (
    role === "instructor" || role === "manager" || role === "admin"
  );
}

/** Same authors who write courses can draft learning paths. */
export function canAuthorPaths(role: UserRole) {
  return canAuthorCourses(role);
}

/** Only admins publish and approve courses and paths. */
export function canManageCourses(role: UserRole) {
  return role === "admin";
}

/** Authors keep editing until an admin publishes; admins always may. */
export function canEditCourse(
  course: { createdBy: string; status: string },
  viewer: { uid: string; role: UserRole },
) {
  if (viewer.role === "admin") return true;
  if (!canAuthorCourses(viewer.role)) return false;
  return course.createdBy === viewer.uid && course.status !== "published";
}

/** Authors keep editing their path until an admin publishes; admins always may. */
export function canEditPath(
  path: { createdBy: string; status: string },
  viewer: { uid: string; role: UserRole },
) {
  if (viewer.role === "admin") return true;
  if (!canAuthorPaths(viewer.role)) return false;
  return path.createdBy === viewer.uid && path.status !== "published";
}

export function belongsInDefaultAgentGroup(role: UserRole) {
  return (DEFAULT_GROUP_ROLES as readonly string[]).includes(role);
}

export function canCreateChatGroups(role: UserRole) {
  return (GROUP_CREATOR_ROLES as readonly string[]).includes(role);
}

export function canParticipateInForums(role: UserRole, isAnonymous: boolean) {
  if (isAnonymous || role === "guest") return false;
  return (FORUM_ROLES as readonly string[]).includes(role);
}

export function canParticipateInChats(role: UserRole, isAnonymous: boolean) {
  return canParticipateInForums(role, isAnonymous);
}
