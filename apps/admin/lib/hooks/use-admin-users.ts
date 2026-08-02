"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminUserRow } from "@pulse/firebase-web";
import type { UserRole } from "@pulse/shared";
import { getAdminRepository } from "@/lib/repositories/admin-repository";

export function useAdminUsers(filters?: {
  role?: UserRole | "";
  approvalStatus?: string;
  accountStatus?: string;
  orgNodeId?: string;
  query?: string;
}) {
  const role = filters?.role;
  const approvalStatus = filters?.approvalStatus;
  const accountStatus = filters?.accountStatus;
  const orgNodeId = filters?.orgNodeId;
  const query = filters?.query;

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(
        await getAdminRepository().listUsers({
          role,
          approvalStatus,
          accountStatus,
          orgNodeId,
          query,
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [role, approvalStatus, accountStatus, orgNodeId, query]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    users,
    loading,
    reload,
    deactivate: (uid: string) => getAdminRepository().deactivateUser(uid),
    reactivate: (uid: string) => getAdminRepository().reactivateUser(uid),
  };
}
