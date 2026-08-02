"use client";

import { useEffect, useState } from "react";
import type { AdminInsights } from "@pulse/firebase-web";
import { getAdminRepository } from "@/lib/repositories/admin-repository";

export function useAdminInsights() {
  const [insights, setInsights] = useState<AdminInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminRepository()
      .getInsights()
      .then(setInsights)
      .catch(() => setInsights(null))
      .finally(() => setLoading(false));
  }, []);

  return { insights, loading };
}
