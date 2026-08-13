"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { RateUnit } from "@pulse/shared";
import { PlansSubnav } from "@/components/payments/plans-subnav";
import {
  useCarriers,
  useContractTerms,
  usePaymentsParticipants,
} from "@/lib/payments-queries";

function formatTermRate(rate: number, unit: RateUnit): string {
  if (unit === "percent") return `${rate}%`;
  if (unit === "pmpm") return `$${rate} PMPM`;
  return `$${rate}`;
}

export default function ContractTermsPage() {
  const t = useTranslations();
  const { data: rows = [], isLoading: termsLoading, isError: termsError } =
    useContractTerms();
  const {
    data: participants = [],
    isLoading: partsLoading,
    isError: partsError,
  } = usePaymentsParticipants(true);
  const {
    data: carriers = [],
    isLoading: carriersLoading,
    isError: carriersError,
  } = useCarriers();
  const busy = termsLoading || partsLoading || carriersLoading;
  const error =
    termsError || partsError || carriersError ? t("errorGeneric") : null;

  const carrierName = (id: string | null) => {
    if (!id) return "—";
    const c = carriers.find((x) => x.id === id);
    return c ? `${c.name} (${c.code})` : id;
  };

  const nameOf = (id: string) =>
    participants.find((p) => p.id === id)?.name ?? id;

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) =>
        `${nameOf(a.participantId)}-${a.carrierId}`.localeCompare(
          `${nameOf(b.participantId)}-${b.carrierId}`,
        ),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, participants],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-10">
      <header>
        <h1 className="font-display text-3xl font-bold">
          {t("contractTermsTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted">{t("contractTermsSubtitle")}</p>
        <p className="mt-2 text-sm">
          <Link
            href="/plans"
            className="text-brand underline-offset-2 hover:underline"
          >
            {t("plansOpenWizard")}
          </Link>
        </p>
      </header>
      <PlansSubnav />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="studio-panel overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-glass-border text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{t("participant")}</th>
              <th className="px-4 py-3 font-medium">{t("carrier")}</th>
              <th className="px-4 py-3 font-medium">{t("rate")}</th>
              <th className="px-4 py-3 font-medium">{t("effectiveFrom")}</th>
              <th className="px-4 py-3 font-medium">{t("plansSourcePlan")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={5}>
                  {busy ? t("loading") : t("empty")}
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr key={row.id} className="border-t border-glass-border">
                  <td className="px-4 py-3">{nameOf(row.participantId)}</td>
                  <td className="px-4 py-3">{carrierName(row.carrierId)}</td>
                  <td className="px-4 py-3">
                    {formatTermRate(row.rate, row.rateUnit)}
                  </td>
                  <td className="px-4 py-3">{row.effectiveFrom}</td>
                  <td className="px-4 py-3 text-muted">
                    {row.sourcePlanId ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
