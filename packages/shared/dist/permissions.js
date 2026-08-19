"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_SEED_CONFIG_PATH = exports.DEFAULT_ROLE_META = exports.DEFAULT_ROLE_PERMISSIONS = exports.BUILTIN_ROLE_IDS = exports.SYSTEM_EDITABLE_ROLE_IDS = exports.SYSTEM_MEGA_ROLE_ID = exports.ROLE_CATEGORIES = exports.ALL_PERMISSION_KEYS = exports.PERMISSION_CATALOG = exports.PERMISSION_CATEGORIES = void 0;
exports.permissionNameMessageKey = permissionNameMessageKey;
exports.permissionDescriptionMessageKey = permissionDescriptionMessageKey;
exports.isPermissionKey = isPermissionKey;
exports.permissionsByCategory = permissionsByCategory;
exports.hasPermission = hasPermission;
exports.resolveAccess = resolveAccess;
exports.filterValidPermissions = filterValidPermissions;
exports.getDefaultPermissionsForRole = getDefaultPermissionsForRole;
exports.resolvePermissionSet = resolvePermissionSet;
exports.resolvePermissionsFromRoleDoc = resolvePermissionsFromRoleDoc;
exports.can = can;
exports.isRoleCategory = isRoleCategory;
exports.isBuiltinRoleId = isBuiltinRoleId;
exports.getRequiredBuiltinChatPermissions = getRequiredBuiltinChatPermissions;
exports.isSystemEditableRoleId = isSystemEditableRoleId;
exports.roleAuthorityRank = roleAuthorityRank;
exports.canAssignRoleByAuthority = canAssignRoleByAuthority;
exports.builtinRoleSeedDoc = builtinRoleSeedDoc;
exports.builtinRoleSeedDocs = builtinRoleSeedDocs;
exports.mergeBuiltinRolePermissions = mergeBuiltinRolePermissions;
exports.builtinRoleSeedVersion = builtinRoleSeedVersion;
exports.PERMISSION_CATEGORIES = [
    "platform",
    "admin",
    "org",
    "learning",
    "sales",
    "comms",
    "apps",
];
/**
 * Stable permission catalog (code-defined). Role docs store subsets of these keys.
 * Keys use `domain.action` form.
 */
exports.PERMISSION_CATALOG = [
    // platform
    {
        key: "platform.manage",
        category: "platform",
        name: "Manage platform",
        description: "Full platform operations (highest staff privilege short of system)",
    },
    {
        key: "platform.stats.read",
        category: "platform",
        name: "View platform stats",
        description: "View platform-wide analytics and insights",
    },
    {
        key: "platform.settings.write",
        category: "platform",
        name: "Edit platform settings",
        description: "Change platform settings",
    },
    {
        key: "platform.roles.system.edit",
        category: "platform",
        name: "Edit system roles",
        description: "Edit built-in system roles (admin/manager/agent/student)",
    },
    // admin portal
    {
        key: "admin.access",
        category: "admin",
        name: "Access Admin",
        description: "Access the Admin portal",
    },
    {
        key: "admin.users.read",
        category: "admin",
        name: "View users",
        description: "List and view users",
    },
    {
        key: "admin.users.create",
        category: "admin",
        name: "Create users",
        description: "Create users",
    },
    {
        key: "admin.users.update",
        category: "admin",
        name: "Update users",
        description: "Update user profiles and roles",
    },
    {
        key: "admin.users.deactivate",
        category: "admin",
        name: "Deactivate users",
        description: "Deactivate or reactivate users",
    },
    {
        key: "admin.roles.read",
        category: "admin",
        name: "View roles",
        description: "View roles and permission matrices",
    },
    {
        key: "admin.roles.create",
        category: "admin",
        name: "Create roles",
        description: "Create custom roles",
    },
    {
        key: "admin.roles.update",
        category: "admin",
        name: "Update roles",
        description: "Update custom roles",
    },
    {
        key: "admin.roles.delete",
        category: "admin",
        name: "Delete roles",
        description: "Archive or delete custom roles",
    },
    {
        key: "admin.orgs.read",
        category: "admin",
        name: "View organizations",
        description: "View organization tree and agencies",
    },
    {
        key: "admin.orgs.write",
        category: "admin",
        name: "Edit organizations",
        description: "Create and update organization nodes",
    },
    {
        key: "admin.approvals.read",
        category: "admin",
        name: "View approvals",
        description: "View pending account approvals",
    },
    {
        key: "admin.approvals.decide",
        category: "admin",
        name: "Decide approvals",
        description: "Approve or reject accounts",
    },
    {
        key: "admin.polls.read",
        category: "admin",
        name: "View polls",
        description: "List polls and view live vote results in Admin",
    },
    {
        key: "admin.polls.write",
        category: "admin",
        name: "Edit polls",
        description: "Create, update, and deactivate polls",
    },
    {
        key: "admin.banners.read",
        category: "admin",
        name: "View banners",
        description: "List promo banners in Admin",
    },
    {
        key: "admin.banners.write",
        category: "admin",
        name: "Edit banners",
        description: "Create, update, and deactivate promo banners",
    },
    // org
    {
        key: "org.tree.read",
        category: "org",
        name: "Read org tree",
        description: "Read organization hierarchy",
    },
    {
        key: "org.agency.create",
        category: "org",
        name: "Create agencies",
        description: "Create agencies",
    },
    {
        key: "org.agency.update",
        category: "org",
        name: "Update agencies",
        description: "Update agencies",
    },
    {
        key: "org.agency.deactivate",
        category: "org",
        name: "Deactivate agencies",
        description: "Deactivate agencies",
    },
    {
        key: "org.node.create",
        category: "org",
        name: "Create org nodes",
        description: "Create org nodes under a parent",
    },
    {
        key: "org.node.update",
        category: "org",
        name: "Update org nodes",
        description: "Rename or update org nodes",
    },
    // learning / academy / studio
    {
        key: "courses.author",
        category: "learning",
        name: "Author courses",
        description: "Create and draft courses in Studio",
    },
    {
        key: "courses.manage",
        category: "learning",
        name: "Manage courses",
        description: "Manage all courses",
    },
    {
        key: "courses.publish",
        category: "learning",
        name: "Publish courses",
        description: "Publish and approve courses",
    },
    {
        key: "courses.edit.any",
        category: "learning",
        name: "Edit any course",
        description: "Edit any course regardless of author or status",
    },
    {
        key: "paths.author",
        category: "learning",
        name: "Author paths",
        description: "Create and draft learning paths",
    },
    {
        key: "paths.manage",
        category: "learning",
        name: "Manage paths",
        description: "Manage all learning paths",
    },
    {
        key: "paths.publish",
        category: "learning",
        name: "Publish paths",
        description: "Publish and approve learning paths",
    },
    {
        key: "paths.edit.any",
        category: "learning",
        name: "Edit any path",
        description: "Edit any path regardless of author or status",
    },
    {
        key: "academy.enroll",
        category: "learning",
        name: "Enroll in academy",
        description: "Enroll in published courses",
    },
    {
        key: "academy.progress.read",
        category: "learning",
        name: "View own progress",
        description: "View own academy progress",
    },
    {
        key: "academy.progress.read.any",
        category: "learning",
        name: "View any progress",
        description: "View academy progress for any user",
    },
    {
        key: "academy.analytics.read",
        category: "learning",
        name: "View academy analytics",
        description: "View academy analytics",
    },
    // sales / tools
    {
        key: "tools.access",
        category: "sales",
        name: "Access tools",
        description: "Access agent tools",
    },
    {
        key: "tools.quotes.run",
        category: "sales",
        name: "Run quotes",
        description: "Run quote calculators",
    },
    {
        key: "license.profile.required",
        category: "sales",
        name: "License profile required",
        description: "Must complete license profile fields",
    },
    {
        key: "license.profile.manage",
        category: "sales",
        name: "Manage license profile",
        description: "Manage license profile data",
    },
    // communications
    {
        key: "forums.participate",
        category: "comms",
        name: "Participate in forums",
        description: "Read and post in forums",
    },
    {
        key: "forums.moderate",
        category: "comms",
        name: "Moderate forums",
        description: "Moderate forum threads and replies",
    },
    {
        key: "chats.participate",
        category: "comms",
        name: "Participate in chats",
        description: "Participate in chats and DMs",
    },
    {
        key: "chats.groups.create",
        category: "comms",
        name: "Create chat groups",
        description: "Create chat groups",
    },
    {
        key: "chats.groups.default.join",
        category: "comms",
        name: "Join default agent group",
        description: "Auto-join the default agent staff group",
    },
    {
        key: "chats.groups.autojoin.configure",
        category: "comms",
        name: "Configure group auto-join",
        description: "Configure auto-join-by-role on groups",
    },
    {
        key: "chats.groups.manage",
        category: "comms",
        name: "Manage all chat groups",
        description: "Rename, edit membership, and delete chat groups",
    },
    {
        key: "chats.messages.moderate",
        category: "comms",
        name: "Moderate chat messages",
        description: "Delete messages and clear chat histories",
    },
    {
        key: "chats.contacts.all",
        category: "comms",
        name: "Access all chat contacts",
        description: "Find and message discoverable members without a contact relationship",
    },
    {
        key: "chats.directory.sensitive.read",
        category: "comms",
        name: "Search sensitive directory fields",
        description: "Find members by private email or NPN fields; does not reveal those values",
    },
    {
        key: "chats.dm.override_optout",
        category: "comms",
        name: "Override direct-message opt-out",
        description: "Start a direct message when the recipient disabled new direct messages",
    },
    {
        key: "notifications.manage",
        category: "comms",
        name: "Manage notifications",
        description: "Manage notification preferences and broadcasts",
    },
    // apps
    {
        key: "apps.web.access",
        category: "apps",
        name: "Access Pulse",
        description: "Access the member web app",
    },
    {
        key: "apps.studio.access",
        category: "apps",
        name: "Access Studio",
        description: "Access Pulse Studio",
    },
    {
        key: "apps.admin.access",
        category: "apps",
        name: "Access Admin app",
        description: "Access Pulse Admin (alias of admin.access)",
    },
    {
        key: "apps.payments.access",
        category: "apps",
        name: "Access Payments",
        description: "Access Commission & Override Management (Payments) portal",
    },
    {
        key: "commission.view",
        category: "sales",
        name: "View commissions",
        description: "View commission runs and related read-only data",
    },
    {
        key: "commission.upload",
        category: "sales",
        name: "Upload commission files",
        description: "Upload source statements for a commission run",
    },
    {
        key: "commission.resolve",
        category: "sales",
        name: "Resolve commission exceptions",
        description: "Resolve validation issues in the exception workspace",
    },
    {
        key: "commission.calculate",
        category: "sales",
        name: "Calculate commissions",
        description: "Run commission and override calculation",
    },
    {
        key: "commission.approve",
        category: "sales",
        name: "Approve commission runs",
        description: "Approve calculated commission runs",
    },
    {
        key: "commission.publish",
        category: "sales",
        name: "Publish commission statements",
        description: "Publish statements and trigger notifications",
    },
    {
        key: "commission.manageRules",
        category: "sales",
        name: "Manage compensation rules",
        description: "Create and version commission/override rules",
    },
    {
        key: "commission.manageImportProfiles",
        category: "sales",
        name: "Manage import profiles",
        description: "Configure statement import column mappings",
    },
    {
        key: "commission.viewAudit",
        category: "sales",
        name: "View commission audit",
        description: "View commission module audit trail",
    },
    {
        key: "commission.statements.self",
        category: "sales",
        name: "View own commission statements",
        description: "View published commission statements for self / own agency",
    },
];
/** i18n message key for a permission display name: permName_admin_users_read */
function permissionNameMessageKey(key) {
    return `permName_${key.replace(/\./g, "_")}`;
}
/** i18n message key for a permission description. */
function permissionDescriptionMessageKey(key) {
    return `permDescription_${key.replace(/\./g, "_")}`;
}
const PERMISSION_KEY_SET = new Set(exports.PERMISSION_CATALOG.map((p) => p.key));
function isPermissionKey(value) {
    return typeof value === "string" && PERMISSION_KEY_SET.has(value);
}
function permissionsByCategory(category) {
    return exports.PERMISSION_CATALOG.filter((p) => p.category === category);
}
function hasPermission(rolePermissions, key) {
    if (!rolePermissions?.length)
        return false;
    return rolePermissions.includes(key);
}
/**
 * Prefer live permission keys from Auth; fall back to the role slug for
 * `can*` helpers that accept RoleOrPermissions.
 */
function resolveAccess(permissions, role) {
    if (permissions && permissions.length > 0)
        return permissions;
    const trimmed = role?.trim();
    return trimmed || "student";
}
function filterValidPermissions(keys) {
    return keys.filter((k) => isPermissionKey(k));
}
/**
 * Sync fallback permissions for a role slug.
 * Built-ins use DEFAULT_ROLE_PERMISSIONS; custom roles return [] until
 * loaded from Firestore `roles/{id}`.
 */
function getDefaultPermissionsForRole(roleId) {
    if (!roleId)
        return exports.DEFAULT_ROLE_PERMISSIONS.student;
    const normalized = roleId === "teacher" ? "instructor" : roleId;
    if (normalized === exports.SYSTEM_MEGA_ROLE_ID)
        return exports.ALL_PERMISSION_KEYS;
    if (isBuiltinRoleId(normalized))
        return exports.DEFAULT_ROLE_PERMISSIONS[normalized];
    return [];
}
/**
 * Accept either a role slug or an already-resolved permission list.
 * Prefer passing the resolved list from Auth / callables for custom roles.
 */
function resolvePermissionSet(roleOrPermissions) {
    if (Array.isArray(roleOrPermissions))
        return roleOrPermissions;
    if (typeof roleOrPermissions === "string") {
        return getDefaultPermissionsForRole(roleOrPermissions);
    }
    return [];
}
/**
 * Resolve permissions from a Firestore `roles/{id}` document snapshot.
 * Falls back to built-in defaults when the doc is missing or inactive.
 */
function resolvePermissionsFromRoleDoc(roleId, data) {
    const normalized = roleId === "teacher" ? "instructor" : roleId.trim() || "student";
    if (normalized === exports.SYSTEM_MEGA_ROLE_ID) {
        return [...getDefaultPermissionsForRole(normalized)];
    }
    if (data && data.active !== false) {
        const raw = Array.isArray(data.permissions)
            ? data.permissions.map(String)
            : [];
        return filterValidPermissions(raw);
    }
    return [...getDefaultPermissionsForRole(normalized)];
}
function can(roleOrPermissions, key) {
    return hasPermission(resolvePermissionSet(roleOrPermissions), key);
}
/** All permission keys — used for the system mega-role seed. */
exports.ALL_PERMISSION_KEYS = exports.PERMISSION_CATALOG.map((p) => p.key);
exports.ROLE_CATEGORIES = [
    "system",
    "staff",
    "sales",
    "learning",
    "member",
    "custom",
];
function isRoleCategory(value) {
    return (typeof value === "string" &&
        exports.ROLE_CATEGORIES.includes(value));
}
/** Slugs that may never be assigned or edited via Admin callables. */
exports.SYSTEM_MEGA_ROLE_ID = "system";
/** Product system roles editable only by `system`. */
exports.SYSTEM_EDITABLE_ROLE_IDS = [
    "admin",
    "manager",
    "agency_owner",
    "agent",
    "student",
];
/** All built-in role document ids (seeded, non-deletable). */
exports.BUILTIN_ROLE_IDS = [
    exports.SYSTEM_MEGA_ROLE_ID,
    "admin",
    "manager",
    "agency_owner",
    "agent",
    "student",
    "instructor",
];
function isBuiltinRoleId(id) {
    return exports.BUILTIN_ROLE_IDS.includes(id);
}
/** Capabilities that are product invariants for already-seeded built-in roles. */
function getRequiredBuiltinChatPermissions(roleId) {
    if (!isBuiltinRoleId(roleId))
        return [];
    const base = [
        "chats.participate",
        "chats.groups.default.join",
    ];
    switch (roleId) {
        case "admin":
            return [
                ...base,
                "chats.groups.manage",
                "chats.messages.moderate",
                "chats.contacts.all",
                "chats.directory.sensitive.read",
                "chats.dm.override_optout",
            ];
        case "manager":
        case "instructor":
            return [...base, "chats.contacts.all"];
        default:
            return base;
    }
}
function isSystemEditableRoleId(id) {
    return (id === exports.SYSTEM_MEGA_ROLE_ID ||
        exports.SYSTEM_EDITABLE_ROLE_IDS.includes(id));
}
/** Default permission sets matching legacy `can*` behavior. */
exports.DEFAULT_ROLE_PERMISSIONS = {
    system: exports.ALL_PERMISSION_KEYS,
    admin: [
        "platform.manage",
        "platform.stats.read",
        "platform.settings.write",
        "admin.access",
        "admin.users.read",
        "admin.users.create",
        "admin.users.update",
        "admin.users.deactivate",
        "admin.roles.read",
        "admin.roles.create",
        "admin.roles.update",
        "admin.roles.delete",
        "admin.orgs.read",
        "admin.orgs.write",
        "admin.approvals.read",
        "admin.approvals.decide",
        "admin.polls.read",
        "admin.polls.write",
        "admin.banners.read",
        "admin.banners.write",
        "org.tree.read",
        "org.agency.create",
        "org.agency.update",
        "org.agency.deactivate",
        "org.node.create",
        "org.node.update",
        "courses.author",
        "courses.manage",
        "courses.publish",
        "courses.edit.any",
        "paths.author",
        "paths.manage",
        "paths.publish",
        "paths.edit.any",
        "academy.enroll",
        "academy.progress.read",
        "academy.progress.read.any",
        "academy.analytics.read",
        "tools.access",
        "tools.quotes.run",
        "license.profile.required",
        "license.profile.manage",
        "forums.participate",
        "forums.moderate",
        "chats.participate",
        "chats.groups.create",
        "chats.groups.default.join",
        "chats.groups.autojoin.configure",
        "chats.groups.manage",
        "chats.messages.moderate",
        "chats.contacts.all",
        "chats.directory.sensitive.read",
        "chats.dm.override_optout",
        "notifications.manage",
        "apps.web.access",
        "apps.studio.access",
        "apps.admin.access",
        "apps.payments.access",
        "commission.view",
        "commission.upload",
        "commission.resolve",
        "commission.calculate",
        "commission.approve",
        "commission.publish",
        "commission.manageRules",
        "commission.manageImportProfiles",
        "commission.viewAudit",
    ],
    manager: [
        "platform.stats.read",
        "admin.access",
        "admin.users.read",
        "admin.users.update",
        "admin.roles.read",
        "admin.orgs.read",
        "admin.orgs.write",
        "admin.approvals.read",
        "admin.approvals.decide",
        "admin.polls.read",
        "admin.polls.write",
        "admin.banners.read",
        "admin.banners.write",
        "org.tree.read",
        "org.agency.create",
        "org.agency.update",
        "org.node.create",
        "org.node.update",
        "courses.author",
        "paths.author",
        "academy.progress.read",
        "academy.analytics.read",
        "tools.access",
        "tools.quotes.run",
        "license.profile.required",
        "license.profile.manage",
        "forums.participate",
        "chats.participate",
        "chats.groups.create",
        "chats.groups.default.join",
        "chats.groups.autojoin.configure",
        "chats.contacts.all",
        "apps.web.access",
        "apps.studio.access",
        "apps.admin.access",
    ],
    agency_owner: [
        "org.tree.read",
        "org.agency.update",
        "academy.enroll",
        "academy.progress.read",
        "tools.access",
        "commission.statements.self",
        "tools.quotes.run",
        "license.profile.required",
        "license.profile.manage",
        "forums.participate",
        "chats.participate",
        "chats.groups.default.join",
        "apps.web.access",
    ],
    agent: [
        "academy.enroll",
        "academy.progress.read",
        "tools.access",
        "tools.quotes.run",
        "license.profile.required",
        "license.profile.manage",
        "forums.participate",
        "chats.participate",
        "chats.groups.default.join",
        "apps.web.access",
        "commission.statements.self",
    ],
    student: [
        "academy.enroll",
        "academy.progress.read",
        "forums.participate",
        "chats.participate",
        "chats.groups.default.join",
        "apps.web.access",
    ],
    instructor: [
        "courses.author",
        "paths.author",
        "academy.enroll",
        "academy.progress.read",
        "tools.access",
        "tools.quotes.run",
        "license.profile.required",
        "license.profile.manage",
        "forums.participate",
        "chats.participate",
        "chats.groups.create",
        "chats.groups.default.join",
        "chats.contacts.all",
        "apps.web.access",
        "apps.studio.access",
    ],
};
const BUILTIN_ROLE_AUTHORITY = {
    student: 10,
    agent: 20,
    agency_owner: 30,
    instructor: 40,
    manager: 50,
    admin: 60,
    system: 70,
};
const MANAGEMENT_PERMISSION_KEYS = new Set([
    "admin.users.create",
    "admin.users.update",
    "admin.users.deactivate",
    "admin.roles.create",
    "admin.roles.update",
    "admin.roles.delete",
    "admin.approvals.decide",
]);
/**
 * Authority level used only for role assignment ceilings.
 * Custom roles inherit a ceiling from their strongest management permission.
 */
function roleAuthorityRank(roleId, permissions = []) {
    const normalized = roleId === "teacher" ? "instructor" : roleId;
    if (isBuiltinRoleId(normalized)) {
        return BUILTIN_ROLE_AUTHORITY[normalized];
    }
    if (permissions.includes("platform.roles.system.edit"))
        return 70;
    if (permissions.includes("platform.manage"))
        return 60;
    if (permissions.some((key) => MANAGEMENT_PERMISSION_KEYS.has(key)))
        return 50;
    return 0;
}
/** Strictly-lower role assignment with a permission-subset ceiling. */
function canAssignRoleByAuthority(options) {
    const actorRank = roleAuthorityRank(options.actorRole, options.actorPermissions);
    const targetRank = roleAuthorityRank(options.targetRole, options.targetPermissions);
    if (targetRank >= actorRank)
        return false;
    const actorSet = new Set(options.actorPermissions);
    return options.targetPermissions.every((permission) => actorSet.has(permission));
}
exports.DEFAULT_ROLE_META = {
    system: {
        name: "System",
        description: "Mega-role above admin. Editable only directly in the database.",
        category: "system",
        sortOrder: 0,
        locked: true,
        editableBySystemOnly: true,
    },
    admin: {
        name: "Admin",
        description: "Full platform control in the Admin portal.",
        category: "staff",
        sortOrder: 10,
        locked: false,
        editableBySystemOnly: true,
    },
    manager: {
        name: "Manager",
        description: "Admin portal access without full platform ops.",
        category: "staff",
        sortOrder: 20,
        locked: false,
        editableBySystemOnly: true,
    },
    agency_owner: {
        name: "Agency owner",
        description: "Owns one or more agencies; future agency-management app access.",
        category: "sales",
        sortOrder: 25,
        locked: false,
        editableBySystemOnly: true,
    },
    agent: {
        name: "Agent",
        description: "Licensed agent with tools and member features.",
        category: "sales",
        sortOrder: 30,
        locked: false,
        editableBySystemOnly: true,
    },
    student: {
        name: "Student",
        description: "Default registered member.",
        category: "member",
        sortOrder: 40,
        locked: false,
        editableBySystemOnly: true,
    },
    instructor: {
        name: "Instructor",
        description: "Course author in Studio (legacy built-in).",
        category: "learning",
        sortOrder: 50,
        locked: false,
        editableBySystemOnly: true,
    },
};
/** Firestore path for the built-in role seed fingerprint. */
exports.ROLE_SEED_CONFIG_PATH = "platformConfig/roleSeed";
function builtinRoleSeedDoc(id) {
    const meta = exports.DEFAULT_ROLE_META[id];
    return {
        id,
        name: meta.name,
        description: meta.description,
        category: meta.category,
        permissions: [...exports.DEFAULT_ROLE_PERMISSIONS[id]],
        builtIn: true,
        editableBySystemOnly: meta.editableBySystemOnly,
        locked: meta.locked,
        active: true,
        sortOrder: meta.sortOrder,
    };
}
function builtinRoleSeedDocs() {
    return exports.BUILTIN_ROLE_IDS.map(builtinRoleSeedDoc);
}
/**
 * Merge product defaults into a stored permission list.
 * `system` always tracks the full catalog. Other built-ins keep extras and
 * gain any newly shipped keys without removing Admin customizations.
 */
function mergeBuiltinRolePermissions(roleId, current) {
    const defaults = [...exports.DEFAULT_ROLE_PERMISSIONS[roleId]];
    if (roleId === exports.SYSTEM_MEGA_ROLE_ID)
        return defaults;
    if (!current || current.length === 0)
        return defaults;
    const seen = new Set(current);
    const next = [...current];
    for (const key of defaults) {
        if (!seen.has(key)) {
            seen.add(key);
            next.push(key);
        }
    }
    return next;
}
function fnv1aHex(input) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
}
/**
 * Fingerprint of shipped built-in role docs. Changes when the catalog or
 * default matrices change so new app versions re-seed automatically.
 */
function builtinRoleSeedVersion() {
    return fnv1aHex(JSON.stringify(builtinRoleSeedDocs().map((doc) => [
        doc.id,
        doc.permissions,
        doc.name,
        doc.description,
        doc.category,
        doc.sortOrder,
        doc.locked,
        doc.editableBySystemOnly,
    ])));
}
