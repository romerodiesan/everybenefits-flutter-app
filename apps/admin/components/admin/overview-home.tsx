"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth, useAccess } from "@/lib/providers/auth-provider";
import { canManagePlatform, headlineName } from "@/lib/roles";
import { ALL_ROLES, type UserRole } from "@/lib/types";
import { KpiGridSkeleton } from "@/components/ui/data-table-skeleton";
import { useAdminInsightsQuery } from "@/lib/hooks/use-admin-queries";

const ROLE_KEYS: Record<UserRole, string> = {
  guest: "roleGuest",
  student: "roleStudent",
  agent: "roleAgent",
  agency_owner: "roleAgencyOwner",
  instructor: "roleInstructor",
  manager: "roleManager",
  admin: "roleAdmin",
  system: "roleSystem",
};

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="studio-panel rounded-2xl px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-bold tracking-tight">
        {value.toLocaleString()}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function WorkspaceLink({
  href,
  title,
  body,
  meta,
  accent,
}: {
  href: string;
  title: string;
  body: string;
  meta?: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group studio-panel block rounded-2xl p-5 transition hover:bg-ink/[0.03] dark:hover:bg-white/[0.04] ${
        accent ? "ring-1 ring-brand/35" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold tracking-tight">
            {title}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
        </div>
        <span
          aria-hidden
          className="mt-1 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand"
        >
          →
        </span>
      </div>
      {meta ? (
        <p
          className={`mt-4 text-xs font-semibold uppercase tracking-[0.12em] ${
            accent ? "text-brand" : "text-muted"
          }`}
        >
          {meta}
        </p>
      ) : null}
    </Link>
  );
}

export function OverviewHome() {
  const t = useTranslations();
  const { profile } = useAuth();
  const { data: insights, isLoading, isFetching } = useAdminInsightsQuery();
  const access = useAccess();
  const isAdmin = canManagePlatform(access);
  const name = profile ? headlineName(profile) : "";

  const roleRows = useMemo(() => {
    if (!insights) return [];
    const total = Math.max(1, insights.totalUsers);
    return ALL_ROLES.map((role) => {
      const count = insights.byRole[role] ?? 0;
      return {
        role,
        count,
        pct: Math.round((count / total) * 100),
      };
    }).filter((row) => row.count > 0);
  }, [insights]);

  const pending = insights?.pendingApprovals ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
            {t("brand")}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {name
              ? t("overviewHello", { name: name.split(" ")[0] ?? name })
              : t("overviewTitle")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {t("overviewSubtitle")}
          </p>
        </div>
        {isFetching && !isLoading ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-brand/30 border-t-brand"
            aria-label="Refreshing"
          />
        ) : null}
      </header>

      {pending > 0 ? (
        <Link
          href="/approvals"
          className="studio-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/25 bg-brand/[0.06] px-5 py-4 transition hover:bg-brand/[0.1]"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">
              {t("overviewAttention")}
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {t("overviewPendingBanner", { count: pending })}
            </p>
          </div>
          <span className="text-sm font-semibold text-brand">
            {t("overviewReviewApprovals")} →
          </span>
        </Link>
      ) : null}

      {isLoading ? (
        <KpiGridSkeleton count={3} />
      ) : !insights ? (
        <p className="text-sm text-muted">{t("overviewEmpty")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            label={t("kpiTotalUsers")}
            value={insights.totalUsers}
            hint={t("overviewUsersHint", { active: insights.active })}
          />
          <Metric
            label={t("kpiPending")}
            value={insights.pendingApprovals}
            hint={t("overviewPendingHint")}
          />
          <Metric
            label={t("kpiOrgNodes")}
            value={insights.orgNodeCount}
            hint={t("overviewOrgHint")}
          />
        </div>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {t("overviewWorkspace")}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("overviewWorkspaceHint")}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <WorkspaceLink
            href="/users"
            title={t("navUsers")}
            body={t("overviewLinkUsers")}
          />
          <WorkspaceLink
            href="/organizations"
            title={t("navOrganizations")}
            body={t("overviewLinkOrgs")}
          />
          <WorkspaceLink
            href="/approvals"
            title={t("navApprovals")}
            body={t("overviewLinkApprovals")}
            meta={
              pending > 0
                ? t("overviewPendingMeta", { count: pending })
                : t("overviewApprovalsClear")
            }
            accent={pending > 0}
          />
          {isAdmin ? (
            <WorkspaceLink
              href="/settings"
              title={t("navSettings")}
              body={t("overviewLinkSettings")}
            />
          ) : null}
        </div>
      </section>

      {insights && roleRows.length > 0 ? (
        <section className="studio-panel rounded-2xl p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight">
                {t("overviewByRole")}
              </h2>
              <p className="mt-1 text-xs text-muted">{t("overviewByRoleHint")}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {roleRows.map((row) => (
              <div key={row.role} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3">
                <span className="truncate text-sm font-medium">
                  {t(ROLE_KEYS[row.role])}
                </span>
                <div className="h-2 overflow-hidden rounded-full bg-ink/[0.06] dark:bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-brand/80"
                    style={{ width: `${Math.max(row.pct, row.count > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className="text-right font-display text-sm font-bold">
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
