import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { parseRole } from "@pulse/shared";
import { db, callableOpts } from "./init";
import { headlineName, requireCaller } from "./auth";
import { ensureAutoJoinMemberships } from "./chats";
import { loadPermissionsForUid, requirePermission } from "./permissions";
import {
  emptyBulkResult,
  finalizeBulkResult,
  parseBulkIds,
  type BulkResult,
} from "./bulk-helpers";

/**
 * Bulk approve / reject accounts (same effect as setUserApproval per uid).
 */
export const bulkSetUserApproval = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "bulkSetUserApproval");
  await requirePermission(actorUid, "admin.approvals.decide");
  const uids = parseBulkIds(request.data?.uids, "uids");
  const status = String(request.data?.status ?? "");
  if (
    status !== "approved" &&
    status !== "rejected" &&
    status !== "pending"
  ) {
    throw new HttpsError(
      "invalid-argument",
      "status must be approved, rejected, or pending",
    );
  }

  const result = emptyBulkResult();
  const { bumpApprovalChange } = await import("./platform-stats");

  for (const targetUid of uids) {
    try {
      const target = await db.doc(`users/${targetUid}`).get();
      if (!target.exists) {
        result.failed.push({
          id: targetUid,
          code: "not-found",
          message: "User not found.",
        });
        continue;
      }
      const prevApproval = target.data()?.approvalStatus;
      await db.doc(`users/${targetUid}`).update({
        approvalStatus: status,
        approvedBy: actorUid,
        approvedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await bumpApprovalChange(
        typeof prevApproval === "string" ? prevApproval : undefined,
        status as "approved" | "rejected" | "pending",
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
      }
      result.succeeded.push(targetUid);
    } catch (error) {
      result.failed.push({
        id: targetUid,
        code: "internal",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return finalizeBulkResult(result);
});

/**
 * Bulk role assignment (same rules as setUserRole per uid).
 */
export const bulkSetUserRole = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "bulkSetUserRole");
  await requirePermission(actorUid, "platform.manage");
  const uids = parseBulkIds(request.data?.uids, "uids");
  const roleRaw = String(request.data?.role ?? "").trim();
  if (!roleRaw) {
    throw new HttpsError("invalid-argument", "role required");
  }
  const { assertAssignableRoleId } = await import("./role-management");
  const { belongsInDefaultAgentGroup } = await import("@pulse/shared");
  const { addAgentToDefaultGroup } = await import("./chats");
  const role = await assertAssignableRoleId(roleRaw);

  const result = emptyBulkResult();
  const { bumpUserRoleChange, parseStoredRole } = await import(
    "./platform-stats"
  );

  for (const targetUid of uids) {
    try {
      const target = await db.doc(`users/${targetUid}`).get();
      if (!target.exists) {
        result.failed.push({
          id: targetUid,
          code: "not-found",
          message: "User not found.",
        });
        continue;
      }
      const currentRole = String(target.data()?.role ?? "");
      if (currentRole === "system") {
        result.failed.push({
          id: targetUid,
          code: "permission-denied",
          message: "Cannot change a System user via Admin.",
        });
        continue;
      }
      if (currentRole === "agent" && (role === "student" || role === "guest")) {
        result.failed.push({
          id: targetUid,
          code: "failed-precondition",
          message: "Cannot downgrade an agent to student or guest.",
        });
        continue;
      }

      await db.doc(`users/${targetUid}`).update({
        role,
        updatedAt: FieldValue.serverTimestamp(),
      });
      await bumpUserRoleChange(parseStoredRole(currentRole), parseRole(role));

      if (belongsInDefaultAgentGroup(role)) {
        await addAgentToDefaultGroup(targetUid, headlineName(target.data()));
      }

      const approvalStatus = String(
        target.data()?.approvalStatus ?? "approved",
      );
      await ensureAutoJoinMemberships(
        targetUid,
        parseRole(role),
        approvalStatus,
        headlineName({ ...target.data(), role }),
        target.data()?.isAnonymous === true,
      );
      result.succeeded.push(targetUid);
    } catch (error) {
      result.failed.push({
        id: targetUid,
        code: "internal",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return finalizeBulkResult(result);
});

/**
 * Bulk agency / org assignment (same as assignUserToOrgNode per uid).
 */
export const bulkAssignUsersToOrgNode = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "bulkAssignUsersToOrgNode");
  const { permissions } = await loadPermissionsForUid(actorUid);
  const { canManagePlatform } = await import("@pulse/shared");
  if (!canManagePlatform(permissions)) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }

  const uids = parseBulkIds(request.data?.uids, "uids");
  const orgNodeIdRaw = request.data?.orgNodeId;
  const orgNodeId =
    orgNodeIdRaw === null || orgNodeIdRaw === undefined || orgNodeIdRaw === ""
      ? null
      : String(orgNodeIdRaw).trim() || null;

  let agencyName: string | null = null;
  if (orgNodeId) {
    const node = await db.doc(`orgNodes/${orgNodeId}`).get();
    if (!node.exists) {
      throw new HttpsError("not-found", "Org node not found.");
    }
    if (node.data()?.active === false) {
      throw new HttpsError("failed-precondition", "Org node is inactive.");
    }
    if (typeof node.data()?.name === "string") {
      agencyName = String(node.data()?.name);
    }
  }

  const result = emptyBulkResult();

  for (const targetUid of uids) {
    try {
      const userRef = db.doc(`users/${targetUid}`);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        result.failed.push({
          id: targetUid,
          code: "not-found",
          message: "User not found.",
        });
        continue;
      }
      const updates: Record<string, unknown> = {
        orgNodeId,
        agency: agencyName,
        updatedAt: FieldValue.serverTimestamp(),
      };
      await userRef.update(updates);
      result.succeeded.push(targetUid);
    } catch (error) {
      result.failed.push({
        id: targetUid,
        code: "internal",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return finalizeBulkResult(result);
});

/**
 * Bulk deactivate / reactivate accounts (platform.manage).
 */
export const bulkSetUserAccountStatus = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "bulkSetUserAccountStatus");
  const { permissions } = await loadPermissionsForUid(actorUid);
  const { canManagePlatform } = await import("@pulse/shared");
  if (!canManagePlatform(permissions)) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }

  const uids = parseBulkIds(request.data?.uids, "uids");
  const status = String(request.data?.status ?? "");
  if (status !== "active" && status !== "deactivated") {
    throw new HttpsError("invalid-argument", "status must be active or deactivated");
  }

  const result = emptyBulkResult();
  const { bumpAccountStatusChange } = await import("./platform-stats");

  for (const targetUid of uids) {
    try {
      if (targetUid === actorUid && status === "deactivated") {
        result.failed.push({
          id: targetUid,
          code: "failed-precondition",
          message: "Cannot deactivate yourself.",
        });
        continue;
      }
      const userRef = db.doc(`users/${targetUid}`);
      const snap = await userRef.get();
      if (!snap.exists) {
        result.failed.push({
          id: targetUid,
          code: "not-found",
          message: "User not found.",
        });
        continue;
      }
      const current =
        snap.data()?.accountStatus === "deactivated" ||
        snap.data()?.accountStatus === "pendingDeletion"
          ? String(snap.data()?.accountStatus)
          : "active";

      if (status === "deactivated") {
        if (current === "pendingDeletion") {
          result.failed.push({
            id: targetUid,
            code: "failed-precondition",
            message: "Deletion already requested.",
          });
          continue;
        }
        if (current === "deactivated") {
          result.succeeded.push(targetUid);
          continue;
        }
        await userRef.update({
          accountStatus: "deactivated",
          deactivatedAt: FieldValue.serverTimestamp(),
          deactivatedBy: actorUid,
          updatedAt: FieldValue.serverTimestamp(),
        });
        await bumpAccountStatusChange(current, "deactivated");
        const tokens = await db
          .collection(`users/${targetUid}/fcmTokens`)
          .limit(50)
          .get();
        await Promise.all(tokens.docs.map((doc) => doc.ref.delete()));
      } else {
        if (current !== "deactivated") {
          result.failed.push({
            id: targetUid,
            code: "failed-precondition",
            message: "Account is not deactivated.",
          });
          continue;
        }
        await userRef.update({
          accountStatus: "active",
          deactivatedAt: FieldValue.delete(),
          deactivatedBy: FieldValue.delete(),
          reactivatedBy: actorUid,
          updatedAt: FieldValue.serverTimestamp(),
        });
        await bumpAccountStatusChange("deactivated", "active");
      }
      result.succeeded.push(targetUid);
    } catch (error) {
      result.failed.push({
        id: targetUid,
        code: "internal",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return finalizeBulkResult(result);
});

/**
 * Bulk soft-activate / deactivate org nodes (platform.manage).
 */
export const bulkSetOrgNodesActive = onCall(callableOpts, async (request) => {
  const actorUid = await requireCaller(request, "bulkSetOrgNodesActive");
  const { permissions } = await loadPermissionsForUid(actorUid);
  const { canManagePlatform } = await import("@pulse/shared");
  if (!canManagePlatform(permissions)) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }

  const ids = parseBulkIds(request.data?.ids, "ids");
  if (typeof request.data?.active !== "boolean") {
    throw new HttpsError("invalid-argument", "active boolean required");
  }
  const active = request.data.active as boolean;

  const result: BulkResult = emptyBulkResult();

  for (const id of ids) {
    try {
      const ref = db.doc(`orgNodes/${id}`);
      const snap = await ref.get();
      if (!snap.exists) {
        result.failed.push({
          id,
          code: "not-found",
          message: "Org node not found.",
        });
        continue;
      }
      await ref.update({
        active,
        updatedAt: FieldValue.serverTimestamp(),
      });
      result.succeeded.push(id);
    } catch (error) {
      result.failed.push({
        id,
        code: "internal",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return finalizeBulkResult(result);
});
