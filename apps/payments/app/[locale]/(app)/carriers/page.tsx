"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import type { Carrier, CarrierMarket } from "@pulse/shared";
import { CARRIER_MARKETS } from "@pulse/shared";
import {
  deleteCarrier,
  listCarriers,
  upsertCarrier,
} from "@/lib/firebase/functions";
import { Link } from "@/i18n/navigation";
import { Button, SearchInput } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data-table";
import { useAlerts } from "@/lib/providers/alert-provider";

const FILTER_SELECT_CLASS =
  "h-8 w-full min-w-[9.5rem] rounded-lg border border-glass-border bg-transparent px-2.5 text-xs text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

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

function carrierMarket(value: unknown): CarrierMarket {
  return value === "medicare" || value === "life" || value === "aca"
    ? value
    : "aca";
}

function marketLabel(
  t: ReturnType<typeof useTranslations>,
  value: unknown,
): string {
  switch (carrierMarket(value)) {
    case "medicare":
      return t("market_medicare");
    case "life":
      return t("market_life");
    default:
      return t("market_aca");
  }
}

export default function CarriersPage() {
  const t = useTranslations();
  const alerts = useAlerts();
  const [rows, setRows] = useState<Carrier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [market, setMarket] = useState<CarrierMarket>("aca");
  const [search, setSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState<CarrierMarket | "">("");
  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = useState(0);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (marketFilter && carrierMarket(row.market) !== marketFilter) {
        return false;
      }
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.code.toLowerCase().includes(q)
      );
    });
  }, [rows, search, marketFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, pageIndex, pageSize]);

  useEffect(() => {
    setPageIndex(0);
  }, [pageSize, filteredRows.length, search, marketFilter]);

  async function reload() {
    setBusy(true);
    setError(null);
    try {
      const carriers = await listCarriers();
      setRows(
        carriers
          .filter((c) => c.active !== false)
          .map((c) => ({
            ...c,
            market: carrierMarket(c.market),
          })),
      );
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(carrier: Carrier) {
    const confirmed = await alerts.confirm({
      title: t("deleteCarrierTitle"),
      description: t("deleteCarrierConfirm", { name: carrier.name }),
      confirmLabel: t("delete"),
      danger: true,
    });
    if (!confirmed) return;
    setRowBusy(carrier.id);
    setError(null);
    try {
      await deleteCarrier(carrier.id);
      alerts.success(t("deleteCarrierDone"));
      await reload();
    } catch {
      alerts.error(t("errorGeneric"));
    } finally {
      setRowBusy(null);
    }
  }

  const columns = useMemo<ColumnDef<Carrier, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("name"),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "code",
        header: t("code"),
        cell: ({ row }) => (
          <span className="text-muted">{row.original.code}</span>
        ),
      },
      {
        id: "market",
        header: t("market"),
        cell: ({ row }) => marketLabel(t, row.original.market),
      },
      {
        id: "actions",
        header: t("actions"),
        cell: ({ row }) => {
          const carrier = row.original;
          const deleting = rowBusy === carrier.id;
          return (
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <Link
                href={`/carriers/${carrier.id}`}
                className="inline-flex h-7 items-center rounded-lg border border-glass-border bg-sheet px-2.5 text-[11px] font-semibold text-ink hover:bg-ink/[0.04]"
              >
                {t("manageRates")}
              </Link>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={busy || deleting}
                onClick={() => void onDelete(carrier)}
              >
                {t("delete")}
              </Button>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, busy, rowBusy],
  );

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await upsertCarrier({
        name: name.trim(),
        code: code.trim(),
        market,
        active: true,
      });
      setName("");
      setCode("");
      setMarket("aca");
      await reload();
    } catch {
      setError(t("errorGeneric"));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-10">
      <header>
        <h1 className="font-display text-3xl font-bold">{t("carriersTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("carriersSubtitle")}</p>
      </header>

      <form
        onSubmit={onCreate}
        className="studio-panel grid gap-2 p-3 sm:grid-cols-4"
      >
        <label className="block text-xs">
          <span className="text-muted">{t("name")}</span>
          <input
            className="mt-1 h-8 w-full rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="block text-xs">
          <span className="text-muted">{t("code")}</span>
          <input
            className="mt-1 h-8 w-full rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </label>
        <label className="block text-xs">
          <span className="text-muted">{t("market")}</span>
          <select
            className="mt-1 h-8 w-full rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
            value={market}
            onChange={(e) => setMarket(e.target.value as CarrierMarket)}
          >
            {CARRIER_MARKETS.map((m) => (
              <option key={m} value={m}>
                {marketLabel(t, m)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <Button
            type="submit"
            size="sm"
            className="px-3"
            disabled={busy || !name.trim() || !code.trim()}
          >
            {t("create")}
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <DataTable
        columns={columns}
        data={pagedRows}
        loading={busy && rows.length === 0}
        isFetching={busy && rows.length > 0}
        emptyTitle={
          rows.length > 0 && filteredRows.length === 0
            ? t("carriersNoMatches")
            : t("empty")
        }
        emptyHint={
          rows.length > 0 && filteredRows.length === 0
            ? t("carriersNoMatchesHint")
            : t("carriersEmptyHint")
        }
        getRowId={(row) => row.id}
        pageSize={pageSize}
        canPreviousPage={pageIndex > 0}
        canNextPage={pageIndex + 1 < pageCount}
        onPreviousPage={() => setPageIndex((i) => Math.max(0, i - 1))}
        onNextPage={() =>
          setPageIndex((i) => Math.min(pageCount - 1, i + 1))
        }
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPageIndex(0);
        }}
        previousLabel={t("tablePrev")}
        nextLabel={t("tableNext")}
        rowsLabel={t("tableRows")}
        toolbar={
          <>
            <FilterField
              label={t("carriersSearchLabel")}
              className="min-w-[16rem] flex-1"
            >
              <SearchInput
                size="sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("carriersSearch")}
                aria-label={t("carriersSearchLabel")}
              />
            </FilterField>
            <FilterField label={t("market")}>
              <select
                value={marketFilter}
                onChange={(e) =>
                  setMarketFilter(e.target.value as CarrierMarket | "")
                }
                className={FILTER_SELECT_CLASS}
              >
                <option value="">{t("filterAll")}</option>
                {CARRIER_MARKETS.map((m) => (
                  <option key={m} value={m}>
                    {marketLabel(t, m)}
                  </option>
                ))}
              </select>
            </FilterField>
          </>
        }
      />
    </div>
  );
}
