import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  ALL_ROLES,
  canAccessAdmin,
  canManagePlatform,
  parseRole,
  type UserRole,
} from "@pulse/shared";
import { db, callableOpts } from "./init";
import { requireCaller } from "./auth";

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
  };
}

async function requireAdminCaller(
  request: { auth?: { uid: string } },
  operation: string,
  platformOnly = false,
): Promise<{ uid: string; role: UserRole }> {
  const uid = await requireCaller(request, operation);
  const snap = await db.doc(`users/${uid}`).get();
  const role = parseRole(snap.data()?.role);
  if (platformOnly ? !canManagePlatform(role) : !canAccessAdmin(role)) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  return { uid, role };
}

export const listUsersForAdmin = onCall(callableOpts, async (request) => {
  await requireAdminCaller(request, "listUsersForAdmin");
  const roleFilter = String(request.data?.role ?? "").trim();
  const approvalFilter = String(request.data?.approvalStatus ?? "").trim();
  const accountFilter = String(request.data?.accountStatus ?? "").trim();
  const orgNodeId = String(request.data?.orgNodeId ?? "").trim();
  const query = String(request.data?.query ?? "").trim().toLowerCase();
  const limit = Math.max(
    1,
    Math.min(200, Math.round(Number(request.data?.limit ?? 100))),
  );

  let snap;
  if (roleFilter && (ALL_ROLES as readonly string[]).includes(roleFilter)) {
    snap = await db
      .collection("users")
      .where("role", "==", roleFilter)
      .limit(Math.min(500, limit * 3))
      .get();
  } else if (orgNodeId) {
    snap = await db
      .collection("users")
      .where("orgNodeId", "==", orgNodeId)
      .limit(Math.min(500, limit * 3))
      .get();
  } else {
    snap = await db
      .collection("users")
      .where("isAnonymous", "==", false)
      .limit(Math.min(500, limit * 3))
      .get();
  }

  const users = snap.docs
    .map((doc) => mapAdminUserRow(doc.id, doc.data()))
    .filter((row) => {
      if (row.isAnonymous) return false;
      if (approvalFilter && row.approvalStatus !== approvalFilter) return false;
      if (accountFilter && row.accountStatus !== accountFilter) return false;
      if (orgNodeId && row.orgNodeId !== orgNodeId) return false;
      if (roleFilter && row.role !== roleFilter) return false;
      if (query) {
        const hay = `${row.displayName ?? ""} ${row.email ?? ""} ${row.npn ?? ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    })
    .slice(0, limit);

  return { users };
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
  return { ok: true };
});

export const getAdminInsights = onCall(callableOpts, async (request) => {
  await requireAdminCaller(request, "getAdminInsights");

  const [usersSnap, pendingSnap, orgSnap, recentSnap] = await Promise.all([
    db.collection("users").where("isAnonymous", "==", false).limit(500).get(),
    db
      .collection("users")
      .where("approvalStatus", "==", "pending")
      .limit(200)
      .get(),
    db.collection("orgNodes").limit(500).get(),
    db
      .collection("users")
      .where("isAnonymous", "==", false)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get()
      .catch(() => null),
  ]);

  const byRole: Record<string, number> = {};
  let active = 0;
  let deactivated = 0;
  let pendingDeletion = 0;
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const role = parseRole(data.role);
    byRole[role] = (byRole[role] ?? 0) + 1;
    const status = String(data.accountStatus ?? "active");
    if (status === "deactivated") deactivated += 1;
    else if (status === "pendingDeletion") pendingDeletion += 1;
    else active += 1;
  }

  const recentSource = recentSnap?.docs ?? usersSnap.docs.slice(0, 10);
  const recentRegistrations = recentSource.map((doc) => {
    const data = doc.data();
    const created = data.createdAt;
    const createdAt =
      created && typeof created.toMillis === "function"
        ? created.toMillis()
        : typeof created === "number"
          ? created
          : null;
    return {
      uid: doc.id,
      displayName:
        typeof data.displayName === "string" ? data.displayName : null,
      email: typeof data.email === "string" ? data.email : null,
      role: parseRole(data.role),
      createdAt,
    };
  });

  return {
    totalUsers: usersSnap.size,
    byRole,
    pendingApprovals: pendingSnap.size,
    active,
    deactivated,
    pendingDeletion,
    orgNodeCount: orgSnap.size,
    recentRegistrations,
  };
});
