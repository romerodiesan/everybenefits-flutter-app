"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { CompensationTierKind } from "@pulse/shared";
import { COMPENSATION_TIER_KINDS } from "@pulse/shared";
import { Button } from "@/components/ui/primitives";
import { PlansSubnav } from "@/components/payments/plans-subnav";
import {
  useCompensationTiers,
  useDeleteTierMutation,
  useSeedTiersMutation,
  useUpsertTierMutation,
} from "@/lib/payments-queries";

export default function CompensationTiersPage() {
  const t = useTranslations();
  const { data: tiers = [], isLoading, isFetching, isError } =
    useCompensationTiers();
  const seedMutation = useSeedTiersMutation();
  const upsertMutation = useUpsertTierMutation();
  const deleteMutation = useDeleteTierMutation();
  const busy =
    isFetching ||
    seedMutation.isPending ||
    upsertMutation.isPending ||
    deleteMutation.isPending;
  const error =
    isError ||
    seedMutation.isError ||
    upsertMutation.isError ||
    deleteMutation.isError
      ? t("errorGeneric")
      : null;
  const [name, setName] = useState("");
  const [rate, setRate] = useState("18");
  const [kind, setKind] = useState<CompensationTierKind>("generic");

  async function onSeed() {
    try {
      await seedMutation.mutateAsync();
    } catch {
      /* surfaced */
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await upsertMutation.mutateAsync({
        name: name.trim(),
        rate: Number(rate),
        rateUnit: "pmpm",
        kind,
        active: true,
      });
      setName("");
    } catch {
      /* surfaced */
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      /* surfaced */
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-10">
      <header>
        <h1 className="font-display text-3xl font-bold">{t("plansTiersTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("plansTiersSubtitle")}</p>
      </header>
      <PlansSubnav />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy || tiers.length > 0}
          onClick={() => void onSeed()}
        >
          {t("plansSeedTiers")}
        </Button>
      </div>

      <form
        onSubmit={onCreate}
        className="studio-panel grid gap-3 p-4 sm:grid-cols-4"
      >
        <label className="block text-sm sm:col-span-2">
          <span className="text-muted">{t("name")}</span>
          <input
            className="mt-1 h-8 w-full rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">{t("rate")} (PMPM)</span>
          <input
            type="number"
            step="0.01"
            className="mt-1 h-8 w-full rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">{t("plansTierKind")}</span>
          <select
            className="mt-1 h-8 w-full rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
            value={kind}
            onChange={(e) => setKind(e.target.value as CompensationTierKind)}
          >
            {COMPENSATION_TIER_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`plansTierKind_${k}`)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end sm:col-span-4">
          <Button type="submit" size="sm" disabled={busy || !name.trim()}>
            {t("create")}
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="studio-panel overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="border-b border-glass-border text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{t("name")}</th>
              <th className="px-4 py-3 font-medium">{t("plansTierKind")}</th>
              <th className="px-4 py-3 font-medium">{t("rate")}</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {tiers.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={4}>
                  {isLoading ? t("loading") : t("plansTiersEmpty")}
                </td>
              </tr>
            ) : (
              tiers
                .slice()
                .sort((a, b) => b.rate - a.rate)
                .map((tier) => (
                  <tr key={tier.id} className="border-t border-glass-border">
                    <td className="px-4 py-3 font-medium">{tier.name}</td>
                    <td className="px-4 py-3">
                      {t(`plansTierKind_${tier.kind}`)}
                    </td>
                    <td className="px-4 py-3">${tier.rate} PMPM</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void onDelete(tier.id)}
                      >
                        {t("delete")}
                      </Button>
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
