"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getAdminInsights } from "@/lib/firebase/functions";
import type { AdminInsights } from "@/lib/types";
import { headlineName } from "@pulse/shared";
import { ListRowSkeleton, Skeleton } from "@pulse/ui";

export function OverviewHome() {
  const t = useTranslations();
  const [insights, setInsights] = useState<AdminInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getAdminInsights()
      .then(setInsights)
      .catch(() => setInsights(null))
      .finally(() => {
        setLoading(false);
        setReady(true);
      });
  }, []);

  const kpis = [
    { label: t("kpiTotalUsers"), value: insights?.totalUsers },
    { label: t("kpiPending"), value: insights?.pendingApprovals },
    { label: t("kpiActive"), value: insights?.active },
    { label: t("kpiDeactivated"), value: insights?.deactivated },
    { label: t("kpiOrgNodes"), value: insights?.orgNodeCount },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {t("overviewTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("overviewSubtitle")}</p>
      </header>

      {loading || !ready ? (
        <div className="space-y-6" aria-busy>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="admin-panel space-y-3 rounded-2xl p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
          <div className="admin-panel space-y-3 rounded-2xl p-5">
            <Skeleton className="h-3 w-28" />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          </div>
          <div className="admin-panel rounded-2xl p-5">
            <Skeleton className="mb-4 h-3 w-36" />
            <ListRowSkeleton rows={5} />
          </div>
        </div>
      ) : !insights ? (
        <p className="text-sm text-muted">{t("overviewEmpty")}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="admin-panel rounded-2xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {kpi.label}
                </p>
                <p className="mt-2 font-display text-3xl font-bold">
                  {kpi.value ?? 0}
                </p>
              </div>
            ))}
          </div>

          <section className="admin-panel rounded-2xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">
              {t("overviewByRole")}
            </h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(insights.byRole).map(([role, count]) => (
                <div
                  key={role}
                  className="flex items-center justify-between rounded-xl bg-ink/[0.035] px-3 py-2 dark:bg-white/[0.04]"
                >
                  <span className="text-sm font-medium capitalize">{role}</span>
                  <span className="font-display text-lg font-bold">{count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-panel rounded-2xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">
              {t("overviewRecent")}
            </h2>
            <ul className="mt-4 divide-y divide-glass-border">
              {insights.recentRegistrations.length === 0 ? (
                <li className="py-3 text-sm text-muted">{t("none")}</li>
              ) : (
                insights.recentRegistrations.map((row) => (
                  <li
                    key={row.uid}
                    className="flex items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {headlineName({
                          displayName: row.displayName,
                          email: row.email,
                          isAnonymous: false,
                        })}
                      </p>
                      <p className="truncate text-muted">
                        {row.email ?? t("none")}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                      {row.role}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
