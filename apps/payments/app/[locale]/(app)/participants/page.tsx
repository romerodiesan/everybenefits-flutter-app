"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { PaymentsParticipant, ParticipantType } from "@pulse/shared";
import { PARTICIPANT_TYPES } from "@pulse/shared";
import {
  listPaymentsParticipants,
  upsertPaymentsParticipant,
} from "@/lib/firebase/functions";
import { Button } from "@/components/ui/primitives";

export default function ParticipantsPage() {
  const t = useTranslations();
  const [rows, setRows] = useState<PaymentsParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<ParticipantType>("agent");
  const [npn, setNpn] = useState("");

  async function reload() {
    setBusy(true);
    setError(null);
    try {
      setRows(await listPaymentsParticipants(true));
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

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await upsertPaymentsParticipant({
        name: name.trim(),
        type,
        npn: npn.trim() || null,
        userId: null,
        linkedOrgNodeId: null,
        active: true,
      });
      setName("");
      setNpn("");
      await reload();
    } catch {
      setError(t("errorGeneric"));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-10">
      <header>
        <h1 className="font-display text-3xl font-bold">{t("participantsTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("participantsSubtitle")}</p>
      </header>

      <form
        onSubmit={onCreate}
        className="studio-panel grid gap-3 p-4 sm:grid-cols-4"
      >
        <label className="block text-sm sm:col-span-2">
          <span className="text-muted">{t("name")}</span>
          <input
            className="mt-1 w-full rounded-xl border border-glass-border bg-sheet px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">{t("type")}</span>
          <select
            className="mt-1 w-full rounded-xl border border-glass-border bg-sheet px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value as ParticipantType)}
          >
            {PARTICIPANT_TYPES.map((pt) => (
              <option key={pt} value={pt}>
                {pt}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted">{t("npn")}</span>
          <input
            className="mt-1 w-full rounded-xl border border-glass-border bg-sheet px-3 py-2"
            value={npn}
            onChange={(e) => setNpn(e.target.value)}
          />
        </label>
        <div className="sm:col-span-4">
          <Button type="submit" disabled={busy || !name.trim()}>
            {t("create")}
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="studio-panel overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-glass-border text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{t("name")}</th>
              <th className="px-4 py-3 font-medium">{t("type")}</th>
              <th className="px-4 py-3 font-medium">{t("npn")}</th>
              <th className="px-4 py-3 font-medium">{t("active")}</th>
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
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3">{row.type}</td>
                  <td className="px-4 py-3">{row.npn ?? "—"}</td>
                  <td className="px-4 py-3">{row.active ? "yes" : "no"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
