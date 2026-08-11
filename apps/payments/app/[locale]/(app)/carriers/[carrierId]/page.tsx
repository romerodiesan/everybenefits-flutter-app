"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import type {
  Carrier,
  CarrierMarket,
  CarrierRateUnit,
  CarrierStateRate,
} from "@pulse/shared";
import {
  CARRIER_RATE_UNITS,
  US_STATES,
  usedCarrierStates,
} from "@pulse/shared";
import {
  deleteCarrierStateRate,
  listCarriers,
  listCarrierStateRates,
  upsertCarrierStateRate,
} from "@/lib/firebase/functions";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/primitives";
import { StateSearchSelect } from "@/components/ui/state-search-select";
import { useAlerts } from "@/lib/providers/alert-provider";

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

function stateName(code: string): string {
  return US_STATES.find((s) => s.code === code)?.name ?? code;
}

function formatRate(amount: number, unit: CarrierRateUnit): string {
  if (unit === "percent") return `${amount}%`;
  return `$${amount.toLocaleString()}`;
}

function UnitSelect({
  value,
  onChange,
}: {
  value: CarrierRateUnit;
  onChange: (u: CarrierRateUnit) => void;
}) {
  return (
    <select
      className="rounded-md border border-glass-border bg-sheet px-1.5 py-1 text-xs"
      value={value}
      onChange={(e) => onChange(e.target.value as CarrierRateUnit)}
    >
      {CARRIER_RATE_UNITS.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  );
}

export default function CarrierRatesPage() {
  const t = useTranslations();
  const alerts = useAlerts();
  const params = useParams<{ carrierId: string }>();
  const carrierId = params.carrierId;

  const [carrier, setCarrier] = useState<Carrier | null>(null);
  const [rates, setRates] = useState<CarrierStateRate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [rateState, setRateState] = useState("");
  const [commissionValue, setCommissionValue] = useState("0");
  const [commissionUnit, setCommissionUnit] =
    useState<CarrierRateUnit>("flat");
  const [overrideValue, setOverrideValue] = useState("25");
  const [overrideUnit, setOverrideUnit] = useState<CarrierRateUnit>("flat");

  const availableStates = useMemo(() => {
    const used = usedCarrierStates(rates);
    // When editing, keep the current state selectable.
    if (editingId) {
      const current = rates.find((r) => r.id === editingId);
      if (current) used.delete(current.state.toUpperCase());
    }
    return US_STATES.filter((s) => !used.has(s.code));
  }, [rates, editingId]);

  const sortedRates = useMemo(
    () => rates.slice().sort((a, b) => a.state.localeCompare(b.state)),
    [rates],
  );

  function resetForm() {
    setEditingId(null);
    setRateState("");
    setCommissionValue("0");
    setCommissionUnit("flat");
    setOverrideValue("25");
    setOverrideUnit("flat");
  }

  function startEdit(row: CarrierStateRate) {
    setEditingId(row.id);
    setRateState(row.state);
    setCommissionValue(String(row.commissionRate));
    setCommissionUnit(row.commissionRateUnit);
    setOverrideValue(String(row.overrideRate));
    setOverrideUnit(row.overrideRateUnit);
    setError(null);
  }

  async function load() {
    setBusy(true);
    setError(null);
    setNotFound(false);
    try {
      const [carriers, nextRates] = await Promise.all([
        listCarriers(),
        listCarrierStateRates(carrierId),
      ]);
      const found =
        carriers
          .map((c) => ({ ...c, market: carrierMarket(c.market) }))
          .find((c) => c.id === carrierId && c.active !== false) ?? null;
      if (!found) {
        setNotFound(true);
        setCarrier(null);
        setRates([]);
        return;
      }
      setCarrier(found);
      setRates(nextRates);
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrierId]);

  async function onSaveRate(e: React.FormEvent) {
    e.preventDefault();
    if (!carrierId || !rateState) return;
    const commissionRate = Number(commissionValue);
    const overrideRate = Number(overrideValue);
    if (!Number.isFinite(commissionRate) || !Number.isFinite(overrideRate)) {
      setError(t("errorGeneric"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await upsertCarrierStateRate({
        id: editingId ?? undefined,
        carrierId,
        state: rateState,
        commissionRate,
        commissionRateUnit: commissionUnit,
        overrideRate,
        overrideRateUnit: overrideUnit,
        active: true,
      });
      resetForm();
      const nextRates = await listCarrierStateRates(carrierId);
      setRates(nextRates);
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteRate(row: CarrierStateRate) {
    const confirmed = await alerts.confirm({
      title: t("deleteStateRateTitle"),
      description: t("deleteStateRateConfirm", {
        state: `${row.state} — ${stateName(row.state)}`,
      }),
      confirmLabel: t("delete"),
      danger: true,
    });
    if (!confirmed) return;
    setRowBusy(row.id);
    setError(null);
    try {
      await deleteCarrierStateRate(row.id);
      if (editingId === row.id) resetForm();
      alerts.success(t("deleteStateRateDone"));
      const nextRates = await listCarrierStateRates(carrierId);
      setRates(nextRates);
    } catch {
      alerts.error(t("errorGeneric"));
    } finally {
      setRowBusy(null);
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6 lg:p-10">
        <p className="text-sm text-muted">{t("carrierNotFound")}</p>
        <Link
          href="/carriers"
          className="text-xs font-semibold text-brand hover:underline"
        >
          {t("backToCarriers")}
        </Link>
      </div>
    );
  }

  if (!carrier && !error) {
    return <p className="p-6 text-sm text-muted">{t("loading")}</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6 lg:p-10">
      <div>
        <Link
          href="/carriers"
          className="text-[11px] font-semibold text-muted hover:text-ink"
        >
          ← {t("backToCarriers")}
        </Link>
      </div>

      <header className="space-y-1">
        <p className="text-[10px] uppercase tracking-wide text-muted">
          {carrier?.code} · {marketLabel(t, carrier?.market)}
        </p>
        <h1 className="font-display text-2xl font-bold">
          {t("stateRatesFor", { name: carrier?.name ?? "" })}
        </h1>
        <p className="max-w-2xl text-xs text-muted">{t("stateRatesHint")}</p>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <form
        onSubmit={onSaveRate}
        className="studio-panel grid gap-2 rounded-xl p-3 sm:grid-cols-[minmax(9rem,1fr)_auto_auto_auto]"
      >
        <label className="block text-xs sm:col-span-1">
          <span className="text-muted">
            {editingId ? t("editingState") : t("state")}
          </span>
          {editingId ? (
            <p className="mt-1 flex h-8 items-center rounded-lg border border-glass-border bg-sheet px-2.5 text-xs font-semibold">
              {rateState} — {stateName(rateState)}
            </p>
          ) : (
            <StateSearchSelect
              states={availableStates}
              value={rateState}
              onChange={setRateState}
              placeholder={t("searchState")}
              emptyLabel={t("noStatesLeft")}
              disabled={busy || availableStates.length === 0}
            />
          )}
        </label>

        <div className="grid gap-0.5 text-xs">
          <span className="text-muted">{t("commission")}</span>
          <div className="flex gap-1.5">
            <input
              type="number"
              step="any"
              min={0}
              className="h-8 w-20 rounded-md border border-glass-border bg-sheet px-2 text-xs"
              value={commissionValue}
              onChange={(e) => setCommissionValue(e.target.value)}
              required
            />
            <UnitSelect value={commissionUnit} onChange={setCommissionUnit} />
          </div>
        </div>

        <div className="grid gap-0.5 text-xs">
          <span className="text-muted">{t("override")}</span>
          <div className="flex gap-1.5">
            <input
              type="number"
              step="any"
              min={0}
              className="h-8 w-20 rounded-md border border-glass-border bg-sheet px-2 text-xs"
              value={overrideValue}
              onChange={(e) => setOverrideValue(e.target.value)}
              required
            />
            <UnitSelect value={overrideUnit} onChange={setOverrideUnit} />
          </div>
        </div>

        <div className="flex items-end gap-1.5">
          {editingId ? (
            <Button
              type="button"
              variant="ghost"
              className="h-8 rounded-lg px-2.5 text-xs"
              disabled={busy}
              onClick={resetForm}
            >
              {t("cancelEdit")}
            </Button>
          ) : null}
          <Button
            type="submit"
            className="h-8 rounded-lg px-3 text-xs"
            disabled={
              busy ||
              !rateState ||
              (!editingId && availableStates.length === 0)
            }
          >
            {editingId ? t("saveRate") : t("addRate")}
          </Button>
        </div>
      </form>

      {sortedRates.length === 0 ? (
        <p className="studio-panel py-6 text-center text-xs text-muted">
          {busy ? t("loading") : t("emptyRates")}
        </p>
      ) : (
        <ul className="studio-panel overflow-hidden rounded-xl">
          {sortedRates.map((row, index) => {
            const selected = editingId === row.id;
            const isLast = index === sortedRates.length - 1;
            return (
              <li
                key={row.id}
                className={`grid gap-2 px-3 py-2 sm:grid-cols-[5.5rem_1fr_1fr_auto] sm:items-center ${
                  selected ? "bg-brand/[0.06]" : ""
                } ${isLast ? "" : "border-b border-glass-border"}`}
              >
                <div>
                  <p className="text-sm font-semibold tracking-wide">
                    {row.state}
                  </p>
                  <p className="text-[10px] text-muted">
                    {stateName(row.state)}
                  </p>
                </div>
                <div className="rounded-lg bg-black/[0.03] px-2.5 py-1.5 dark:bg-white/[0.04]">
                  <p className="text-[10px] uppercase tracking-wide text-muted">
                    {t("commission")}
                  </p>
                  <p className="mt-0.5 text-sm font-medium tabular-nums">
                    {formatRate(row.commissionRate, row.commissionRateUnit)}
                  </p>
                </div>
                <div className="rounded-lg bg-black/[0.03] px-2.5 py-1.5 dark:bg-white/[0.04]">
                  <p className="text-[10px] uppercase tracking-wide text-muted">
                    {t("override")}
                  </p>
                  <p className="mt-0.5 text-sm font-medium tabular-nums">
                    {formatRate(row.overrideRate, row.overrideRateUnit)}
                  </p>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    type="button"
                    variant={selected ? "primary" : "secondary"}
                    className="h-7 rounded-lg px-2.5 text-[11px]"
                    disabled={busy || rowBusy === row.id}
                    onClick={() => startEdit(row)}
                  >
                    {t("editRate")}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="h-7 rounded-lg px-2.5 text-[11px]"
                    disabled={busy || rowBusy === row.id}
                    onClick={() => void onDeleteRate(row)}
                  >
                    {t("delete")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
