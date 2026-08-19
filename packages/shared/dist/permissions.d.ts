/** Permission category for grouping in the Admin roles matrix. */
export type PermissionCategory = "platform" | "admin" | "org" | "learning" | "sales" | "comms" | "apps";
export declare const PERMISSION_CATEGORIES: readonly PermissionCategory[];
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
export declare const PERMISSION_CATALOG: readonly PermissionDef[];
/** i18n message key for a permission display name: permName_admin_users_read */
export declare function permissionNameMessageKey(key: string): string;
/** i18n message key for a permission description. */
export declare function permissionDescriptionMessageKey(key: string): string;
export type PermissionKey = (typeof PERMISSION_CATALOG)[number]["key"];
export declare function isPermissionKey(value: unknown): value is PermissionKey;
export declare function permissionsByCategory(category: PermissionCategory): readonly PermissionDef[];
export declare function hasPermission(rolePermissions: readonly string[] | null | undefined, key: string): boolean;
/**
 * Prefer live permission keys from Auth; fall back to the role slug for
 * `can*` helpers that accept RoleOrPermissions.
 */
export declare function resolveAccess(permissions: readonly string[] | null | undefined, role: string | null | undefined): string | readonly string[];
export declare function filterValidPermissions(keys: readonly string[]): string[];
/**
 * Sync fallback permissions for a role slug.
 * Built-ins use DEFAULT_ROLE_PERMISSIONS; custom roles return [] until
 * loaded from Firestore `roles/{id}`.
 */
export declare function getDefaultPermissionsForRole(roleId: string | null | undefined): readonly string[];
/**
 * Accept either a role slug or an already-resolved permission list.
 * Prefer passing the resolved list from Auth / callables for custom roles.
 */
export declare function resolvePermissionSet(roleOrPermissions: string | readonly string[] | null | undefined): readonly string[];
/**
 * Resolve permissions from a Firestore `roles/{id}` document snapshot.
 * Falls back to built-in defaults when the doc is missing or inactive.
 */
export declare function resolvePermissionsFromRoleDoc(roleId: string, data: {
    permissions?: unknown;
    active?: unknown;
} | null | undefined): string[];
export declare function can(roleOrPermissions: string | readonly string[] | null | undefined, key: string): boolean;
/** All permission keys — used for the system mega-role seed. */
export declare const ALL_PERMISSION_KEYS: readonly PermissionKey[];
/** Role grouping categories in the Admin UI. */
export type RoleCategory = "system" | "staff" | "sales" | "learning" | "member" | "custom";
export declare const ROLE_CATEGORIES: readonly RoleCategory[];
export declare function isRoleCategory(value: unknown): value is RoleCategory;
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
    /** Public badge label; falls back to [name]. */
    badgeText?: string | null;
    badgeIcon?: string | null;
    /** Hex, accent seed, or `"accent"` to follow each user's appearance. */
    badgeColor?: string | null;
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
export declare const SYSTEM_MEGA_ROLE_ID: "system";
/** Product system roles editable only by `system`. */
export declare const SYSTEM_EDITABLE_ROLE_IDS: readonly ["admin", "manager", "agency_owner", "agent", "student"];
/** All built-in role document ids (seeded, non-deletable). */
export declare const BUILTIN_ROLE_IDS: readonly ["system", "admin", "manager", "agency_owner", "agent", "student", "instructor"];
export type BuiltinRoleId = (typeof BUILTIN_ROLE_IDS)[number];
export declare function isBuiltinRoleId(id: string): id is BuiltinRoleId;
/** Capabilities that are product invariants for already-seeded built-in roles. */
export declare function getRequiredBuiltinChatPermissions(roleId: string): PermissionKey[];
export declare function isSystemEditableRoleId(id: string): boolean;
/** Default permission sets matching legacy `can*` behavior. */
export declare const DEFAULT_ROLE_PERMISSIONS: Record<BuiltinRoleId, readonly PermissionKey[]>;
/**
 * Authority level used only for role assignment ceilings.
 * Custom roles inherit a ceiling from their strongest management permission.
 */
export declare function roleAuthorityRank(roleId: string, permissions?: readonly string[]): number;
/** Strictly-lower role assignment with a permission-subset ceiling. */
export declare function canAssignRoleByAuthority(options: {
    actorRole: string;
    actorPermissions: readonly string[];
    targetRole: string;
    targetPermissions: readonly string[];
}): boolean;
export declare const DEFAULT_ROLE_META: Record<BuiltinRoleId, {
    name: string;
    description: string;
    category: RoleCategory;
    sortOrder: number;
    locked: boolean;
    editableBySystemOnly: boolean;
}>;
/** Firestore path for the built-in role seed fingerprint. */
export declare const ROLE_SEED_CONFIG_PATH = "platformConfig/roleSeed";
/** JSON-serializable built-in role document (timestamps added at write time). */
export type BuiltinRoleSeedDoc = {
    id: BuiltinRoleId;
    name: string;
    description: string;
    category: RoleCategory;
    permissions: PermissionKey[];
    builtIn: true;
    editableBySystemOnly: boolean;
    locked: boolean;
    active: true;
    sortOrder: number;
};
export declare function builtinRoleSeedDoc(id: BuiltinRoleId): BuiltinRoleSeedDoc;
export declare function builtinRoleSeedDocs(): BuiltinRoleSeedDoc[];
/**
 * Merge product defaults into a stored permission list.
 * `system` always tracks the full catalog. Other built-ins keep extras and
 * gain any newly shipped keys without removing Admin customizations.
 */
export declare function mergeBuiltinRolePermissions(roleId: BuiltinRoleId, current: readonly string[] | null | undefined): string[];
/**
 * Fingerprint of shipped built-in role docs. Changes when the catalog or
 * default matrices change so new app versions re-seed automatically.
 */
export declare function builtinRoleSeedVersion(): string;
//# sourceMappingURL=permissions.d.ts.map