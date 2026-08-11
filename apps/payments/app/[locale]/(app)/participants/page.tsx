"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { OrgNode, PaymentsParticipant, ParticipantType } from "@pulse/shared";
import type { AdminUserRow } from "@pulse/firebase-web";
import {
  listPaymentsParticipants,
  upsertPaymentsParticipant,
} from "@/lib/firebase/functions";
import { getPaymentsAdminRepository } from "@/lib/admin-repository";
import { Button } from "@/components/ui/primitives";

function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

export default function ParticipantsPage() {
  const t = useTranslations();
  const repo = useMemo(() => getPaymentsAdminRepository(), []);
  const [rows, setRows] = useState<PaymentsParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<ParticipantType>("agency");
  const [agencies, setAgencies] = useState<OrgNode[]>([]);
  const [agencyId, setAgencyId] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const debouncedUserQuery = useDebounced(userQuery.trim(), 300);
  const [userHits, setUserHits] = useState<AdminUserRow[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await repo.listAgencies({
          pageSize: 200,
          includeInactive: false,
        });
        if (!cancelled) setAgencies(result.agencies);
      } catch {
        if (!cancelled) setAgencies([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repo]);

  useEffect(() => {
    if (type !== "agent" || !debouncedUserQuery) {
      setUserHits([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = await repo.listUsers({
          query: debouncedUserQuery,
          pageSize: 12,
        });
        if (!cancelled) {
          setUserHits(
            result.users.filter(
              (u) => u.role === "agent" || u.role === "agency_owner",
            ),
          );
        }
      } catch {
        if (!cancelled) setUserHits([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [type, debouncedUserQuery, repo]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (type === "agency") {
        if (!agencyId) {
          setError(t("participantsSelectAgency"));
          setBusy(false);
          return;
        }
        const agency = agencies.find((a) => a.id === agencyId);
        await upsertPaymentsParticipant({
          name: agency?.name ?? "Agency",
          type: "agency",
          linkedOrgNodeId: agencyId,
          userId: null,
          npn: agency?.npn ?? null,
          active: true,
        });
        setAgencyId("");
      } else {
        if (!selectedUser) {
          setError(t("participantsSelectAgent"));
          setBusy(false);
          return;
        }
        await upsertPaymentsParticipant({
          name:
            selectedUser.displayName?.trim() ||
            selectedUser.email?.trim() ||
            "Agent",
          type: "agent",
          userId: selectedUser.uid,
          linkedOrgNodeId: selectedUser.orgNodeId ?? null,
          npn: selectedUser.npn ?? null,
          active: true,
        });
        setSelectedUser(null);
        setUserQuery("");
        setUserHits([]);
      }
      await reload();
    } catch {
      setError(t("errorGeneric"));
      setBusy(false);
    }
  }

  const canSubmit =
    type === "agency" ? Boolean(agencyId) : Boolean(selectedUser);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-10">
      <header>
        <h1 className="font-display text-3xl font-bold">
          {t("participantsTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted">{t("participantsSubtitle")}</p>
      </header>

      <form
        onSubmit={onCreate}
        className="studio-panel grid gap-3 p-4 sm:grid-cols-2"
      >
        <label className="block text-sm">
          <span className="text-muted">{t("type")}</span>
          <select
            className="mt-1 w-full rounded-xl border border-glass-border bg-sheet px-3 py-2"
            value={type}
            onChange={(e) => {
              setType(e.target.value as ParticipantType);
              setAgencyId("");
              setSelectedUser(null);
              setUserQuery("");
              setUserHits([]);
            }}
          >
            <option value="agency">{t("participantType_agency")}</option>
            <option value="agent">{t("participantType_agent")}</option>
          </select>
        </label>

        {type === "agency" ? (
          <label className="block text-sm">
            <span className="text-muted">{t("participantsLinkAgency")}</span>
            <select
              className="mt-1 w-full rounded-xl border border-glass-border bg-sheet px-3 py-2"
              value={agencyId}
              onChange={(e) => setAgencyId(e.target.value)}
              required
            >
              <option value="">{t("participantsSelectAgency")}</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.type === "organization"
                    ? `${a.name} (${t("participantType_matrix")})`
                    : a.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="block text-sm">
            <span className="text-muted">{t("participantsLinkAgent")}</span>
            {selectedUser ? (
              <div className="mt-1 flex items-center justify-between gap-2 rounded-xl border border-glass-border bg-sheet px-3 py-2">
                <span className="truncate">
                  {selectedUser.displayName?.trim() ||
                    selectedUser.email ||
                    selectedUser.uid.slice(0, 8)}
                </span>
                <button
                  type="button"
                  className="text-xs text-muted hover:text-ink"
                  onClick={() => setSelectedUser(null)}
                >
                  {t("cancel")}
                </button>
              </div>
            ) : (
              <>
                <input
                  className="mt-1 w-full rounded-xl border border-glass-border bg-sheet px-3 py-2"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder={t("participantsSearchAgents")}
                />
                {userHits.length > 0 ? (
                  <ul className="mt-1 max-h-40 overflow-auto rounded-xl border border-glass-border">
                    {userHits.map((u) => (
                      <li key={u.uid}>
                        <button
                          type="button"
                          className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-ink/[0.04]"
                          onClick={() => {
                            setSelectedUser(u);
                            setUserQuery("");
                            setUserHits([]);
                          }}
                        >
                          <span className="font-medium">
                            {u.displayName?.trim() ||
                              u.email ||
                              u.uid.slice(0, 8)}
                          </span>
                          {u.email ? (
                            <span className="text-[11px] text-muted">
                              {u.email}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </div>
        )}

        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy || !canSubmit}>
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
              <th className="px-4 py-3 font-medium">{t("participantsLink")}</th>
              <th className="px-4 py-3 font-medium">{t("active")}</th>
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
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3">
                    {row.type === "agency"
                      ? t("participantType_agency")
                      : t("participantType_agent")}
                  </td>
                  <td className="px-4 py-3">{row.npn ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {row.linkedOrgNodeId || row.userId ? (
                      <span className="rounded-full border border-glass-border px-2 py-0.5">
                        {row.type === "agency"
                          ? `org:${(row.linkedOrgNodeId ?? "").slice(0, 8)}`
                          : `user:${(row.userId ?? "").slice(0, 8)}`}
                      </span>
                    ) : (
                      t("participantsUnlinked")
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.active ? t("yes") : t("no")}
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
