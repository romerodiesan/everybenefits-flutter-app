"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import type { Carrier, CarrierMarket } from "@pulse/shared";
import { CARRIER_MARKETS } from "@pulse/shared";
import {
  deleteCarrier,
  importCarrierStateRates,
  upsertCarrier,
} from "@/lib/firebase/functions";
import { useCarriers, useInvalidatePayments } from "@/lib/payments-queries";
import {
  downloadCarrierRatesTemplate,
  parseCarrierRatesFile,
  sanitizeCarrierRatesRows,
} from "@/lib/carrier-rates-import";
import { Link } from "@/i18n/navigation";
import { Button, SearchInput } from "@/components/ui/primitives";
import { DataTable } from "@/components/ui/data-table";
import { useAlerts } from "@/lib/providers/alert-provider";

const CARRIER_CODE_RE = /^\d{4}$/;

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
  const { data: rows = [], isLoading, isFetching, isError, refetch } = useCarriers();
  const inv = useInvalidatePayments();
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
  const [importBusy, setImportBusy] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const codeValid = CARRIER_CODE_RE.test(code.trim());

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
      await refetch();
      await inv.invalidatePlanWorkspace();
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

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!codeValid) {
      setError(t("carrierCodeInvalid"));
      return;
    }
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

  async function onImportFile(file: File | null) {
    if (!file) return;
    setImportBusy(true);
    setError(null);
    setImportSummary(null);
    try {
      const rows = sanitizeCarrierRatesRows(await parseCarrierRatesFile(file));
      if (rows.length === 0) {
        setError(t("carrierRatesImportEmpty"));
        return;
      }
      const result = await importCarrierStateRates(rows);
      setImportSummary(
        t("carrierRatesImportDone", {
          imported: result.imported,
          updated: result.updated,
          created: result.carriersCreated,
          errors: result.errors.length,
        }),
      );
      await reload();
    } catch (err) {
      const message =
        err instanceof Error && err.message.trim()
          ? err.message
          : t("carrierRatesImportFailed");
      setError(message);
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-10">
      <header>
        <h1 className="font-display text-3xl font-bold">{t("carriersTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("carriersSubtitle")}</p>
      </header>

      <form onSubmit={onCreate} className="studio-panel space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
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
              inputMode="numeric"
              maxLength={4}
              pattern="\d{4}"
              placeholder="1001"
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              required
            />
            {!codeValid && code.length > 0 ? (
              <span className="mt-1 block text-[10px] text-red-600">
                {t("carrierCodeInvalid")}
              </span>
            ) : null}
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
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-glass-border pt-3">
          <Button
            type="submit"
            size="sm"
            className="px-3"
            disabled={busy || !name.trim() || !codeValid}
          >
            {t("create")}
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={importBusy}
              onClick={() => downloadCarrierRatesTemplate()}
            >
              {t("carrierRatesDownloadTemplate")}
            </Button>
            <label className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-glass-border bg-sheet px-2.5 text-xs font-semibold text-ink transition hover:bg-white/[0.04]">
              {importBusy ? t("loading") : t("carrierRatesUpload")}
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                className="hidden"
                disabled={importBusy}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  e.target.value = "";
                  void onImportFile(file);
                }}
              />
            </label>
          </div>
        </div>
      </form>

      {importSummary ? (
        <p className="text-xs text-emerald-700">{importSummary}</p>
      ) : null}

      {error || isError ? (
        <p className="text-sm text-red-600">{error ?? t("errorGeneric")}</p>
      ) : null}

      <DataTable
        columns={columns}
        data={pagedRows}
        loading={(isLoading || busy) && rows.length === 0}
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
