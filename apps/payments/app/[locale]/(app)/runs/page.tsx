"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { OverrideRun } from "@pulse/shared";
import { listOverrideRuns } from "@/lib/firebase/functions";

export default function RunsPage() {
  const t = useTranslations();
  const [rows, setRows] = useState<OverrideRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      setBusy(true);
      try {
        setRows(await listOverrideRuns());
      } catch {
        setError(t("errorGeneric"));
      } finally {
        setBusy(false);
      }
    })();
  }, [t]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-10">
      <header>
        <h1 className="font-display text-3xl font-bold">{t("runsTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("runsSubtitle")}</p>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="studio-panel overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b border-glass-border text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Run</th>
              <th className="px-4 py-3 font-medium">{t("status")}</th>
              <th className="px-4 py-3 font-medium">{t("expected")}</th>
              <th className="px-4 py-3 font-medium">{t("received")}</th>
              <th className="px-4 py-3 font-medium">{t("difference")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={5}>
                  {busy ? t("loading") : t("empty")}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-glass-border">
                  <td className="px-4 py-3">
                    <Link
                      href={`/runs/${row.id}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {row.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3">${row.expectedTotal.toFixed(2)}</td>
                  <td className="px-4 py-3">${row.receivedTotal.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    ${row.differenceTotal.toFixed(2)}
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
