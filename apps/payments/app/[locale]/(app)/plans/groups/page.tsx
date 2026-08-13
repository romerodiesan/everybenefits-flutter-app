"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/primitives";
import { PlansSubnav } from "@/components/payments/plans-subnav";
import {
  useAgentRateGroups,
  useDeleteGroupMutation,
  usePaymentsParticipants,
  useUpsertGroupMutation,
} from "@/lib/payments-queries";

export default function AgentRateGroupsPage() {
  const t = useTranslations();
  const { data: groups = [], isLoading: groupsLoading, isError: groupsError } =
    useAgentRateGroups();
  const {
    data: participants = [],
    isLoading: partsLoading,
    isError: partsError,
  } = usePaymentsParticipants(true);
  const upsertMutation = useUpsertGroupMutation();
  const deleteMutation = useDeleteGroupMutation();
  const busy =
    groupsLoading ||
    partsLoading ||
    upsertMutation.isPending ||
    deleteMutation.isPending;
  const error =
    groupsError ||
    partsError ||
    upsertMutation.isError ||
    deleteMutation.isError
      ? t("errorGeneric")
      : null;
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const agents = useMemo(
    () =>
      participants
        .filter((p) => p.type === "agent" && p.active)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [participants],
  );

  const nameOf = (id: string) =>
    participants.find((p) => p.id === id)?.name ?? id;

  function toggleMember(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await upsertMutation.mutateAsync({
        name: name.trim(),
        memberParticipantIds: selected,
        active: true,
      });
      setName("");
      setSelected([]);
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
        <h1 className="font-display text-3xl font-bold">
          {t("plansGroupsTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted">{t("plansGroupsSubtitle")}</p>
      </header>
      <PlansSubnav />

      <form onSubmit={onCreate} className="studio-panel space-y-3 p-4">
        <label className="block text-sm">
          <span className="text-muted">{t("name")}</span>
          <input
            className="mt-1 h-8 w-full max-w-md rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <div>
          <p className="text-sm text-muted">{t("plansGroupMembers")}</p>
          <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-glass-border p-2">
            {agents.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted">{t("empty")}</p>
            ) : (
              agents.map((a) => (
                <label
                  key={a.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-white/[0.03]"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(a.id)}
                    onChange={() => toggleMember(a.id)}
                  />
                  {a.name}
                </label>
              ))
            )}
          </div>
        </div>
        <Button type="submit" size="sm" disabled={busy || !name.trim()}>
          {t("create")}
        </Button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="studio-panel overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-glass-border text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{t("name")}</th>
              <th className="px-4 py-3 font-medium">{t("plansGroupMembers")}</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={3}>
                  {busy ? t("loading") : t("plansGroupsEmpty")}
                </td>
              </tr>
            ) : (
              groups.map((g) => (
                <tr key={g.id} className="border-t border-glass-border">
                  <td className="px-4 py-3 font-medium">{g.name}</td>
                  <td className="px-4 py-3 text-muted">
                    {g.memberParticipantIds.length === 0
                      ? "—"
                      : g.memberParticipantIds.map(nameOf).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void onDelete(g.id)}
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
