import { FieldPath, type DocumentData } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { hasPermission } from "@pulse/shared";
import { callableOpts, db, rtdb } from "./init";
import { requireActor } from "./guards";
import { loadPermissionsForRole } from "./permissions";

export function accountCanUseChats(
  data: DocumentData | undefined,
  permissions: readonly string[],
): boolean {
  if (!data || data.isAnonymous === true) return false;
  const account = String(data.accountStatus ?? "active");
  const approval = String(data.approvalStatus ?? "approved");
  return (
    account !== "deactivated" &&
    account !== "pendingDeletion" &&
    approval === "approved" &&
    hasPermission(permissions, "chats.participate")
  );
}

export async function syncChatAccessForUser(
  uid: string,
  data?: DocumentData,
): Promise<boolean> {
  const profile = data ?? (await db.doc(`users/${uid}`).get()).data();
  const role = String(profile?.role ?? "student");
  const permissions = await loadPermissionsForRole(role);
  const allowed = accountCanUseChats(profile, permissions);
  await rtdb.ref(`chatAccess/${uid}`).set(allowed);
  return allowed;
}

/** Live mirror consumed by RTDB rules, including account approval/status. */
export const syncUserChatAccess = onDocumentWritten(
  "users/{uid}",
  async (event) => {
    const uid = event.params.uid;
    const data = event.data?.after.exists
      ? event.data.after.data()
      : undefined;
    await syncChatAccessForUser(uid, data);
  },
);

/** Permission revocations on a role immediately propagate to its users. */
export const syncRoleChatAccess = onDocumentWritten(
  "roles/{roleId}",
  async (event) => {
    const roleId = event.params.roleId;
    const permissions = await loadPermissionsForRole(roleId);
    const users = await db.collection("users").where("role", "==", roleId).get();
    const updates: Record<string, boolean> = {};
    for (const user of users.docs) {
      updates[`chatAccess/${user.id}`] = accountCanUseChats(
        user.data(),
        permissions,
      );
    }
    if (Object.keys(updates).length > 0) await rtdb.ref().update(updates);
  },
);

/** Paginated migration for users that predate the RTDB chat-access mirror. */
export const backfillChatAccess = onCall(callableOpts, async (request) => {
  await requireActor(request, "backfillChatAccess", {
    permission: "platform.manage",
  });
  const requestedLimit = Math.round(Number(request.data?.limit ?? 500));
  const limit = Math.max(1, Math.min(500, requestedLimit));
  const cursor = String(request.data?.cursor ?? "").trim();
  let query = db
    .collection("users")
    .orderBy(FieldPath.documentId())
    .limit(limit);
  if (cursor) query = query.startAfter(cursor);
  const users = await query.get();
  const permissionsByRole = new Map<string, string[]>();
  const updates: Record<string, boolean> = {};
  for (const user of users.docs) {
    const data = user.data();
    const role = String(data.role ?? "student");
    let permissions = permissionsByRole.get(role);
    if (!permissions) {
      permissions = await loadPermissionsForRole(role);
      permissionsByRole.set(role, permissions);
    }
    updates[`chatAccess/${user.id}`] = accountCanUseChats(data, permissions);
  }
  if (Object.keys(updates).length > 0) await rtdb.ref().update(updates);
  return {
    processed: users.size,
    nextCursor: users.size === limit ? users.docs.at(-1)?.id ?? null : null,
  };
});

/**
 * Repairs the signed-in member's RTDB authorization mirror on app startup.
 * This makes the chat rollout safe for accounts created before chatAccess.
 */
export const refreshMyChatAccess = onCall(callableOpts, async (request) => {
  const actor = await requireActor(request, "refreshMyChatAccess", {
    permission: "chats.participate",
    skipQuota: true,
  });
  const allowed = await syncChatAccessForUser(actor.uid, actor.userData);
  return { allowed };
});
