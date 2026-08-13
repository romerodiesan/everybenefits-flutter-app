"use client";

import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { getCommissionRun } from "@/lib/firebase/functions";

export default function CommissionRunDetailPage() {
  const t = useTranslations();
  const params = useParams<{ runId: string }>();
  const runId = params.runId;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["commissionRun", runId],
    queryFn: () => getCommissionRun(runId),
    enabled: Boolean(runId),
  });

  const run = data?.run;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-10">
      <Link
        href="/commission-runs"
        className="text-sm text-muted underline-offset-2 hover:underline"
      >
        ← {t("commissionRunsTitle")}
      </Link>

      {isError ? (
        <p className="text-sm text-red-600">{t("errorGeneric")}</p>
      ) : null}
      {isLoading || !run ? (
        <p className="text-sm text-muted">{t("loading")}</p>
      ) : (
        <>
          <header>
            <p className="text-xs uppercase tracking-wide text-muted">
              {run.status}
            </p>
            <h1 className="font-display text-3xl font-bold">{run.name}</h1>
            <p className="mt-2 text-sm text-muted">
              {run.periodStart} → {run.periodEnd}
            </p>
          </header>
          <div className="studio-panel grid gap-4 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted">{t("commissionRunsFiles")}</p>
              <p className="text-2xl font-semibold">{run.fileCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted">
                {t("commissionRunsTransactions")}
              </p>
              <p className="text-2xl font-semibold">{run.transactionCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted">{t("commissionRunsBlocking")}</p>
              <p className="text-2xl font-semibold">{run.blockingIssueCount}</p>
            </div>
          </div>
          <p className="text-sm text-muted">{t("commissionRunsPhase1Hint")}</p>
        </>
      )}
    </div>
  );
}
