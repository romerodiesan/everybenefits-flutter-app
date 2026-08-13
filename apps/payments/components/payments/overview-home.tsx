"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/primitives";
import { KpiGridSkeleton } from "@/components/ui/data-table-skeleton";
import { usePaymentsOverview } from "@/lib/payments-queries";

type WorkflowStatus = "empty" | "needs_work" | "done";

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="studio-panel rounded-2xl px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function workflowTone(status: WorkflowStatus): string {
  if (status === "done") return "border-emerald-500/25 bg-emerald-500/[0.06]";
  if (status === "needs_work") return "border-amber-500/30 bg-amber-500/[0.07]";
  return "border-glass-border";
}

function workflowMetaKey(status: WorkflowStatus): string {
  if (status === "done") return "overviewStepDone";
  if (status === "needs_work") return "overviewStepNeedsWork";
  return "overviewStepEmpty";
}

export function OverviewHome() {
  const t = useTranslations();
  const {
    data = null,
    isLoading: loading,
    isFetching,
    isError: error,
    refetch,
  } = usePaymentsOverview();
  const refreshing = isFetching && !loading;

  const metrics = useMemo(() => {
    if (!data) return null;

    const carriersStep: WorkflowStatus =
      data.carriers.active === 0 ? "empty" : "done";

    const statementsStep: WorkflowStatus =
      data.statements.total === 0
        ? "empty"
        : data.statements.imported > 0
          ? "needs_work"
          : "done";

    let attention:
      | { key: string; count: number; href: string; cta: string }
      | null = null;
    if (data.statements.imported > 0) {
      attention = {
        key: "overviewAttentionImported",
        count: data.statements.imported,
        href: "/statements",
        cta: "overviewAttentionCtaStatements",
      };
    } else if (data.carriers.active === 0) {
      attention = {
        key: "overviewAttentionNoCarriers",
        count: 1,
        href: "/carriers",
        cta: "overviewAttentionCtaCarriers",
      };
    }

    return {
      activeCarrierCount: data.carriers.active,
      importedCount: data.statements.imported,
      statementTotal: data.statements.total,
      carriersStep,
      statementsStep,
      attention,
    };
  }, [data]);

  const workflow = metrics
    ? [
        {
          step: 1,
          href: "/carriers",
          title: t("overviewFlowCarriers"),
          body: t("overviewFlowCarriersHint"),
          status: metrics.carriersStep,
        },
        {
          step: 2,
          href: "/agencies",
          title: t("overviewFlowAgencies"),
          body: t("overviewFlowAgenciesHint"),
          status: "done" as WorkflowStatus,
        },
        {
          step: 3,
          href: "/statements",
          title: t("overviewFlowStatements"),
          body: t("overviewFlowStatementsHint"),
          status: metrics.statementsStep,
        },
        {
          step: 4,
          href: "/commission-runs",
          title: t("overviewFlowCommissionRuns"),
          body: t("overviewFlowCommissionRunsHint"),
          status: "empty" as WorkflowStatus,
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 lg:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
            {t("brandShort")}
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight lg:text-4xl">
            {t("overviewTitle")}
          </h1>
          <p className="text-sm text-muted lg:text-base">
            {t("overviewSubtitle")}
          </p>
        </div>
        {refreshing ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-brand/30 border-t-brand"
            aria-label={t("loading")}
          />
        ) : null}
      </header>

      {error ? (
        <div className="studio-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4">
          <p className="text-sm text-muted">{t("errorGeneric")}</p>
          <Button size="sm" variant="secondary" onClick={() => void refetch()}>
            {t("overviewRetry")}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <KpiGridSkeleton count={3} />
      ) : metrics ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            label={t("overviewKpiCarriers")}
            value={String(metrics.activeCarrierCount)}
            hint={t("overviewKpiCarriersHint")}
          />
          <Metric
            label={t("overviewKpiStatementsAction")}
            value={String(metrics.importedCount)}
            hint={t("overviewKpiStatementsActionHint")}
          />
          <Metric
            label={t("overviewKpiStatementsTotal")}
            value={String(metrics.statementTotal)}
            hint={t("overviewKpiStatementsTotalHint")}
          />
        </div>
      ) : null}

      {!loading && metrics?.attention ? (
        <Link
          href={metrics.attention.href}
          className="studio-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/25 bg-brand/[0.06] px-5 py-4 transition hover:bg-brand/[0.1]"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">
              {t("overviewAttention")}
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {t(metrics.attention.key, { count: metrics.attention.count })}
            </p>
          </div>
          <span className="text-sm font-semibold text-brand">
            {t(metrics.attention.cta)} →
          </span>
        </Link>
      ) : null}

      {!loading && metrics ? (
        <section className="space-y-3">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">
              {t("overviewFlowTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted">{t("overviewFlowHint")}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {workflow.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`studio-panel block rounded-2xl border p-4 transition hover:border-brand/40 ${workflowTone(item.status)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                    {t("overviewFlowStep", { step: item.step })}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    {t(workflowMetaKey(item.status))}
                  </span>
                </div>
                <p className="mt-2 font-display text-lg font-semibold tracking-tight">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {item.body}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {!loading ? (
        <section className="space-y-3">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">
              {t("overviewShortcuts")}
            </h2>
            <p className="mt-1 text-sm text-muted">{t("overviewShortcutsHint")}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/commission-runs"
              className="studio-panel block rounded-2xl p-4 transition hover:border-brand/40"
            >
              <p className="font-display text-base font-semibold">
                {t("navCommissionRuns")}
              </p>
              <p className="mt-1 text-xs text-muted">
                {t("overviewShortcutCommissionRuns")}
              </p>
            </Link>
            <Link
              href="/plans"
              className="studio-panel block rounded-2xl p-4 transition hover:border-brand/40"
            >
              <p className="font-display text-base font-semibold">
                {t("navPlans")}
              </p>
              <p className="mt-1 text-xs text-muted">
                {t("overviewShortcutPlans")}
              </p>
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
