import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { ALL_ROLES, belongsInDefaultAgentGroup, parseRole } from "@pulse/shared";
import { db, callableOpts } from "./init";
import { headlineName, requireCaller } from "./auth";
import {
  addAgentToDefaultGroup,
  ensureAutoJoinMemberships,
} from "./chats";

/**
 * Admin-only role assignment.
 * Staff roles (agent / instructor / manager / admin) join the default group.
 */
export const setUserRole = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "setUserRole");
  const targetUid = String(request.data?.uid ?? "");
  const role = String(request.data?.role ?? "");
  if (!targetUid || !(ALL_ROLES as readonly string[]).includes(role)) {
    throw new HttpsError("invalid-argument", "uid and valid role required");
  }

  const actor = await db.doc(`users/${actorUid}`).get();
  if (actor.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admins only.");
  }

  const target = await db.doc(`users/${targetUid}`).get();
  if (!target.exists) {
    throw new HttpsError("not-found", "User not found.");
  }
  const currentRole = String(target.data()?.role ?? "");
  if (currentRole === "agent" && (role === "student" || role === "guest")) {
    throw new HttpsError(
      "failed-precondition",
      "Cannot downgrade an agent to student or guest.",
    );
  }

  await db.doc(`users/${targetUid}`).update({
    role,
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (belongsInDefaultAgentGroup(parseRole(role))) {
    await addAgentToDefaultGroup(targetUid, headlineName(target.data()));
  }

  const approvalStatus = String(target.data()?.approvalStatus ?? "approved");
  await ensureAutoJoinMemberships(
    targetUid,
    parseRole(role),
    approvalStatus,
    headlineName({ ...target.data(), role }),
    target.data()?.isAnonymous === true,
  );

  return { ok: true, uid: targetUid, role };
});

/**
 * Admin or manager: approve / reject newly registered accounts.
 * Legacy users without approvalStatus are already treated as approved.
 */
export const setUserApproval = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "setUserApproval");
  const targetUid = String(request.data?.uid ?? "");
  const status = String(request.data?.status ?? "");
  if (!targetUid || (status !== "approved" && status !== "rejected")) {
    throw new HttpsError("invalid-argument", "uid and status required");
  }
  const actor = await db.doc(`users/${actorUid}`).get();
  const actorRole = parseRole(actor.data()?.role);
  if (actorRole !== "admin" && actorRole !== "manager") {
    throw new HttpsError("permission-denied", "Admins and managers only.");
  }
  const target = await db.doc(`users/${targetUid}`).get();
  if (!target.exists) {
    throw new HttpsError("not-found", "User not found.");
  }
  await db.doc(`users/${targetUid}`).update({
    approvalStatus: status,
    approvedBy: actorUid,
    approvedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  if (status === "approved") {
    const data = target.data();
    await ensureAutoJoinMemberships(
      targetUid,
      parseRole(data?.role),
      "approved",
      headlineName(data),
      data?.isAnonymous === true,
    );
  }
  return { ok: true, uid: targetUid, status };
});

/** Admin/manager directory of users awaiting approval. */
export const listPendingApprovals = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "listPendingApprovals");
  const actor = await db.doc(`users/${actorUid}`).get();
  const actorRole = parseRole(actor.data()?.role);
  if (actorRole !== "admin" && actorRole !== "manager") {
    throw new HttpsError("permission-denied", "Admins and managers only.");
  }
  const snap = await db
    .collection("users")
    .where("approvalStatus", "==", "pending")
    .limit(100)
    .get();
  const users = snap.docs
    .filter((doc) => doc.id !== actorUid && doc.data()?.isAnonymous !== true)
    .map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: typeof data.email === "string" ? data.email : null,
        displayName:
          typeof data.displayName === "string" ? data.displayName : null,
        photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
        role: String(data.role ?? "student"),
        profileCompleted: data.profileCompleted !== false,
        agency: typeof data.agency === "string" ? data.agency : null,
        approvalStatus: "pending",
      };
    });
  return { users };
});

/**
 * Admin-only directory of students awaiting promotion.
 * Uses Admin SDK so the client does not need a fragile users list rule.
 */
export const listStudentsForPromotion = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "listStudentsForPromotion");

  const actor = await db.doc(`users/${actorUid}`).get();
  if (actor.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admins only.");
  }

  const snap = await db
    .collection("users")
    .where("role", "==", "student")
    .limit(120)
    .get();

  const students = snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: typeof data.email === "string" ? data.email : null,
        displayName:
          typeof data.displayName === "string" ? data.displayName : null,
        photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
        role: "student",
        isAnonymous: data.isAnonymous === true,
        profileCompleted: data.profileCompleted !== false,
      };
    })
    .filter((row) => row.isAnonymous !== true);

  return { students };
});
