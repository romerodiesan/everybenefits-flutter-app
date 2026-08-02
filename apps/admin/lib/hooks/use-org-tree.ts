"use client";

import { useCallback, useEffect, useState } from "react";
import type { OrgNode } from "@pulse/shared";
import { getAdminRepository } from "@/lib/repositories/admin-repository";

export function useOrgTree() {
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setNodes(await getAdminRepository().listOrgSubtree(null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orgs");
      setNodes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    nodes,
    loading,
    error,
    reload,
    ensureRoot: () => getAdminRepository().ensureOrgRoot(),
    createNode: (input: {
      name: string;
      type: OrgNode["type"];
      parentId: string;
    }) => getAdminRepository().createOrgNode(input),
    updateNode: (input: {
      id: string;
      name?: string;
      active?: boolean;
      managerUids?: string[];
    }) => getAdminRepository().updateOrgNode(input),
  };
}
