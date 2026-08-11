import {
  callCloudFunction,
  FunctionsUnavailableError,
  mapAdminUserRow,
} from "@pulse/firebase-web";
import type { UserProfile } from "../types";
import { getFirebaseFunctions } from "./client";

export async function setUserApproval(
  uid: string,
  status: "approved" | "rejected",
) {
  await callCloudFunction(getFirebaseFunctions(), "setUserApproval", {
    uid,
    status,
  });
}

export async function bulkSetUserApproval(
  uids: string[],
  status: "pending" | "approved" | "rejected",
) {
  return await callCloudFunction<{
    ok: boolean;
    succeeded: string[];
    failed: Array<{ id: string; code: string; message: string }>;
  }>(getFirebaseFunctions(), "bulkSetUserApproval", { uids, status });
}

export async function listPendingApprovals(): Promise<UserProfile[]> {
  try {
    const data = await callCloudFunction<{
      users?: Array<Record<string, unknown>>;
    }>(getFirebaseFunctions(), "listPendingApprovals", {});
    return (data?.users ?? []).map(mapAdminUserRow).filter((p) => p.uid) as UserProfile[];
  } catch (error) {
    if (error instanceof FunctionsUnavailableError) return [];
    throw error;
  }
}
