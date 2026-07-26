export type UserRole =
  | "guest"
  | "student"
  | "agent"
  | "instructor"
  | "manager"
  | "admin";

export function parseRole(value: unknown): UserRole {
  const roles: UserRole[] = [
    "guest",
    "student",
    "agent",
    "instructor",
    "manager",
    "admin",
  ];
  if (typeof value === "string" && roles.includes(value as UserRole)) {
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
  return (
    role === "agent" ||
    role === "instructor" ||
    role === "manager" ||
    role === "admin"
  );
}
