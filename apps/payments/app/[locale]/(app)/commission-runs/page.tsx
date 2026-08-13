"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCommissionRun,
  listCommissionRuns,
} from "@/lib/firebase/functions";
import { Button, Input } from "@/components/ui/primitives";

export default function CommissionRunsPage() {
  const t = useTranslations();
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["commissionRuns"],
    queryFn: () => listCommissionRuns({ limit: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: createCommissionRun,
    onSuccess: async (result) => {
      await qc.invalidateQueries({ queryKey: ["commissionRuns"] });
      router.push(`/commission-runs/${result.run.id}`);
    },
    onError: () => setFormError(t("errorGeneric")),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !periodStart || !periodEnd) {
      setFormError(t("commissionRunsFormRequired"));
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      periodStart,
      periodEnd,
    });
  }

  const runs = data?.runs ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 lg:p-10">
      <header>
        <h1 className="font-display text-3xl font-bold">
          {t("commissionRunsTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted">{t("commissionRunsSubtitle")}</p>
      </header>

      <section className="studio-panel space-y-4 p-4">
        <h2 className="font-display text-lg font-semibold">
          {t("commissionRunsCreate")}
        </h2>
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={onSubmit}
        >
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span className="text-muted">{t("commissionRunsName")}</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("commissionRunsNamePlaceholder")}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted">{t("commissionRunsPeriodStart")}</span>
            <Input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted">{t("commissionRunsPeriodEnd")}</span>
            <Input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending
                ? t("loading")
                : t("commissionRunsCreateCta")}
            </Button>
          </div>
        </form>
        {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
      </section>

      {isError ? (
        <p className="text-sm text-red-600">{t("errorGeneric")}</p>
      ) : null}

      <div className="studio-panel overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-glass-border text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{t("commissionRunsName")}</th>
              <th className="px-4 py-3 font-medium">{t("status")}</th>
              <th className="px-4 py-3 font-medium">
                {t("commissionRunsPeriod")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t("commissionRunsFiles")}
              </th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={4}>
                  {isLoading ? t("loading") : t("commissionRunsEmpty")}
                </td>
              </tr>
            ) : (
              runs.map((run) => (
                <tr
                  key={run.id}
                  className="border-b border-glass-border/60 last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/commission-runs/${run.id}`}
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {run.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{run.status}</td>
                  <td className="px-4 py-3 text-muted">
                    {run.periodStart} → {run.periodEnd}
                  </td>
                  <td className="px-4 py-3">{run.fileCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
