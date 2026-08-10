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
  if (status !== "approved" && status !== "rejected") {
    throw new HttpsError("invalid-argument", "status must be approved or rejected");
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
        status,
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
