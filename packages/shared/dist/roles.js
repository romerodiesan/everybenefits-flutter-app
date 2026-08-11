"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GROUP_SEED_ROLES = exports.LEGACY_ROLE_IDS = exports.SYSTEM_ROLE_IDS = exports.ALL_ROLES = void 0;
exports.parseRole = parseRole;
exports.isSystemRole = isSystemRole;
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
exports.canAccessAdmin = canAccessAdmin;
exports.canAccessPayments = canAccessPayments;
exports.canManagePlatform = canManagePlatform;
exports.canModerateForums = canModerateForums;
exports.canAccessStudio = canAccessStudio;
const permissions_1 = require("./permissions");
/** Built-in role slugs used across clients and Firestore rules. */
exports.ALL_ROLES = [
    "guest",
    "student",
    "agent",
    "instructor",
    "manager",
    "admin",
    "system",
];
/** Product system roles (editable only by `system` in Admin). */
exports.SYSTEM_ROLE_IDS = [
    "system",
    "admin",
    "manager",
    "agent",
    "student",
];
/** Legacy built-ins kept for compatibility. */
exports.LEGACY_ROLE_IDS = [
    "guest",
    "instructor",
];
/**
 * Role IDs that may be targeted for group seed / auto-join pickers.
 * This is a data filter (which roles can be selected), not an authz check.
 */
exports.GROUP_SEED_ROLES = [
    "student",
    "agent",
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
    // Custom role slugs are stored as-is on users; treat as opaque string
    // typed through UserRole for backwards compatibility with call sites.
    if (value.trim() && value !== "guest") {
        return value;
    }
    return "guest";
}
/** Mega-role above admin — DB-only assignment and role-doc edits. */
function isSystemRole(role) {
    return role === "system";
}
function canAuthorCourses(roleOrPermissions) {
    return (0, permissions_1.can)(roleOrPermissions, "courses.author");
}
function canAuthorPaths(roleOrPermissions) {
    return (0, permissions_1.can)(roleOrPermissions, "paths.author");
}
function canManageCourses(roleOrPermissions) {
    return ((0, permissions_1.can)(roleOrPermissions, "courses.manage") ||
        (0, permissions_1.can)(roleOrPermissions, "courses.publish"));
}
function canEditCourse(course, viewer) {
    const perms = viewer.permissions ?? (0, permissions_1.getDefaultPermissionsForRole)(viewer.role);
    if ((0, permissions_1.hasPermission)(perms, "courses.edit.any"))
        return true;
    if (!(0, permissions_1.hasPermission)(perms, "courses.author"))
        return false;
    return course.createdBy === viewer.uid && course.status !== "published";
}
function canEditPath(path, viewer) {
    const perms = viewer.permissions ?? (0, permissions_1.getDefaultPermissionsForRole)(viewer.role);
    if ((0, permissions_1.hasPermission)(perms, "paths.edit.any"))
        return true;
    if (!(0, permissions_1.hasPermission)(perms, "paths.author"))
        return false;
    return path.createdBy === viewer.uid && path.status !== "published";
}
function belongsInDefaultAgentGroup(roleOrPermissions) {
    return (0, permissions_1.can)(roleOrPermissions, "chats.groups.default.join");
}
function canAccessTools(roleOrPermissions) {
    return (0, permissions_1.can)(roleOrPermissions, "tools.access");
}
function canCreateChatGroups(roleOrPermissions) {
    return (0, permissions_1.can)(roleOrPermissions, "chats.groups.create");
}
function canConfigureGroupAutoJoin(roleOrPermissions) {
    return (0, permissions_1.can)(roleOrPermissions, "chats.groups.autojoin.configure");
}
function canParticipateInForums(roleOrPermissions, isAnonymous) {
    if (isAnonymous)
        return false;
    const perms = (0, permissions_1.resolvePermissionSet)(roleOrPermissions);
    if (typeof roleOrPermissions === "string" &&
        (roleOrPermissions === "guest" || !roleOrPermissions)) {
        return false;
    }
    return (0, permissions_1.hasPermission)(perms, "forums.participate");
}
function canParticipateInChats(roleOrPermissions, isAnonymous) {
    if (isAnonymous)
        return false;
    return (0, permissions_1.can)(roleOrPermissions, "chats.participate");
}
function canAccessAdmin(roleOrPermissions) {
    return ((0, permissions_1.can)(roleOrPermissions, "admin.access") ||
        (0, permissions_1.can)(roleOrPermissions, "apps.admin.access"));
}
/** Override Management portal — platform admins only (not managers by default). */
function canAccessPayments(roleOrPermissions) {
    return ((0, permissions_1.can)(roleOrPermissions, "apps.payments.access") ||
        (0, permissions_1.can)(roleOrPermissions, "platform.manage"));
}
function canManagePlatform(roleOrPermissions) {
    return (0, permissions_1.can)(roleOrPermissions, "platform.manage");
}
function canModerateForums(roleOrPermissions) {
    return (0, permissions_1.can)(roleOrPermissions, "forums.moderate");
}
function canAccessStudio(roleOrPermissions) {
    return ((0, permissions_1.can)(roleOrPermissions, "apps.studio.access") ||
        (0, permissions_1.can)(roleOrPermissions, "courses.author"));
}
