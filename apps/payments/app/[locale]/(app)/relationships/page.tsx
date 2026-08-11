"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { BusinessRelationship, PaymentsParticipant } from "@pulse/shared";
import { deriveRelationshipType } from "@pulse/shared";
import {
  listBusinessRelationships,
  listPaymentsParticipants,
  upsertBusinessRelationship,
} from "@/lib/firebase/functions";
import { Button } from "@/components/ui/primitives";

export default function RelationshipsPage() {
  const t = useTranslations();
  const [rows, setRows] = useState<BusinessRelationship[]>([]);
  const [participants, setParticipants] = useState<PaymentsParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [upline, setUpline] = useState("");
  const [downline, setDownline] = useState("");
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));

  async function reload() {
    setBusy(true);
    setError(null);
    try {
      const [rels, parts] = await Promise.all([
        listBusinessRelationships(),
        listPaymentsParticipants(true),
      ]);
      setRows(rels);
      setParticipants(parts);
      if (!upline && parts[0]) setUpline(parts[0].id);
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

  const uplineParticipant = participants.find((p) => p.id === upline);
  const downlineOptions = useMemo(
    () => participants.filter((p) => p.id !== upline),
    [participants, upline],
  );

  const derivedType = useMemo(() => {
    const down = participants.find((p) => p.id === downline);
    if (!uplineParticipant || !down) return null;
    return deriveRelationshipType(uplineParticipant.type, down.type);
  }, [uplineParticipant, downline, participants]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!derivedType) {
      setError(t("relationshipInvalidPair"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await upsertBusinessRelationship({
        uplineParticipantId: upline,
        downlineParticipantId: downline,
        effectiveFrom: from,
        effectiveTo: null,
        carrierIds: [],
        states: [],
        productCodes: [],
        retentionFraction: 0,
        notes: null,
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
          {t("relationshipsTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted">{t("relationshipsSubtitle")}</p>
      </header>

      <form
        onSubmit={onCreate}
        className="studio-panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="block text-sm">
          <span className="text-muted">{t("upline")}</span>
          <select
            className="mt-1 h-8 w-full rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
            value={upline}
            onChange={(e) => {
              const next = e.target.value;
              setUpline(next);
              if (downline === next) setDownline("");
            }}
            required
          >
            <option value="">{t("selectUpline")}</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.type})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted">{t("downline")}</span>
          <select
            className="mt-1 h-8 w-full rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
            value={downline}
            onChange={(e) => setDownline(e.target.value)}
            required
            disabled={!upline}
          >
            <option value="">{t("selectDownline")}</option>
            {downlineOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.type})
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-muted">
            {t("downlineHint")}
          </span>
        </label>
        <div className="block text-sm">
          <span className="text-muted">{t("type")}</span>
          <div className="mt-1 flex min-h-8 items-center">
            {derivedType ? (
              <span className="rounded-full border border-glass-border bg-sheet px-3 py-1 text-xs font-medium">
                {derivedType}
              </span>
            ) : (
              <span className="text-xs text-muted">{t("derivedTypePending")}</span>
            )}
          </div>
        </div>
        <label className="block text-sm">
          <span className="text-muted">{t("effectiveFrom")}</span>
          <input
            type="date"
            className="mt-1 h-8 w-full rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            required
          />
        </label>
        <div className="sm:col-span-2 lg:col-span-4">
          <Button
            type="submit"
            size="sm"
            disabled={busy || !upline || !downline || !derivedType}
          >
            {t("create")}
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="studio-panel overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-glass-border text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{t("upline")}</th>
              <th className="px-4 py-3 font-medium">{t("downline")}</th>
              <th className="px-4 py-3 font-medium">{t("type")}</th>
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
                  <td className="px-4 py-3">{nameOf(row.uplineParticipantId)}</td>
                  <td className="px-4 py-3">
                    {nameOf(row.downlineParticipantId)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-glass-border bg-sheet px-2 py-0.5 text-xs">
                      {row.relationshipType}
                    </span>
                  </td>
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
