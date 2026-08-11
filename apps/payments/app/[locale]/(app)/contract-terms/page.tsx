"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { ContractTerm, PaymentsParticipant } from "@pulse/shared";
import {
  listContractTerms,
  listPaymentsParticipants,
  upsertContractTerm,
} from "@/lib/firebase/functions";
import { Button } from "@/components/ui/primitives";

export default function ContractTermsPage() {
  const t = useTranslations();
  const [rows, setRows] = useState<ContractTerm[]>([]);
  const [participants, setParticipants] = useState<PaymentsParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [participantId, setParticipantId] = useState("");
  const [rate, setRate] = useState("18");
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
  const [carrierId, setCarrierId] = useState("");

  async function reload() {
    setBusy(true);
    setError(null);
    try {
      const [terms, parts] = await Promise.all([
        listContractTerms(),
        listPaymentsParticipants(true),
      ]);
      setRows(terms);
      setParticipants(parts);
      if (!participantId && parts[0]) setParticipantId(parts[0].id);
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

  const nameOf = (id: string) =>
    participants.find((p) => p.id === id)?.name ?? id;

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await upsertContractTerm({
        participantId,
        carrierId: carrierId.trim() || null,
        states: [],
        productCodes: [],
        rate: Number(rate),
        rateUnit: "pmpm",
        effectiveFrom: from,
        effectiveTo: null,
        active: true,
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
          {t("contractTermsTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted">{t("contractTermsSubtitle")}</p>
      </header>

      <form
        onSubmit={onCreate}
        className="studio-panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="block text-sm">
          <span className="text-muted">{t("participant")}</span>
          <select
            className="mt-1 w-full rounded-xl border border-glass-border bg-sheet px-3 py-2"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            required
          >
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted">{t("rate")} (PMPM)</span>
          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded-xl border border-glass-border bg-sheet px-3 py-2"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">{t("carrier")} ID</span>
          <input
            className="mt-1 w-full rounded-xl border border-glass-border bg-sheet px-3 py-2"
            value={carrierId}
            onChange={(e) => setCarrierId(e.target.value)}
            placeholder="optional"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">{t("effectiveFrom")}</span>
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-glass-border bg-sheet px-3 py-2"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            required
          />
        </label>
        <div className="sm:col-span-2 lg:col-span-4">
          <Button type="submit" disabled={busy || !participantId}>
            {t("create")}
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="studio-panel overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-glass-border text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{t("participant")}</th>
              <th className="px-4 py-3 font-medium">{t("rate")}</th>
              <th className="px-4 py-3 font-medium">{t("carrier")}</th>
              <th className="px-4 py-3 font-medium">{t("effectiveFrom")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={4}>
                  {busy ? t("loading") : t("empty")}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-glass-border">
                  <td className="px-4 py-3">{nameOf(row.participantId)}</td>
                  <td className="px-4 py-3">
                    ${row.rate} {row.rateUnit}
                  </td>
                  <td className="px-4 py-3">{row.carrierId ?? "—"}</td>
                  <td className="px-4 py-3">{row.effectiveFrom}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
