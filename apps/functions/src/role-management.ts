import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  ALL_ROLES,
  BUILTIN_ROLE_IDS,
  DEFAULT_ROLE_META,
  DEFAULT_ROLE_PERMISSIONS,
  SYSTEM_MEGA_ROLE_ID,
  canAccessAdmin,
  canManagePlatform,
  filterValidPermissions,
  hasPermission,
  isBuiltinRoleId,
  isRoleCategory,
  isSystemEditableRoleId,
  isSystemRole,
  type BuiltinRoleId,
  type RoleCategory,
  type RoleDoc,
} from "@pulse/shared";
import { db, callableOpts } from "./init";
import { requireCaller } from "./auth";
import { loadPermissionsForUid } from "./permissions";

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
    permissions: Array.isArray(data.permissions)
      ? data.permissions.map(String).filter(Boolean)
      : [],
    builtIn: data.builtIn === true,
    editableBySystemOnly: data.editableBySystemOnly === true,
    locked: data.locked === true,
    active: data.active !== false,
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 100,
    createdAt: millisOrNull(data.createdAt),
    updatedAt: millisOrNull(data.updatedAt),
    updatedBy:
      typeof data.updatedBy === "string" ? data.updatedBy : null,
  };
}

async function requireRolesReader(
  request: { auth?: { uid: string } },
  operation: string,
): Promise<{ uid: string; role: string; permissions: string[] }> {
  const uid = await requireCaller(request, operation);
  const { role, permissions } = await loadPermissionsForUid(uid);
  if (!canAccessAdmin(permissions)) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  return { uid, role, permissions };
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

function seedPayload(
  id: BuiltinRoleId,
  actorUid: string | null,
): Record<string, unknown> {
  const meta = DEFAULT_ROLE_META[id];
  return {
    id,
    name: meta.name,
    description: meta.description,
    category: meta.category,
    permissions: [...DEFAULT_ROLE_PERMISSIONS[id]],
    builtIn: true,
    editableBySystemOnly: meta.editableBySystemOnly,
    locked: meta.locked,
    active: true,
    sortOrder: meta.sortOrder,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actorUid,
    createdAt: FieldValue.serverTimestamp(),
  };
}

/** Upserts built-in roles. Safe to call repeatedly. */
export async function upsertBuiltinRoles(actorUid: string | null) {
  const batch = db.batch();
  for (const id of BUILTIN_ROLE_IDS) {
    const ref = db.doc(`roles/${id}`);
    const existing = await ref.get();
    const payload = seedPayload(id, actorUid);
    if (!existing.exists) {
      batch.set(ref, payload);
      continue;
    }
    // Never clobber createdAt; refresh metadata. Always reset system permissions.
    const { createdAt: _createdAt, ...update } = payload;
    if (id === SYSTEM_MEGA_ROLE_ID) {
      batch.set(ref, update, { merge: true });
      continue;
    }
    const hasPermissions =
      Array.isArray(existing.data()?.permissions) &&
      existing.data()!.permissions.length > 0;
    if (hasPermissions) {
      const { permissions: _p, ...metaOnly } = update;
      batch.set(ref, metaOnly, { merge: true });
    } else {
      batch.set(ref, update, { merge: true });
    }
  }
  await batch.commit();
}

export const seedSystemRoles = onCall(callableOpts, async (request) => {
  const { uid, permissions } = await requireRolesReader(
    request,
    "seedSystemRoles",
  );
  if (!canManagePlatform(permissions)) {
    throw new HttpsError("permission-denied", "Admins only.");
  }
  await upsertBuiltinRoles(uid);
  const snap = await db.collection("roles").get();
  const roles = snap.docs
    .map((doc) => mapRoleDoc(doc.id, doc.data()))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return { ok: true, roles };
});

export const listRoles = onCall(callableOpts, async (request) => {
  await requireRolesReader(request, "listRoles");
  const category =
    typeof request.data?.category === "string" ? request.data.category : "";
  const includeInactive = request.data?.includeInactive === true;
  const includeSystem = request.data?.includeSystem === true;

  let snap = await db.collection("roles").get();
  if (snap.empty) {
    // Auto-seed once so Admin UI works out of the box.
    await upsertBuiltinRoles(null);
    snap = await db.collection("roles").get();
  }

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
  const { uid, permissions: callerPerms } = await requireRolesReader(
    request,
    "createRole",
  );
  if (
    !canManagePlatform(callerPerms) &&
    !hasPermission(callerPerms, "admin.roles.create")
  ) {
    throw new HttpsError("permission-denied", "Admins only.");
  }

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
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  };
  await ref.set(payload);
  const after = await ref.get();
  return { role: mapRoleDoc(id, after.data() ?? payload) };
});

export const updateRole = onCall(callableOpts, async (request) => {
  const { uid, role: actorRole, permissions } = await requireRolesReader(
    request,
    "updateRole",
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
    if (!isSystemRole(actorRole)) {
      throw new HttpsError(
        "permission-denied",
        "Only the System role can edit this role.",
      );
    }
  } else if (
    !canManagePlatform(permissions) &&
    !hasPermission(permissions, "admin.roles.update")
  ) {
    throw new HttpsError("permission-denied", "Admins only.");
  }

  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
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
    updates.permissions = filterValidPermissions(
      request.data.permissions.map(String),
    );
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

  // Never allow flipping locked / builtIn / editableBySystemOnly via API
  await ref.update(updates);
  const after = await ref.get();
  return { role: mapRoleDoc(id, after.data() ?? {}) };
});

export const deleteRole = onCall(callableOpts, async (request) => {
  const { uid, permissions } = await requireRolesReader(request, "deleteRole");
  if (
    !canManagePlatform(permissions) &&
    !hasPermission(permissions, "admin.roles.delete")
  ) {
    throw new HttpsError("permission-denied", "Admins only.");
  }

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
    updatedBy: uid,
  });
  return { ok: true, deleted: false, active: false };
});
