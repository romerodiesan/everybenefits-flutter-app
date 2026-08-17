/**
 * Single authz entry for Gen2 callables.
 * One users/{uid} read + optional roles/{id} read; quota is skippable for
 * cheap list/get handlers (see skipQuota).
 */
import { FieldValue, Timestamp, type DocumentData } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { hasPermission } from "@pulse/shared";
import { db } from "./init";
import { MAX_FUNCTION_CALLS_PER_MINUTE } from "./constants";
import { loadPermissionsForRole } from "./permissions";

export type Actor = {
  uid: string;
  role: string;
  permissions: string[];
  userData: DocumentData | undefined;
};

export type RequireActorOptions = {
  allowInactive?: boolean;
  /** Skip the functionUsage write (read-only / high-frequency callables). */
  skipQuota?: boolean;
  /** Any of these keys, or platform.manage, grants access. */
  permission?: string | string[];
};

export function actorHasPermission(
  permissions: readonly string[],
  key: string | string[],
): boolean {
  if (hasPermission(permissions, "platform.manage")) return true;
  const keys = Array.isArray(key) ? key : [key];
  return keys.some((k) => hasPermission(permissions, k));
}

export async function consumeFunctionQuota(uid: string, operation: string) {
  const minute = Math.floor(Date.now() / 60_000);
  const ref = db.doc(`functionUsage/${uid}_${minute}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = Number(snap.data()?.count ?? 0);
    if (count >= MAX_FUNCTION_CALLS_PER_MINUTE) {
      throw new HttpsError("resource-exhausted", "Too many requests.");
    }
    tx.set(
      ref,
      {
        uid,
        minute,
        count: count + 1,
        operations: FieldValue.arrayUnion(operation),
        expiresAt: Timestamp.fromMillis((minute + 2) * 60_000),
      },
      { merge: true },
    );
  });
}

function assertAccountActive(data: DocumentData | undefined) {
  const status = String(data?.accountStatus ?? "active");
  if (status === "deactivated" || status === "pendingDeletion") {
    throw new HttpsError(
      "failed-precondition",
      "Account is deactivated or pending deletion.",
    );
  }
}

export async function requireActor(
  request: { auth?: { uid: string } },
  operation: string,
  options?: RequireActorOptions,
): Promise<Actor> {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const skipQuota =
    options?.skipQuota ??
    /^(list|get|search|count|watch|preview)/i.test(operation);
  if (!skipQuota) {
    await consumeFunctionQuota(uid, operation);
  }

  const snap = await db.doc(`users/${uid}`).get();
  const userData = snap.data();
  if (!options?.allowInactive) {
    assertAccountActive(userData);
  }

  const role = String(userData?.role ?? "student");
  if (userData?.isAnonymous === true) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const permissions = await loadPermissionsForRole(role);
  const actor: Actor = { uid, role, permissions, userData };

  if (options?.permission && !actorHasPermission(permissions, options.permission)) {
    throw new HttpsError("permission-denied", "Missing required permission.");
  }
  return actor;
}

/** Auth + quota + active account; no permission key required. */
export async function requireCaller(
  request: { auth?: { uid: string } },
  operation: string,
  options?: { allowInactive?: boolean; skipQuota?: boolean },
): Promise<string> {
  const actor = await requireActor(request, operation, options);
  return actor.uid;
}
