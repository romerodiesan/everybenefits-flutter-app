/** Permission category for grouping in the Admin roles matrix. */
export type PermissionCategory =
  | "platform"
  | "admin"
  | "org"
  | "learning"
  | "sales"
  | "comms"
  | "apps";

export const PERMISSION_CATEGORIES: readonly PermissionCategory[] = [
  "platform",
  "admin",
  "org",
  "learning",
  "sales",
  "comms",
  "apps",
] as const;

export type PermissionDef = {
  key: string;
  category: PermissionCategory;
  /** Short human-readable label (English fallback; UI prefers i18n). */
  name: string;
  description: string;
};

/**
 * Stable permission catalog (code-defined). Role docs store subsets of these keys.
 * Keys use `domain.action` form.
 */
export const PERMISSION_CATALOG: readonly PermissionDef[] = [
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
    description: "Access Override Management (Payments) portal",
  },
] as const;

/** i18n message key for a permission display name: permName_admin_users_read */
export function permissionNameMessageKey(key: string): string {
  return `permName_${key.replace(/\./g, "_")}`;
}

export type PermissionKey = (typeof PERMISSION_CATALOG)[number]["key"];

const PERMISSION_KEY_SET = new Set(
  PERMISSION_CATALOG.map((p) => p.key),
);

export function isPermissionKey(value: unknown): value is PermissionKey {
  return typeof value === "string" && PERMISSION_KEY_SET.has(value);
}

export function permissionsByCategory(
  category: PermissionCategory,
): readonly PermissionDef[] {
  return PERMISSION_CATALOG.filter((p) => p.category === category);
}

export function hasPermission(
  rolePermissions: readonly string[] | null | undefined,
  key: string,
): boolean {
  if (!rolePermissions?.length) return false;
  return rolePermissions.includes(key);
}

/**
 * Prefer live permission keys from Auth; fall back to the role slug for
 * `can*` helpers that accept RoleOrPermissions.
 */
export function resolveAccess(
  permissions: readonly string[] | null | undefined,
  role: string | null | undefined,
): string | readonly string[] {
  if (permissions && permissions.length > 0) return permissions;
  const trimmed = role?.trim();
  return trimmed || "guest";
}

export function filterValidPermissions(keys: readonly string[]): string[] {
  return keys.filter((k) => isPermissionKey(k));
}

/**
 * Sync fallback permissions for a role slug.
 * Built-ins use DEFAULT_ROLE_PERMISSIONS; custom roles return [] until
 * loaded from Firestore `roles/{id}`.
 */
export function getDefaultPermissionsForRole(
  roleId: string | null | undefined,
): readonly string[] {
  if (!roleId) return DEFAULT_ROLE_PERMISSIONS.guest;
  const normalized = roleId === "teacher" ? "instructor" : roleId;
  if (normalized === SYSTEM_MEGA_ROLE_ID) return ALL_PERMISSION_KEYS;
  if (isBuiltinRoleId(normalized)) return DEFAULT_ROLE_PERMISSIONS[normalized];
  return [];
}

/**
 * Accept either a role slug or an already-resolved permission list.
 * Prefer passing the resolved list from Auth / callables for custom roles.
 */
export function resolvePermissionSet(
  roleOrPermissions: string | readonly string[] | null | undefined,
): readonly string[] {
  if (Array.isArray(roleOrPermissions)) return roleOrPermissions;
  if (typeof roleOrPermissions === "string") {
    return getDefaultPermissionsForRole(roleOrPermissions);
  }
  return [];
}

/**
 * Resolve permissions from a Firestore `roles/{id}` document snapshot.
 * Falls back to built-in defaults when the doc is missing or inactive.
 */
export function resolvePermissionsFromRoleDoc(
  roleId: string,
  data: { permissions?: unknown; active?: unknown } | null | undefined,
): string[] {
  const normalized =
    roleId === "teacher" ? "instructor" : roleId.trim() || "guest";
  if (normalized === SYSTEM_MEGA_ROLE_ID) {
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

export function can(
  roleOrPermissions: string | readonly string[] | null | undefined,
  key: string,
): boolean {
  return hasPermission(resolvePermissionSet(roleOrPermissions), key);
}

/** All permission keys — used for the system mega-role seed. */
export const ALL_PERMISSION_KEYS: readonly PermissionKey[] =
  PERMISSION_CATALOG.map((p) => p.key);

/** Role grouping categories in the Admin UI. */
export type RoleCategory =
  | "system"
  | "staff"
  | "sales"
  | "learning"
  | "member"
  | "custom";

export const ROLE_CATEGORIES: readonly RoleCategory[] = [
  "system",
  "staff",
  "sales",
  "learning",
  "member",
  "custom",
] as const;

export function isRoleCategory(value: unknown): value is RoleCategory {
  return (
    typeof value === "string" &&
    (ROLE_CATEGORIES as readonly string[]).includes(value)
  );
}

/** Firestore `roles/{roleId}` document shape (JSON-serializable). */
export type RoleDoc = {
  id: string;
  name: string;
  description?: string;
  category: RoleCategory;
  permissions: string[];
  builtIn: boolean;
  editableBySystemOnly: boolean;
  locked: boolean;
  active: boolean;
  sortOrder: number;
  createdAt?: number | null;
  updatedAt?: number | null;
  updatedBy?: string | null;
};

export type RoleDocInput = {
  name: string;
  description?: string;
  category: RoleCategory;
  permissions: string[];
  active?: boolean;
  sortOrder?: number;
};

/** Slugs that may never be assigned or edited via Admin callables. */
export const SYSTEM_MEGA_ROLE_ID = "system" as const;

/** Product system roles editable only by `system`. */
export const SYSTEM_EDITABLE_ROLE_IDS = [
  "admin",
  "manager",
  "agent",
  "student",
] as const;

/** All built-in role document ids (seeded, non-deletable). */
export const BUILTIN_ROLE_IDS = [
  SYSTEM_MEGA_ROLE_ID,
  "admin",
  "manager",
  "agent",
  "student",
  "instructor",
  "guest",
] as const;

export type BuiltinRoleId = (typeof BUILTIN_ROLE_IDS)[number];

export function isBuiltinRoleId(id: string): id is BuiltinRoleId {
  return (BUILTIN_ROLE_IDS as readonly string[]).includes(id);
}

export function isSystemEditableRoleId(id: string): boolean {
  return (
    id === SYSTEM_MEGA_ROLE_ID ||
    (SYSTEM_EDITABLE_ROLE_IDS as readonly string[]).includes(id)
  );
}

/** Default permission sets matching legacy `can*` behavior. */
export const DEFAULT_ROLE_PERMISSIONS: Record<
  BuiltinRoleId,
  readonly PermissionKey[]
> = {
  system: ALL_PERMISSION_KEYS,
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
    "notifications.manage",
    "apps.web.access",
    "apps.studio.access",
    "apps.admin.access",
    "apps.payments.access",
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
    "apps.web.access",
    "apps.studio.access",
    "apps.admin.access",
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
  ],
  student: [
    "academy.enroll",
    "academy.progress.read",
    "forums.participate",
    "chats.participate",
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
    "apps.web.access",
    "apps.studio.access",
  ],
  guest: ["apps.web.access"],
};

export const DEFAULT_ROLE_META: Record<
  BuiltinRoleId,
  {
    name: string;
    description: string;
    category: RoleCategory;
    sortOrder: number;
    locked: boolean;
    editableBySystemOnly: boolean;
  }
> = {
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
  guest: {
    name: "Guest",
    description: "Anonymous or unregistered visitor (legacy built-in).",
    category: "member",
    sortOrder: 60,
    locked: false,
    editableBySystemOnly: true,
  },
};
