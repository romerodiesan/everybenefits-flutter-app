import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { parseRole } from "@pulse/shared";
import { db, callableOpts } from "./init";
import { headlineName } from "./auth";
import { requireActor } from "./guards";
import { ensureAutoJoinMemberships } from "./chats";
import {
  actorCanManageRole,
  assertActorCanManageCurrentRole,
  assertAssignableRoleForActor,
} from "./role-management";

/**
 * Admin-only role assignment.
 * Eligible roles join the default Team group through the shared auto-join path.
 * The `system` role cannot be assigned via this callable.
 */
export const setUserRole = onCall(callableOpts, async (request) => {
  const actor = await requireActor(request, "setUserRole", {
    permission: "platform.manage",
  });
  const targetUid = String(request.data?.uid ?? "");
  const roleRaw = String(request.data?.role ?? "").trim();
  if (!targetUid || !roleRaw) {
    throw new HttpsError("invalid-argument", "uid and valid role required");
  }

  if (targetUid === actor.uid) {
    throw new HttpsError("permission-denied", "Cannot change your own role.");
  }

  const target = await db.doc(`users/${targetUid}`).get();
  if (!target.exists) {
    throw new HttpsError("not-found", "User not found.");
  }
  const currentRole = String(target.data()?.role ?? "");
  await assertActorCanManageCurrentRole(actor, currentRole || "student");
  const role = await assertAssignableRoleForActor(actor, roleRaw);
  if (currentRole === "agent" && role === "student") {
    throw new HttpsError(
      "failed-precondition",
      "Cannot downgrade an agent to student.",
    );
  }

  await db.doc(`users/${targetUid}`).update({
    role,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const { bumpUserRoleChange, parseStoredRole } = await import(
    "./platform-stats"
  );
  await bumpUserRoleChange(parseStoredRole(currentRole), parseRole(role));

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
  const actor = await requireActor(request, "setUserApproval", {
    permission: "admin.approvals.decide",
  });
  const targetUid = String(request.data?.uid ?? "");
  const status = String(request.data?.status ?? "");
  if (!targetUid || (status !== "approved" && status !== "rejected")) {
    throw new HttpsError("invalid-argument", "uid and status required");
  }
  if (targetUid === actor.uid) {
    throw new HttpsError("permission-denied", "Cannot approve your own account.");
  }
  const target = await db.doc(`users/${targetUid}`).get();
  if (!target.exists) {
    throw new HttpsError("not-found", "User not found.");
  }
  await assertActorCanManageCurrentRole(
    actor,
    String(target.data()?.role ?? "student"),
  );
  const prevApproval = target.data()?.approvalStatus;
  await db.doc(`users/${targetUid}`).update({
    approvalStatus: status,
    approvedBy: actor.uid,
    approvedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const { bumpApprovalChange } = await import("./platform-stats");
  await bumpApprovalChange(
    typeof prevApproval === "string" ? prevApproval : undefined,
    status as "approved" | "rejected",
  );
  if (status === "approved") {
    const data = target.data();
    await ensureAutoJoinMemberships(
      targetUid,
      parseRole(data?.role),
      "approved",
      headlineName(data),
      data?.isAnonymous === true,
    );
    const { syncAgentParticipantSafe } = await import(
      "./payments-participants-sync"
    );
    await syncAgentParticipantSafe(targetUid, {
      ...(data ?? {}),
      approvalStatus: "approved",
    });
  }
  return { ok: true, uid: targetUid, status };
});

/** Admin/manager directory of users awaiting approval. */
export const listPendingApprovals = onCall(callableOpts, async (request) => {
  const actor = await requireActor(
    request,
    "listPendingApprovals",
    { permission: "admin.approvals.read" },
  );
  const snap = await db
    .collection("users")
    .where("approvalStatus", "==", "pending")
    .limit(100)
    .get();
  const manageableByRole = new Map<string, Promise<boolean>>();
  const canManage = (role: string) => {
    let pending = manageableByRole.get(role);
    if (!pending) {
      pending = actorCanManageRole(actor, role);
      manageableByRole.set(role, pending);
    }
    return pending;
  };
  const manageable = await Promise.all(
    snap.docs.map(async (doc) => {
      const role = String(doc.data()?.role ?? "student");
      return {
        doc,
        allowed:
          doc.id !== actor.uid &&
          doc.data()?.isAnonymous !== true &&
          (await canManage(role)),
      };
    }),
  );
  const users = manageable
    .filter(({ allowed }) => allowed)
    .map(({ doc }) => {
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
  await requireActor(
    request,
    "listStudentsForPromotion",
    { permission: "admin.users.read" },
  );

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
