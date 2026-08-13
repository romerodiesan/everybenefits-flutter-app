"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import type { CommissionPartySummary, PayMode } from "@pulse/shared";
import {
  listCommissionParties,
  setAgencyPayMode,
} from "@/lib/firebase/functions";
import { SearchInput } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data-table";
import { UserCell } from "@/components/ui/data-table-cells";
import { useAlerts } from "@/lib/providers/alert-provider";

type AgencyRow = CommissionPartySummary & {
  ref: { kind: "agency"; orgNodeId: string };
};

const AGENCIES_QUERY_KEY = ["commissionParties", "agency"] as const;

const PAY_MODE_SELECT_CLASS =
  "h-8 min-w-[11rem] max-w-full rounded-lg border border-glass-border bg-transparent px-2.5 text-xs font-medium text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-60";

function FilterField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function PayModeCell({
  orgNodeId,
  agencyName,
  payMode,
  isDefault,
}: {
  orgNodeId: string;
  agencyName: string;
  payMode: PayMode;
  isDefault: boolean;
}) {
  const t = useTranslations();
  const alerts = useAlerts();
  const qc = useQueryClient();

  const setModeMutation = useMutation({
    mutationFn: (next: PayMode) => setAgencyPayMode(orgNodeId, next),
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: AGENCIES_QUERY_KEY });
      const previous = qc.getQueryData<{
        parties: CommissionPartySummary[];
        nextCursor: string | null;
      }>(AGENCIES_QUERY_KEY);

      qc.setQueryData(AGENCIES_QUERY_KEY, (old: typeof previous) => {
        if (!old?.parties) return old;
        return {
          ...old,
          parties: old.parties.map((party) => {
            if (party.ref.kind !== "agency") return party;
            if (party.ref.orgNodeId !== orgNodeId) return party;
            return {
              ...party,
              payMode: next,
              payModeIsDefault: false,
            };
          }),
        };
      });

      return { previous };
    },
    onError: (_err, _next, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(AGENCIES_QUERY_KEY, ctx.previous);
      }
      alerts.error(t("errorGeneric"));
    },
    onSuccess: (result) => {
      qc.setQueryData(AGENCIES_QUERY_KEY, (old: {
        parties: CommissionPartySummary[];
        nextCursor: string | null;
      } | undefined) => {
        if (!old?.parties) return old;
        return {
          ...old,
          parties: old.parties.map((party) => {
            if (party.ref.kind !== "agency") return party;
            if (party.ref.orgNodeId !== orgNodeId) return party;
            return {
              ...party,
              payMode: result.payMode,
              payModeIsDefault: result.isDefault,
            };
          }),
        };
      });
      alerts.success(
        t("agenciesPayModeSaved"),
        `${agencyName}: ${
          result.payMode === "direct"
            ? t("payModeDirect")
            : t("payModeThroughAgency")
        }`,
      );
    },
  });

  return (
    <div className="flex flex-col gap-1">
      <select
        className={PAY_MODE_SELECT_CLASS}
        value={payMode}
        disabled={setModeMutation.isPending}
        aria-label={t("agenciesPayMode")}
        onChange={(e) => {
          const next = e.target.value as PayMode;
          if (next === payMode) return;
          setModeMutation.mutate(next);
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <option value="direct">{t("payModeDirect")}</option>
        <option value="through_agency">{t("payModeThroughAgency")}</option>
      </select>
      <span className="text-[10px] text-muted">
        {setModeMutation.isPending
          ? t("loading")
          : isDefault
            ? t("agenciesPayModeDefaultShort")
            : t("agenciesPayModeCustomShort")}
      </span>
    </div>
  );
}

export default function AgenciesPage() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = useState(0);

  const agenciesQuery = useQuery({
    queryKey: AGENCIES_QUERY_KEY,
    queryFn: () =>
      listCommissionParties({
        kind: "agency",
        limit: 200,
      }),
    staleTime: 5 * 60_000,
  });

  const agencies = useMemo(
    () =>
      (agenciesQuery.data?.parties ?? []).filter(
        (p): p is AgencyRow => p.ref.kind === "agency" && p.active,
      ),
    [agenciesQuery.data?.parties],
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agencies
      .filter((row) => {
        if (!q) return true;
        const npn = (row.npn ?? "").toLowerCase();
        return (
          row.name.toLowerCase().includes(q) ||
          npn.includes(q) ||
          row.ref.orgNodeId.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [agencies, search]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, pageIndex, pageSize]);

  useEffect(() => {
    setPageIndex(0);
  }, [pageSize, search]);

  const columns = useMemo<ColumnDef<AgencyRow, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("agenciesName"),
        cell: ({ row }) => (
          <UserCell
            name={row.original.name}
            email={
              row.original.npn
                ? t("agenciesNpnLine", { npn: row.original.npn })
                : t("agenciesNoNpn")
            }
          />
        ),
      },
      {
        id: "agents",
        header: t("agenciesAgentsCol"),
        cell: ({ row }) => (
          <span className="tabular-nums text-muted">
            {t("agenciesAgentCount", { count: row.original.agentCount ?? 0 })}
          </span>
        ),
      },
      {
        id: "payMode",
        header: t("agenciesPayMode"),
        cell: ({ row }) => (
          <PayModeCell
            orgNodeId={row.original.ref.orgNodeId}
            agencyName={row.original.name}
            payMode={row.original.payMode ?? "through_agency"}
            isDefault={row.original.payModeIsDefault !== false}
          />
        ),
      },
    ],
    [t],
  );

  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const error = agenciesQuery.isError ? t("errorGeneric") : null;
  const isLoading = agenciesQuery.isLoading && agencies.length === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-10">
      <header>
        <h1 className="font-display text-3xl font-bold">
          {t("agenciesTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted">{t("agenciesSubtitle")}</p>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <DataTable
        columns={columns}
        data={pagedRows}
        loading={isLoading}
        emptyTitle={
          agencies.length > 0 && filteredRows.length === 0
            ? t("agenciesEmptyTitle")
            : t("empty")
        }
        emptyHint={
          agencies.length > 0 && filteredRows.length === 0
            ? t("agenciesEmptyFiltered")
            : t("agenciesEmptyBody")
        }
        pageSize={pageSize}
        canPreviousPage={safePageIndex > 0}
        canNextPage={safePageIndex < pageCount - 1}
        onPreviousPage={() => setPageIndex((p) => Math.max(0, p - 1))}
        onNextPage={() =>
          setPageIndex((p) => Math.min(pageCount - 1, p + 1))
        }
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPageIndex(0);
        }}
        previousLabel={t("tablePrev")}
        nextLabel={t("tableNext")}
        rowsLabel={t("tableRows")}
        getRowId={(row) => row.ref.orgNodeId}
        toolbar={
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <FilterField label={t("search")} className="min-w-[14rem] flex-1">
              <SearchInput
                size="sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("agenciesSearch")}
              />
            </FilterField>
          </div>
        }
      />

      <p className="text-xs text-muted">{t("agenciesPayModeIntro")}</p>
    </div>
  );
}
