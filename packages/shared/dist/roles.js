"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GROUP_SEED_ROLES = exports.GROUP_CREATOR_ROLES = exports.DEFAULT_GROUP_ROLES = exports.FORUM_ROLES = exports.ALL_ROLES = void 0;
exports.parseRole = parseRole;
exports.canAuthorCourses = canAuthorCourses;
exports.canAuthorPaths = canAuthorPaths;
exports.canManageCourses = canManageCourses;
exports.canEditCourse = canEditCourse;
exports.canEditPath = canEditPath;
exports.belongsInDefaultAgentGroup = belongsInDefaultAgentGroup;
exports.canAccessTools = canAccessTools;
exports.canCreateChatGroups = canCreateChatGroups;
exports.canConfigureGroupAutoJoin = canConfigureGroupAutoJoin;
exports.canParticipateInForums = canParticipateInForums;
exports.canParticipateInChats = canParticipateInChats;
exports.canAccessSupport = canAccessSupport;
exports.canAccessAdmin = canAccessAdmin;
exports.canManagePlatform = canManagePlatform;
exports.ALL_ROLES = [
    "guest",
    "student",
    "agent",
    "instructor",
    "manager",
    "admin",
];
/** Roles that may read/write forums (non-anonymous). */
exports.FORUM_ROLES = [
    "student",
    "agent",
    "instructor",
    "manager",
    "admin",
];
/** Default agent group membership. */
exports.DEFAULT_GROUP_ROLES = [
    "agent",
    "instructor",
    "manager",
    "admin",
];
/** Who may create non-support chat groups. */
exports.GROUP_CREATOR_ROLES = [
    "instructor",
    "manager",
    "admin",
];
function parseRole(value) {
    if (typeof value !== "string")
        return "guest";
    // Legacy every-benefits-us used "teacher" for course authors.
    if (value === "teacher")
        return "instructor";
    if (exports.ALL_ROLES.includes(value)) {
        return value;
    }
    return "guest";
}
/** Instructors, managers, and admins can author courses in Studio. */
function canAuthorCourses(role) {
    return (role === "instructor" || role === "manager" || role === "admin");
}
/** Same authors who write courses can draft learning paths. */
function canAuthorPaths(role) {
    return canAuthorCourses(role);
}
/** Only admins publish and approve courses and paths. */
function canManageCourses(role) {
    return role === "admin";
}
/** Authors keep editing until an admin publishes; admins always may. */
function canEditCourse(course, viewer) {
    if (viewer.role === "admin")
        return true;
    if (!canAuthorCourses(viewer.role))
        return false;
    return course.createdBy === viewer.uid && course.status !== "published";
}
/** Authors keep editing their path until an admin publishes; admins always may. */
function canEditPath(path, viewer) {
    if (viewer.role === "admin")
        return true;
    if (!canAuthorPaths(viewer.role))
        return false;
    return path.createdBy === viewer.uid && path.status !== "published";
}
function belongsInDefaultAgentGroup(role) {
    return exports.DEFAULT_GROUP_ROLES.includes(role);
}
/** Agent tools (quote calculators, etc.) — not for students or guests. */
function canAccessTools(role) {
    return belongsInDefaultAgentGroup(role);
}
function canCreateChatGroups(role) {
    return exports.GROUP_CREATOR_ROLES.includes(role);
}
/** Who may enable persistent auto-join-by-role on a group. */
function canConfigureGroupAutoJoin(role) {
    return role === "admin" || role === "manager";
}
/** Roles that can be targeted for group seed / auto-join (not guest). */
exports.GROUP_SEED_ROLES = [
    "student",
    "agent",
    "instructor",
    "manager",
    "admin",
];
function canParticipateInForums(role, isAnonymous) {
    if (isAnonymous || role === "guest")
        return false;
    return exports.FORUM_ROLES.includes(role);
}
function canParticipateInChats(role, isAnonymous) {
    return canParticipateInForums(role, isAnonymous);
}
/** Support inbox is for members who need help — not staff (admin/manager). */
function canAccessSupport(role, isAnonymous) {
    if (isAnonymous || role === "guest")
        return false;
    if (role === "admin" || role === "manager")
        return false;
    return (role === "student" || role === "agent" || role === "instructor");
}
/** Pulse Admin portal — managers and admins only. */
function canAccessAdmin(role) {
    return role === "manager" || role === "admin";
}
/** Platform-wide ops (role changes, deactivate any user, root org). */
function canManagePlatform(role) {
    return role === "admin";
}
