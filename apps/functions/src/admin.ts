import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type Query,
} from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  ALL_ROLES,
  parseRole,
  type UserRole,
} from "@pulse/shared";
import { admin, db, callableOpts } from "./init";
import { requireCaller } from "./auth";
import { assertAssignableRoleId } from "./role-management";
import { loadPermissionsForUid } from "./permissions";

const DEFAULT_AGENCY = "Every Benefits";

function mapAdminUserRow(id: string, data: DocumentData) {
  return {
    uid: id,
    email: typeof data.email === "string" ? data.email : null,
    displayName: typeof data.displayName === "string" ? data.displayName : null,
    photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
    role: parseRole(data.role),
    isAnonymous: data.isAnonymous === true,
    profileCompleted: data.profileCompleted !== false,
    npn: typeof data.npn === "string" ? data.npn : null,
    agency: typeof data.agency === "string" ? data.agency : null,
    orgNodeId: typeof data.orgNodeId === "string" ? data.orgNodeId : null,
    accountStatus:
      data.accountStatus === "deactivated" ||
      data.accountStatus === "pendingDeletion"
        ? data.accountStatus
        : "active",
    approvalStatus:
      data.approvalStatus === "pending" ||
      data.approvalStatus === "approved" ||
      data.approvalStatus === "rejected"
        ? data.approvalStatus
        : undefined,
    createdAt:
      data.createdAt && typeof data.createdAt.toMillis === "function"
        ? data.createdAt.toMillis()
        : typeof data.createdAt === "number"
          ? data.createdAt
          : null,
  };
}

function lowerOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

function encodePageToken(createdAtMs: number, uid: string): string {
  return Buffer.from(JSON.stringify({ c: createdAtMs, u: uid }), "utf8").toString(
    "base64url",
  );
}

function decodePageToken(
  token: string,
): { createdAt: Timestamp; uid: string } | null {
  try {
    const raw = JSON.parse(
      Buffer.from(token, "base64url").toString("utf8"),
    ) as { c?: unknown; u?: unknown };
    const ms = Number(raw.c);
    const uid = typeof raw.u === "string" ? raw.u.trim() : "";
    if (!Number.isFinite(ms) || !uid) return null;
    return { createdAt: Timestamp.fromMillis(ms), uid };
  } catch {
    return null;
  }
}

async function requireAdminCaller(
  request: { auth?: { uid: string } },
  operation: string,
  platformOnly = false,
): Promise<{ uid: string; role: UserRole; permissions: string[] }> {
  const uid = await requireCaller(request, operation);
  const { role, permissions } = await loadPermissionsForUid(uid);
  const { canAccessAdmin, canManagePlatform } = await import("@pulse/shared");
  const allowed = platformOnly
    ? canManagePlatform(permissions)
    : canAccessAdmin(permissions);
  if (!allowed) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  return { uid, role: parseRole(role), permissions };
}

function buildUsersBaseQuery(filters: {
  roleFilter: string;
  approvalFilter: string;
  accountFilter: string;
  orgNodeId: string;
  query: string;
}): Query {
  let q: Query = db.collection("users");

  if (filters.query) {
    const field = filters.query.includes("@") ? "emailLower" : "displayNameLower";
    const prefix = filters.query;
    const end = `${prefix}\uf8ff`;
    q = q
      .where(field, ">=", prefix)
      .where(field, "<=", end)
      .orderBy(field, "asc");
    return q;
  }

  if (filters.roleFilter && (ALL_ROLES as readonly string[]).includes(filters.roleFilter)) {
    q = q.where("role", "==", filters.roleFilter);
  } else if (filters.orgNodeId) {
    q = q.where("orgNodeId", "==", filters.orgNodeId);
  } else if (filters.approvalFilter) {
    q = q.where("approvalStatus", "==", filters.approvalFilter);
  } else if (filters.accountFilter) {
    q = q.where("accountStatus", "==", filters.accountFilter);
  } else {
    q = q.where("isAnonymous", "==", false);
  }

  return q.orderBy("createdAt", "desc").orderBy("__name__", "desc");
}

export const listUsersForAdmin = onCall(callableOpts, async (request) => {
  await requireAdminCaller(request, "listUsersForAdmin");
  const roleFilter = String(request.data?.role ?? "").trim();
  const approvalFilter = String(request.data?.approvalStatus ?? "").trim();
  const accountFilter = String(request.data?.accountStatus ?? "").trim();
  const orgNodeId = String(request.data?.orgNodeId ?? "").trim();
  const query = String(request.data?.query ?? "").trim().toLowerCase();
  const pageSize = Math.max(
    1,
    Math.min(
      100,
      Math.round(
        Number(request.data?.pageSize ?? request.data?.limit ?? 25),
      ),
    ),
  );
  const pageToken = String(request.data?.pageToken ?? "").trim();

  let q = buildUsersBaseQuery({
    roleFilter,
    approvalFilter,
    accountFilter,
    orgNodeId,
    query,
  });

  if (pageToken && !query) {
    const cursor = decodePageToken(pageToken);
    if (!cursor) {
      throw new HttpsError("invalid-argument", "Invalid pageToken.");
    }
    q = q.startAfter(cursor.createdAt, cursor.uid);
  }

  // Fetch one extra to detect a next page. When search/prefix is used, oversample
  // slightly so in-memory secondary filters still fill a page.
  const fetchLimit = query
    ? Math.min(200, pageSize * 4)
    : pageSize + 1;
  const snap = await q.limit(fetchLimit).get();

  let rows = snap.docs.map((doc) => mapAdminUserRow(doc.id, doc.data()));

  rows = rows.filter((row) => {
    if (row.isAnonymous) return false;
    if (approvalFilter && row.approvalStatus !== approvalFilter) return false;
    if (accountFilter && row.accountStatus !== accountFilter) return false;
    if (orgNodeId && row.orgNodeId !== orgNodeId) return false;
    if (roleFilter && row.role !== roleFilter) return false;
    if (query) {
      const hay =
        `${row.displayName ?? ""} ${row.email ?? ""} ${row.npn ?? ""}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  const hasMore = rows.length > pageSize;
  const page = rows.slice(0, pageSize);
  const last = page[page.length - 1];
  const nextPageToken =
    hasMore && last && last.createdAt != null && !query
      ? encodePageToken(last.createdAt, last.uid)
      : hasMore && query
        ? null
        : hasMore && last?.createdAt != null
          ? encodePageToken(last.createdAt, last.uid)
          : null;

  return { users: page, nextPageToken };
});

export const adminDeactivateUser = onCall(callableOpts, async (request) => {
  const { uid: actorUid } = await requireAdminCaller(
    request,
    "adminDeactivateUser",
    true,
  );
  const targetUid = String(request.data?.uid ?? "").trim();
  if (!targetUid) throw new HttpsError("invalid-argument", "uid required");
  if (targetUid === actorUid) {
    throw new HttpsError("failed-precondition", "Cannot deactivate yourself.");
  }
  const userRef = db.doc(`users/${targetUid}`);
  const snap = await userRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "User not found.");
  if (snap.data()?.accountStatus === "pendingDeletion") {
    throw new HttpsError("failed-precondition", "Deletion already requested.");
  }
  await userRef.update({
    accountStatus: "deactivated",
    deactivatedAt: FieldValue.serverTimestamp(),
    deactivatedBy: actorUid,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const { bumpAccountStatusChange } = await import("./platform-stats");
  await bumpAccountStatusChange(
    String(snap.data()?.accountStatus ?? "active"),
    "deactivated",
  );
  const tokens = await db
    .collection(`users/${targetUid}/fcmTokens`)
    .limit(50)
    .get();
  await Promise.all(tokens.docs.map((doc) => doc.ref.delete()));
  return { ok: true };
});

export const adminReactivateUser = onCall(callableOpts, async (request) => {
  const { uid: actorUid } = await requireAdminCaller(
    request,
    "adminReactivateUser",
    true,
  );
  const targetUid = String(request.data?.uid ?? "").trim();
  if (!targetUid) throw new HttpsError("invalid-argument", "uid required");
  const userRef = db.doc(`users/${targetUid}`);
  const snap = await userRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "User not found.");
  if (snap.data()?.accountStatus !== "deactivated") {
    throw new HttpsError("failed-precondition", "Account is not deactivated.");
  }
  await userRef.update({
    accountStatus: "active",
    deactivatedAt: FieldValue.delete(),
    deactivatedBy: FieldValue.delete(),
    reactivatedBy: actorUid,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const { bumpAccountStatusChange } = await import("./platform-stats");
  await bumpAccountStatusChange("deactivated", "active");
  return { ok: true };
});

export const adminCreateUser = onCall(callableOpts, async (request) => {
  await requireAdminCaller(request, "adminCreateUser", true);
  const email = String(request.data?.email ?? "").trim().toLowerCase();
  const displayName = String(request.data?.displayName ?? "").trim();
  const password = String(request.data?.password ?? "");
  const roleRaw = String(request.data?.role ?? "student").trim();
  const role = await assertAssignableRoleId(roleRaw);
  const orgNodeIdRaw = request.data?.orgNodeId;
  const orgNodeId =
    orgNodeIdRaw === null || orgNodeIdRaw === undefined || orgNodeIdRaw === ""
      ? null
      : String(orgNodeIdRaw).trim();
  const npn =
    typeof request.data?.npn === "string" ? request.data.npn.trim() || null : null;
  const approvalStatus =
    request.data?.approvalStatus === "pending" ||
    request.data?.approvalStatus === "rejected"
      ? request.data.approvalStatus
      : "approved";

  if (!email || !email.includes("@")) {
    throw new HttpsError("invalid-argument", "Valid email required.");
  }
  if (password.length < 6) {
    throw new HttpsError("invalid-argument", "Password must be at least 6 characters.");
  }

  let agency: string | null = DEFAULT_AGENCY;
  if (orgNodeId) {
    const node = await db.doc(`orgNodes/${orgNodeId}`).get();
    if (!node.exists) throw new HttpsError("not-found", "Org node not found.");
    if (node.data()?.active === false) {
      throw new HttpsError("failed-precondition", "Org node is inactive.");
    }
    agency =
      typeof node.data()?.name === "string" ? String(node.data()?.name) : agency;
  }

  let user;
  try {
    user = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || undefined,
      emailVerified: false,
    });
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code.includes("email-already-exists")) {
      throw new HttpsError("already-exists", "Email already registered.");
    }
    throw new HttpsError(
      "internal",
      error instanceof Error ? error.message : "Failed to create auth user.",
    );
  }

  const payload = {
    uid: user.uid,
    email,
    emailLower: email,
    displayName: displayName || null,
    displayNameLower: lowerOrNull(displayName),
    photoUrl: null,
    role,
    isAnonymous: false,
    profileCompleted: true,
    productTourVersion: 0,
    phoneCountryCode: null,
    phoneNumber: null,
    phoneVerified: false,
    npn,
    address: null,
    addressStreet: null,
    addressApt: null,
    addressCity: null,
    addressState: null,
    addressZip: null,
    agency,
    orgNodeId,
    approvalStatus,
    accountStatus: "active",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.doc(`users/${user.uid}`).set(payload);
  const { bumpUserCreated } = await import("./platform-stats");
  await bumpUserCreated(parseRole(role), approvalStatus === "pending");
  const after = await db.doc(`users/${user.uid}`).get();
  return { user: mapAdminUserRow(user.uid, after.data() ?? payload) };
});

export const adminUpdateUser = onCall(callableOpts, async (request) => {
  await requireAdminCaller(request, "adminUpdateUser", true);
  const targetUid = String(request.data?.uid ?? "").trim();
  if (!targetUid) throw new HttpsError("invalid-argument", "uid required");

  const userRef = db.doc(`users/${targetUid}`);
  const snap = await userRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "User not found.");
  if (String(snap.data()?.role ?? "") === "system") {
    throw new HttpsError(
      "permission-denied",
      "Cannot change a System user via Admin.",
    );
  }

  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  const authUpdates: { email?: string; displayName?: string } = {};

  if (typeof request.data?.displayName === "string") {
    const displayName = request.data.displayName.trim();
    updates.displayName = displayName || null;
    updates.displayNameLower = lowerOrNull(displayName);
    authUpdates.displayName = displayName || undefined;
  }
  if (typeof request.data?.email === "string") {
    const email = request.data.email.trim().toLowerCase();
    if (!email.includes("@")) {
      throw new HttpsError("invalid-argument", "Valid email required.");
    }
    updates.email = email;
    updates.emailLower = email;
    authUpdates.email = email;
  }
  if (typeof request.data?.role === "string") {
    const role = await assertAssignableRoleId(request.data.role);
    updates.role = role;
  }
  const prevRole = parseRole(snap.data()?.role);
  const prevApproval = snap.data()?.approvalStatus;
  if (typeof request.data?.npn === "string") {
    updates.npn = request.data.npn.trim() || null;
  }
  if (
    request.data?.approvalStatus === "pending" ||
    request.data?.approvalStatus === "approved" ||
    request.data?.approvalStatus === "rejected"
  ) {
    updates.approvalStatus = request.data.approvalStatus;
  }
  if ("orgNodeId" in (request.data ?? {})) {
    const orgNodeIdRaw = request.data?.orgNodeId;
    const orgNodeId =
      orgNodeIdRaw === null || orgNodeIdRaw === undefined || orgNodeIdRaw === ""
        ? null
        : String(orgNodeIdRaw).trim();
    if (orgNodeId) {
      const node = await db.doc(`orgNodes/${orgNodeId}`).get();
      if (!node.exists) throw new HttpsError("not-found", "Org node not found.");
      updates.orgNodeId = orgNodeId;
      if (typeof node.data()?.name === "string") {
        updates.agency = String(node.data()?.name);
      }
    } else {
      updates.orgNodeId = null;
    }
  }

  if (Object.keys(authUpdates).length > 0) {
    try {
      await admin.auth().updateUser(targetUid, authUpdates);
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code: unknown }).code)
          : "";
      if (code.includes("email-already-exists")) {
        throw new HttpsError("already-exists", "Email already registered.");
      }
      throw new HttpsError(
        "internal",
        error instanceof Error ? error.message : "Failed to update auth user.",
      );
    }
  }

  await userRef.update(updates);
  if (typeof updates.role === "string" && updates.role !== prevRole) {
    const { bumpUserRoleChange } = await import("./platform-stats");
    await bumpUserRoleChange(prevRole, parseRole(updates.role));
  }
  if (
    typeof updates.approvalStatus === "string" &&
    updates.approvalStatus !== prevApproval
  ) {
    const { bumpApprovalChange } = await import("./platform-stats");
    await bumpApprovalChange(
      typeof prevApproval === "string" ? prevApproval : undefined,
      updates.approvalStatus as "approved" | "rejected" | "pending",
    );
  }
  const after = await userRef.get();
  return { user: mapAdminUserRow(targetUid, after.data() ?? {}) };
});

async function countQuery(query: Query): Promise<number> {
  const snap = await query.count().get();
  return snap.data().count;
}

export const getAdminInsights = onCall(callableOpts, async (request) => {
  await requireAdminCaller(request, "getAdminInsights");

  const { getOverviewStats } = await import("./platform-stats");
  let stats = await getOverviewStats();
  // Cold start / empty counters: seed once from aggregations.
  if (stats.totalUsers === 0 && stats.orgNodes === 0) {
    const nonAnon = db.collection("users").where("isAnonymous", "==", false);
    const [totalUsers, pending, deactivated, pendingDeletion, orgNodes] =
      await Promise.all([
        countQuery(nonAnon),
        countQuery(
          db.collection("users").where("approvalStatus", "==", "pending"),
        ),
        countQuery(nonAnon.where("accountStatus", "==", "deactivated")).catch(
          () => 0,
        ),
        countQuery(
          nonAnon.where("accountStatus", "==", "pendingDeletion"),
        ).catch(() => 0),
        countQuery(db.collection("orgNodes")),
      ]);
    const byRole: Record<string, number> = {};
    await Promise.all(
      (ALL_ROLES as readonly UserRole[]).map(async (role) => {
        byRole[role] = await countQuery(
          db.collection("users").where("role", "==", role),
        );
      }),
    );
    stats = {
      totalUsers,
      byRole,
      pending,
      deactivated,
      pendingDeletion,
      orgNodes,
    };
    await db.doc("platformStats/overview").set(
      { ...stats, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  }

  const active = Math.max(
    0,
    stats.totalUsers - stats.deactivated - stats.pendingDeletion,
  );

  return {
    totalUsers: stats.totalUsers,
    byRole: Object.fromEntries(
      Object.entries(stats.byRole).filter(([, n]) => n > 0),
    ),
    pendingApprovals: stats.pending,
    active,
    deactivated: stats.deactivated,
    pendingDeletion: stats.pendingDeletion,
    orgNodeCount: stats.orgNodes,
  };
});
