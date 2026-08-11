"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import type { OverrideRun } from "@pulse/shared";
import { getOverrideRun } from "@/lib/firebase/functions";

export default function RunDetailPage() {
  const t = useTranslations();
  const params = useParams<{ runId: string }>();
  const runId = params.runId;
  const [run, setRun] = useState<OverrideRun | null>(null);
  const [allocations, setAllocations] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [reconciliation, setReconciliation] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await getOverrideRun(runId);
        setRun(data.run);
        setAllocations(data.allocations);
        setReconciliation(data.reconciliation);
      } catch {
        setError(t("errorGeneric"));
      }
    })();
  }, [runId, t]);

  if (error) {
    return <p className="p-6 text-sm text-red-600">{error}</p>;
  }

  if (!run) {
    return <p className="p-6 text-sm text-muted">{t("loading")}</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-10">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">{t("runsTitle")}</h1>
        <p className="text-sm text-muted">
          {run.id} · {run.status}
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>
            {t("expected")}: <strong>${run.expectedTotal.toFixed(2)}</strong>
          </span>
          <span>
            {t("received")}: <strong>${run.receivedTotal.toFixed(2)}</strong>
          </span>
          <span>
            {t("difference")}:{" "}
            <strong>${run.differenceTotal.toFixed(2)}</strong>
          </span>
        </div>
      </header>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold">Allocations</h2>
        <div className="studio-panel overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-glass-border text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{t("participant")}</th>
                <th className="px-4 py-3 font-medium">{t("amount")}</th>
                <th className="px-4 py-3 font-medium">Δ rate</th>
                <th className="px-4 py-3 font-medium">{t("memberMonths")}</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((row) => (
                <tr
                  key={String(row.id)}
                  className="border-t border-glass-border"
                >
                  <td className="px-4 py-3">{String(row.participantId)}</td>
                  <td className="px-4 py-3">
                    ${Number(row.amount ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    ${Number(row.rateDelta ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">{String(row.memberMonths)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold">Reconciliation</h2>
        <div className="studio-panel overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-glass-border text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{t("participant")}</th>
                <th className="px-4 py-3 font-medium">{t("expected")}</th>
                <th className="px-4 py-3 font-medium">{t("received")}</th>
                <th className="px-4 py-3 font-medium">{t("difference")}</th>
              </tr>
            </thead>
            <tbody>
              {reconciliation.map((row) => (
                <tr
                  key={String(row.id)}
                  className="border-t border-glass-border"
                >
                  <td className="px-4 py-3">
                    {row.participantId
                      ? String(row.participantId)
                      : "(line total)"}
                  </td>
                  <td className="px-4 py-3">
                    ${Number(row.expectedAmount ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    ${Number(row.receivedAmount ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    ${Number(row.difference ?? 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
