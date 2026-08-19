import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  ALL_PERMISSION_KEYS,
  ALL_ROLES,
  BUILTIN_ROLE_IDS,
  ROLE_SEED_CONFIG_PATH,
  SYSTEM_MEGA_ROLE_ID,
  builtinRoleSeedDoc,
  builtinRoleSeedVersion,
  canAssignRoleByAuthority,
  filterValidPermissions,
  getRequiredBuiltinChatPermissions,
  isBuiltinRoleId,
  isProfileBadgeIcon,
  isRoleCategory,
  isSystemEditableRoleId,
  isSystemRole,
  mergeBuiltinRolePermissions,
  parseBadgeColorToken,
  type BuiltinRoleId,
  type RoleCategory,
  type RoleDoc,
} from "@pulse/shared";
import { db, callableOpts } from "./init";
import { requireActor, type Actor } from "./guards";
import { loadPermissionsForRole } from "./permissions";

const SLUG_RE = /^[a-z][a-z0-9-]{1,62}$/;

function millisOrNull(value: unknown): number | null {
  if (value && typeof value === "object" && "toMillis" in value) {
    const fn = (value as { toMillis?: () => number }).toMillis;
    if (typeof fn === "function") return fn.call(value);
  }
  return typeof value === "number" ? value : null;
}

export function mapRoleDoc(id: string, data: DocumentData): RoleDoc {
  const category = isRoleCategory(data.category) ? data.category : "custom";
  return {
    id,
    name: typeof data.name === "string" ? data.name : id,
    description:
      typeof data.description === "string" ? data.description : undefined,
    category,
    permissions: filterValidPermissions([
      ...(Array.isArray(data.permissions)
        ? data.permissions.map(String).filter(Boolean)
        : []),
      ...getRequiredBuiltinChatPermissions(id),
    ]),
    builtIn: data.builtIn === true,
    editableBySystemOnly: data.editableBySystemOnly === true,
    locked: data.locked === true,
    active: data.active !== false,
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 100,
    badgeText:
      typeof data.badgeText === "string" ? data.badgeText.slice(0, 40) : null,
    badgeIcon: isProfileBadgeIcon(data.badgeIcon) ? data.badgeIcon : null,
    badgeColor: typeof data.badgeColor === "string" ? data.badgeColor : null,
    createdAt: millisOrNull(data.createdAt),
    updatedAt: millisOrNull(data.updatedAt),
    updatedBy:
      typeof data.updatedBy === "string" ? data.updatedBy : null,
  };
}

async function requireRolesReader(
  request: { auth?: { uid: string } },
  operation: string,
  permission: string | string[] = "admin.roles.read",
): Promise<Actor> {
  return requireActor(request, operation, { permission });
}

/**
 * Validates a role slug for assignment to users.
 * Blocks `system`. Allows active Firestore roles, or legacy ALL_ROLES
 * when the roles collection has not been seeded yet.
 */
export async function assertAssignableRoleId(roleId: string): Promise<string> {
  const id = roleId.trim();
  if (!id) {
    throw new HttpsError("invalid-argument", "Role required.");
  }
  if (id === SYSTEM_MEGA_ROLE_ID) {
    throw new HttpsError(
      "permission-denied",
      "System role can only be assigned directly in the database.",
    );
  }

  const snap = await db.doc(`roles/${id}`).get();
  if (snap.exists) {
    const data = snap.data();
    if (data?.active === false) {
      throw new HttpsError("failed-precondition", "Role is inactive.");
    }
    if (data?.locked === true) {
      throw new HttpsError(
        "permission-denied",
        "Cannot assign locked role via Admin.",
      );
    }
    return id;
  }

  if ((ALL_ROLES as readonly string[]).includes(id) && id !== SYSTEM_MEGA_ROLE_ID) {
    return id;
  }

  throw new HttpsError("invalid-argument", "Invalid or unknown role.");
}

async function assertRoleBelowActor(
  actor: Actor,
  targetRole: string,
): Promise<void> {
  const targetPermissions = await loadPermissionsForRole(targetRole);
  if (
    !canAssignRoleByAuthority({
      actorRole: actor.role,
      actorPermissions: actor.permissions,
      targetRole,
      targetPermissions,
    })
  ) {
    throw new HttpsError(
      "permission-denied",
      "Cannot manage a role at or above your authority.",
    );
  }
}

/** Returns whether a role is strictly below the caller and within its permissions. */
export async function actorCanManageRole(
  actor: Actor,
  targetRole: string,
): Promise<boolean> {
  const targetPermissions = await loadPermissionsForRole(targetRole);
  return canAssignRoleByAuthority({
    actorRole: actor.role,
    actorPermissions: actor.permissions,
    targetRole,
    targetPermissions,
  });
}

/** Validates an assignable role and enforces the caller's strict ceiling. */
export async function assertAssignableRoleForActor(
  actor: Actor,
  roleId: string,
): Promise<string> {
  const role = await assertAssignableRoleId(roleId);
  await assertRoleBelowActor(actor, role);
  return role;
}

/** Prevents modifying users whose current authority is not below the caller. */
export async function assertActorCanManageCurrentRole(
  actor: Actor,
  currentRole: string,
): Promise<void> {
  await assertRoleBelowActor(actor, currentRole);
}

function seedPayload(
  id: BuiltinRoleId,
  actorUid: string | null,
): Record<string, unknown> {
  return {
    ...builtinRoleSeedDoc(id),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actorUid,
    createdAt: FieldValue.serverTimestamp(),
  };
}

function roleSeedMetaPayload(
  actorUid: string | null,
  version: string,
): Record<string, unknown> {
  return {
    version,
    roleCount: BUILTIN_ROLE_IDS.length,
    permissionCount: ALL_PERMISSION_KEYS.length,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actorUid,
  };
}

/** Upserts built-in roles. Safe to call repeatedly. */
export async function upsertBuiltinRoles(actorUid: string | null) {
  const refs = BUILTIN_ROLE_IDS.map((id) => db.doc(`roles/${id}`));
  const existingSnaps = await Promise.all(refs.map((ref) => ref.get()));
  const batch = db.batch();
  for (let i = 0; i < BUILTIN_ROLE_IDS.length; i += 1) {
    const id = BUILTIN_ROLE_IDS[i]!;
    const ref = refs[i]!;
    const existing = existingSnaps[i]!;
    const payload = seedPayload(id, actorUid);
    if (!existing.exists) {
      batch.set(ref, payload);
      continue;
    }
    const { createdAt: _createdAt, ...update } = payload;
    const current = Array.isArray(existing.data()?.permissions)
      ? existing.data()!.permissions.map(String)
      : [];
    const nextPermissions = mergeBuiltinRolePermissions(id, current);
    batch.set(ref, { ...update, permissions: nextPermissions }, { merge: true });
  }
  await batch.commit();
}

/**
 * Writes shipped built-in roles when the catalog fingerprint changes.
 * Force recreates missing docs even if this version already ran.
 */
export async function ensureBuiltinRolesSeeded(
  actorUid: string | null,
  options?: { force?: boolean },
): Promise<{ seeded: boolean; version: string }> {
  const version = builtinRoleSeedVersion();
  const metaRef = db.doc(ROLE_SEED_CONFIG_PATH);
  if (!options?.force) {
    const metaSnap = await metaRef.get();
    if (metaSnap.data()?.version === version) {
      return { seeded: false, version };
    }
  }
  await upsertBuiltinRoles(actorUid);
  await metaRef.set(roleSeedMetaPayload(actorUid, version), { merge: true });
  return { seeded: true, version };
}

async function loadRoleCollection() {
  let snap = await db.collection("roles").limit(200).get();
  const have = new Set(snap.docs.map((doc) => doc.id));
  if (BUILTIN_ROLE_IDS.some((id) => !have.has(id))) {
    await ensureBuiltinRolesSeeded(null, { force: true });
    snap = await db.collection("roles").limit(200).get();
  }
  return snap;
}

export const seedSystemRoles = onCall(callableOpts, async (request) => {
  const { uid } = await requireRolesReader(
    request,
    "seedSystemRoles",
    "platform.manage",
  );
  const { version } = await ensureBuiltinRolesSeeded(uid, { force: true });
  const snap = await db.collection("roles").limit(200).get();
  const roles = snap.docs
    .map((doc) => mapRoleDoc(doc.id, doc.data()))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return { ok: true, version, roles };
});

export const listRoles = onCall(callableOpts, async (request) => {
  await requireRolesReader(request, "listRoles");
  const category =
    typeof request.data?.category === "string" ? request.data.category : "";
  const includeInactive = request.data?.includeInactive === true;
  const includeSystem = request.data?.includeSystem === true;

  const snap = await loadRoleCollection();

  let roles = snap.docs.map((doc) => mapRoleDoc(doc.id, doc.data()));
  if (!includeInactive) {
    roles = roles.filter((r) => r.active);
  }
  if (!includeSystem) {
    roles = roles.filter((r) => r.id !== SYSTEM_MEGA_ROLE_ID);
  }
  if (category && isRoleCategory(category)) {
    roles = roles.filter((r) => r.category === category);
  }
  roles.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return { roles };
});

export const createRole = onCall(callableOpts, async (request) => {
  const actor = await requireRolesReader(
    request,
    "createRole",
    "admin.roles.create",
  );

  const id = String(request.data?.id ?? "")
    .trim()
    .toLowerCase();
  const name = String(request.data?.name ?? "").trim();
  const description =
    typeof request.data?.description === "string"
      ? request.data.description.trim()
      : "";
  const categoryRaw = request.data?.category;
  const category: RoleCategory = isRoleCategory(categoryRaw)
    ? categoryRaw
    : "custom";
  const permissions = filterValidPermissions(
    Array.isArray(request.data?.permissions)
      ? request.data.permissions.map(String)
      : [],
  );
  const sortOrder =
    typeof request.data?.sortOrder === "number"
      ? request.data.sortOrder
      : 200;

  if (!SLUG_RE.test(id)) {
    throw new HttpsError(
      "invalid-argument",
      "Role id must be a lowercase slug (letters, numbers, hyphens).",
    );
  }
  if (isBuiltinRoleId(id) || id === SYSTEM_MEGA_ROLE_ID) {
    throw new HttpsError(
      "invalid-argument",
      "Cannot create a role with a built-in id.",
    );
  }
  if (!name) {
    throw new HttpsError("invalid-argument", "Name required.");
  }
  if (
    !canAssignRoleByAuthority({
      actorRole: actor.role,
      actorPermissions: actor.permissions,
      targetRole: id,
      targetPermissions: permissions,
    })
  ) {
    throw new HttpsError(
      "permission-denied",
      "A role cannot contain permissions at or above your authority.",
    );
  }

  const ref = db.doc(`roles/${id}`);
  const existing = await ref.get();
  if (existing.exists) {
    throw new HttpsError("already-exists", "Role id already exists.");
  }

  const payload = {
    id,
    name,
    description: description || null,
    category,
    permissions,
    builtIn: false,
    editableBySystemOnly: false,
    locked: false,
    active: true,
    sortOrder,
    badgeText:
      typeof request.data?.badgeText === "string"
        ? request.data.badgeText.trim().slice(0, 40) || null
        : null,
    badgeIcon: isProfileBadgeIcon(request.data?.badgeIcon)
      ? request.data.badgeIcon
      : "badge",
    badgeColor: parseBadgeColorToken(request.data?.badgeColor),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid,
  };
  await ref.set(payload);
  const after = await ref.get();
  return { role: mapRoleDoc(id, after.data() ?? payload) };
});

export const updateRole = onCall(callableOpts, async (request) => {
  const actor = await requireRolesReader(
    request,
    "updateRole",
    "admin.roles.update",
  );
  const id = String(request.data?.id ?? "").trim();
  if (!id) throw new HttpsError("invalid-argument", "id required");

  if (id === SYSTEM_MEGA_ROLE_ID) {
    throw new HttpsError(
      "permission-denied",
      "System role can only be modified directly in the database.",
    );
  }

  const ref = db.doc(`roles/${id}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Role not found.");

  const current = mapRoleDoc(id, snap.data() ?? {});
  if (current.locked) {
    throw new HttpsError("permission-denied", "Role is locked.");
  }

  if (current.editableBySystemOnly || isSystemEditableRoleId(id)) {
    if (!isSystemRole(actor.role)) {
      throw new HttpsError(
        "permission-denied",
        "Only the System role can edit this role.",
      );
    }
  }

  if (!(await actorCanManageRole(actor, id))) {
    throw new HttpsError(
      "permission-denied",
      "Cannot edit a role at or above your authority.",
    );
  }

  const nextPermissions = Array.isArray(request.data?.permissions)
    ? filterValidPermissions([
        ...request.data.permissions.map(String),
        ...getRequiredBuiltinChatPermissions(id),
      ])
    : current.permissions;
  if (
    !canAssignRoleByAuthority({
      actorRole: actor.role,
      actorPermissions: actor.permissions,
      targetRole: id,
      targetPermissions: nextPermissions,
    })
  ) {
    throw new HttpsError(
      "permission-denied",
      "A role cannot contain permissions at or above your authority.",
    );
  }

  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid,
  };

  if (typeof request.data?.name === "string") {
    const name = request.data.name.trim();
    if (!name) throw new HttpsError("invalid-argument", "Name required.");
    updates.name = name;
  }
  if (typeof request.data?.description === "string") {
    updates.description = request.data.description.trim() || null;
  }
  if (isRoleCategory(request.data?.category)) {
    updates.category = request.data.category;
  }
  if (Array.isArray(request.data?.permissions)) {
    updates.permissions = nextPermissions;
  }
  if (typeof request.data?.active === "boolean") {
    if (current.builtIn && request.data.active === false) {
      throw new HttpsError(
        "failed-precondition",
        "Built-in roles cannot be deactivated.",
      );
    }
    updates.active = request.data.active;
  }
  if (typeof request.data?.sortOrder === "number") {
    updates.sortOrder = request.data.sortOrder;
  }
  if ("badgeText" in (request.data ?? {})) {
    const text =
      typeof request.data?.badgeText === "string"
        ? request.data.badgeText.trim().slice(0, 40)
        : "";
    updates.badgeText = text || null;
  }
  if ("badgeIcon" in (request.data ?? {})) {
    updates.badgeIcon = isProfileBadgeIcon(request.data?.badgeIcon)
      ? request.data.badgeIcon
      : null;
  }
  if ("badgeColor" in (request.data ?? {})) {
    updates.badgeColor = parseBadgeColorToken(request.data?.badgeColor);
  }

  // Never allow flipping locked / builtIn / editableBySystemOnly via API
  await ref.update(updates);
  const after = await ref.get();
  return { role: mapRoleDoc(id, after.data() ?? {}) };
});

export const deleteRole = onCall(callableOpts, async (request) => {
  const actor = await requireRolesReader(
    request,
    "deleteRole",
    "admin.roles.delete",
  );

  const id = String(request.data?.id ?? "").trim();
  const hard = request.data?.hard === true;
  if (!id) throw new HttpsError("invalid-argument", "id required");
  if (id === SYSTEM_MEGA_ROLE_ID || isBuiltinRoleId(id)) {
    throw new HttpsError(
      "failed-precondition",
      "Built-in roles cannot be deleted.",
    );
  }

  const ref = db.doc(`roles/${id}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Role not found.");
  if (!(await actorCanManageRole(actor, id))) {
    throw new HttpsError(
      "permission-denied",
      "Cannot delete a role at or above your authority.",
    );
  }

  const usersWithRole = await db
    .collection("users")
    .where("role", "==", id)
    .limit(1)
    .get();
  if (!usersWithRole.empty) {
    throw new HttpsError(
      "failed-precondition",
      "Cannot delete a role that is still assigned to users.",
    );
  }

  if (hard) {
    await ref.delete();
    return { ok: true, deleted: true };
  }

  await ref.update({
    active: false,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid,
  });
  return { ok: true, deleted: false, active: false };
});
