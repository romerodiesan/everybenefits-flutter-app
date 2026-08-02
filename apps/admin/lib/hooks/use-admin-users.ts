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
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await getAdminRepository().listUsers(filters));
    } finally {
      setLoading(false);
    }
  }, [
    filters?.role,
    filters?.approvalStatus,
    filters?.accountStatus,
    filters?.orgNodeId,
    filters?.query,
  ]);

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
