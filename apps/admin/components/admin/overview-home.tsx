"use client";

import { useTranslations } from "next-intl";
import { useAdminInsights } from "@/lib/hooks/use-admin-insights";
import { headlineName } from "@/lib/roles";

export function OverviewHome() {
  const t = useTranslations();
  const { insights, loading } = useAdminInsights();

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

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-white/[0.05]"
            />
          ))}
        </div>
      ) : !insights ? (
        <p className="text-sm text-muted">{t("overviewEmpty")}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="studio-panel rounded-2xl p-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {kpi.label}
                </p>
                <p className="mt-2 font-display text-3xl font-bold">
                  {kpi.value ?? 0}
                </p>
              </div>
            ))}
          </div>

          <section className="studio-panel rounded-2xl p-5">
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

          <section className="studio-panel rounded-2xl p-5">
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
                      <p className="truncate text-muted">{row.email ?? t("none")}</p>
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
