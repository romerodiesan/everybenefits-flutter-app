"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Statement } from "@pulse/shared";
import { importStatement, listStatements } from "@/lib/firebase/functions";
import { Button } from "@/components/ui/primitives";

const SAMPLE_LINES = `[
  {
    "writingProducerNpn": "111",
    "writingProducerName": "Maria",
    "memberMonths": 1,
    "receivedOverrideAmount": 7,
    "carrierRate": 25,
    "productionDate": "2024-06-15",
    "state": "FL",
    "productCode": "ACA"
  }
]`;

export default function StatementsPage() {
  const t = useTranslations();
  const [rows, setRows] = useState<Statement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("June 2024 carrier statement");
  const [periodStart, setPeriodStart] = useState("2024-06-01");
  const [periodEnd, setPeriodEnd] = useState("2024-06-30");
  const [linesJson, setLinesJson] = useState(SAMPLE_LINES);

  async function reload() {
    setBusy(true);
    setError(null);
    try {
      setRows(await listStatements());
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onImport(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const lines = JSON.parse(linesJson) as Array<Record<string, unknown>>;
      await importStatement({
        label: label.trim(),
        periodStart,
        periodEnd,
        source: "manual",
        lines,
      });
      await reload();
    } catch {
      setError(t("errorGeneric"));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-10">
      <header>
        <h1 className="font-display text-3xl font-bold">
          {t("statementsTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted">{t("statementsSubtitle")}</p>
      </header>

      <form onSubmit={onImport} className="studio-panel space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm sm:col-span-3">
            <span className="text-muted">{t("label")}</span>
            <input
              className="mt-1 h-8 w-full rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t("periodStart")}</span>
            <input
              type="date"
              className="mt-1 h-8 w-full rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">{t("periodEnd")}</span>
            <input
              type="date"
              className="mt-1 h-8 w-full rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              required
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-muted">{t("linesJson")}</span>
          <p className="mt-1 text-xs text-muted">{t("linesJsonHint")}</p>
          <textarea
            className="mt-2 w-full rounded-lg border border-glass-border bg-sheet px-2.5 py-2 font-mono text-xs"
            rows={10}
            value={linesJson}
            onChange={(e) => setLinesJson(e.target.value)}
            required
          />
        </label>
        <Button type="submit" size="sm" disabled={busy}>
          {t("importStatement")}
        </Button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="studio-panel overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="border-b border-glass-border text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{t("label")}</th>
              <th className="px-4 py-3 font-medium">{t("status")}</th>
              <th className="px-4 py-3 font-medium">Lines</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={3}>
                  {busy ? t("loading") : t("empty")}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-glass-border">
                  <td className="px-4 py-3 font-medium">{row.label}</td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3">{row.lineCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
