"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type {
  CompensationPlan,
  CompensationPlanSlot,
  PayMode,
} from "@pulse/shared";
import type { CompensationPlanPreview } from "@/lib/firebase/functions";
import {
  useApplyPlanMutation,
  useDeletePlanMutation,
  usePaymentsPlanWorkspace,
  usePreviewPlanMutation,
  useUpsertPlanMutation,
} from "@/lib/payments-queries";
import { Button } from "@/components/ui/primitives";
import { PlansSubnav } from "@/components/payments/plans-subnav";

type WizardStep = 1 | 2 | 3 | 4 | 5;

function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export default function CompensationPlansPage() {
  const t = useTranslations();
  const {
    data: workspace,
    isLoading: workspaceLoading,
    isFetching: workspaceFetching,
    isError: workspaceError,
    refetch: refetchWorkspace,
  } = usePaymentsPlanWorkspace();
  const plans = workspace?.plans ?? [];
  const tiers = workspace?.tiers ?? [];
  const groups = workspace?.groups ?? [];
  const carriers = workspace?.carriers ?? [];
  const participants = workspace?.participants ?? [];
  const upsertPlanMutation = useUpsertPlanMutation();
  const deletePlanMutation = useDeletePlanMutation();
  const previewMutation = usePreviewPlanMutation();
  const applyMutation = useApplyPlanMutation();
  const [error, setError] = useState<string | null>(null);
  const busy =
    workspaceFetching ||
    upsertPlanMutation.isPending ||
    deletePlanMutation.isPending ||
    previewMutation.isPending ||
    applyMutation.isPending;
  const [step, setStep] = useState<WizardStep>(1);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  // Plan draft
  const [planName, setPlanName] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [planCarrierIds, setPlanCarrierIds] = useState<string[]>([]);
  const [agencyRootTierId, setAgencyRootTierId] = useState("");
  const [agencyChildTierId, setAgencyChildTierId] = useState("");
  const [agentDefaultTierId, setAgentDefaultTierId] = useState("");
  const [agentGroupId, setAgentGroupId] = useState("");
  const [agentGroupTierId, setAgentGroupTierId] = useState("");
  const [payModeDefault, setPayModeDefault] =
    useState<PayMode>("through_agency");
  const [retentionPct, setRetentionPct] = useState("0");

  // Apply draft
  const [applyAgencyIds, setApplyAgencyIds] = useState<string[]>([]);
  const [includeDescendants, setIncludeDescendants] = useState(true);
  const [applyCarrierIds, setApplyCarrierIds] = useState<string[]>([]);
  const [applyPayMode, setApplyPayMode] = useState<PayMode | "">("");
  const [applyRetentionPct, setApplyRetentionPct] = useState("");
  const [preview, setPreview] = useState<CompensationPlanPreview | null>(null);
  const [applyResult, setApplyResult] = useState<string | null>(null);

  const agencies = useMemo(
    () =>
      participants
        .filter((p) => p.type === "agency" && p.active)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [participants],
  );
  const activeCarriers = useMemo(
    () =>
      carriers
        .filter((c) => c.active !== false)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [carriers],
  );
  const agencyTiers = useMemo(
    () => tiers.filter((x) => x.active && (x.kind === "agency" || x.kind === "generic")),
    [tiers],
  );
  const agentTiers = useMemo(
    () => tiers.filter((x) => x.active && (x.kind === "agent" || x.kind === "generic")),
    [tiers],
  );

  function buildSlots(): CompensationPlanSlot[] {
    const slots: CompensationPlanSlot[] = [];
    if (agencyRootTierId) {
      slots.push({
        role: "agency_root",
        tierId: agencyRootTierId,
        rate: null,
        rateUnit: "pmpm",
        agentRateGroupId: null,
        participantIds: [],
      });
    }
    if (agencyChildTierId) {
      slots.push({
        role: "agency_child",
        tierId: agencyChildTierId,
        rate: null,
        rateUnit: "pmpm",
        agentRateGroupId: null,
        participantIds: [],
      });
    }
    if (agentDefaultTierId) {
      slots.push({
        role: "agent_default",
        tierId: agentDefaultTierId,
        rate: null,
        rateUnit: "pmpm",
        agentRateGroupId: null,
        participantIds: [],
      });
    }
    if (agentGroupId && agentGroupTierId) {
      slots.push({
        role: "agent_group",
        tierId: agentGroupTierId,
        rate: null,
        rateUnit: "pmpm",
        agentRateGroupId: agentGroupId,
        participantIds: [],
      });
    }
    return slots;
  }

  async function savePlan() {
    const slots = buildSlots();
    if (!planName.trim() || slots.length === 0) {
      setError(t("plansNeedSlots"));
      return null;
    }
    setError(null);
    try {
      const plan = await upsertPlanMutation.mutateAsync({
        id: editingPlanId ?? undefined,
        name: planName.trim(),
        carrierIds: planCarrierIds,
        slots,
        payModeDefault,
        retentionFractionDefault: Math.min(
          1,
          Math.max(0, Number(retentionPct) / 100),
        ),
        effectiveFrom,
        effectiveTo: null,
        active: true,
      });
      setEditingPlanId(plan.id);
      await refetchWorkspace();
      return plan;
    } catch {
      setError(t("errorGeneric"));
      return null;
    }
  }

  function loadPlanIntoWizard(plan: CompensationPlan) {
    setEditingPlanId(plan.id);
    setPlanName(plan.name);
    setEffectiveFrom(plan.effectiveFrom.slice(0, 10));
    setPlanCarrierIds(plan.carrierIds);
    setPayModeDefault(plan.payModeDefault);
    setRetentionPct(String(Math.round(plan.retentionFractionDefault * 100)));
    setAgencyRootTierId(
      plan.slots.find((s) => s.role === "agency_root")?.tierId ?? "",
    );
    setAgencyChildTierId(
      plan.slots.find((s) => s.role === "agency_child")?.tierId ?? "",
    );
    setAgentDefaultTierId(
      plan.slots.find((s) => s.role === "agent_default")?.tierId ?? "",
    );
    const gs = plan.slots.find((s) => s.role === "agent_group");
    setAgentGroupId(gs?.agentRateGroupId ?? "");
    setAgentGroupTierId(gs?.tierId ?? "");
    setApplyCarrierIds(plan.carrierIds);
    setApplyPayMode("");
    setPreview(null);
    setApplyResult(null);
    setStep(1);
  }

  async function onPreview() {
    const plan = await savePlan();
    if (!plan) return;
    if (applyAgencyIds.length === 0) {
      setError(t("plansNeedAgencies"));
      return;
    }
    const carriersForApply =
      applyCarrierIds.length > 0 ? applyCarrierIds : plan.carrierIds;
    if (carriersForApply.length === 0) {
      setError(t("plansNeedCarriers"));
      return;
    }
    setError(null);
    try {
      const res = await previewMutation.mutateAsync({
        planId: plan.id,
        agencyParticipantIds: applyAgencyIds,
        includeDescendantAgencies: includeDescendants,
        carrierIds: carriersForApply,
        payMode: applyPayMode || null,
        retentionFraction:
          applyRetentionPct === ""
            ? null
            : Math.min(1, Math.max(0, Number(applyRetentionPct) / 100)),
        effectiveFrom,
      });
      setPreview(res);
      setStep(5);
    } catch {
      setError(t("errorGeneric"));
    }
  }

  async function onApply() {
    if (!editingPlanId) return;
    setError(null);
    try {
      const carriersForApply =
        applyCarrierIds.length > 0
          ? applyCarrierIds
          : plans.find((p) => p.id === editingPlanId)?.carrierIds ?? [];
      const res = await applyMutation.mutateAsync({
        planId: editingPlanId,
        agencyParticipantIds: applyAgencyIds,
        includeDescendantAgencies: includeDescendants,
        carrierIds: carriersForApply,
        payMode: applyPayMode || null,
        retentionFraction:
          applyRetentionPct === ""
            ? null
            : Math.min(1, Math.max(0, Number(applyRetentionPct) / 100)),
        effectiveFrom,
      });
      setApplyResult(
        t("plansApplySuccess", {
          terms: res.termCount,
          agencies: res.agencyCount,
          agents: res.agentCount,
          carriers: res.carrierCount,
        }),
      );
      setPreview(null);
      await refetchWorkspace();
    } catch {
      setError(t("errorGeneric"));
    }
  }

  async function onDeletePlan(id: string) {
    try {
      await deletePlanMutation.mutateAsync(id);
      if (editingPlanId === id) {
        setEditingPlanId(null);
        setPlanName("");
      }
      await refetchWorkspace();
    } catch {
      setError(t("errorGeneric"));
    }
  }

  const ladderPreview = useMemo(() => {
    const root = tiers.find((x) => x.id === agencyRootTierId);
    const child = tiers.find((x) => x.id === agencyChildTierId);
    const writing = tiers.find((x) => x.id === agentDefaultTierId);
    return { root, child, writing };
  }, [tiers, agencyRootTierId, agencyChildTierId, agentDefaultTierId]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-10">
      <header>
        <h1 className="font-display text-3xl font-bold">{t("plansTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("plansSubtitle")}</p>
      </header>
      <PlansSubnav />

      {error || workspaceError ? <p className="text-sm text-red-600">{error ?? t("errorGeneric")}</p> : null}
      {applyResult ? (
        <p className="text-sm text-emerald-700">{applyResult}</p>
      ) : null}

      <div className="flex flex-wrap gap-2 text-xs text-muted">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`rounded-full px-3 py-1 ${
              step === n ? "bg-brand text-on-brand" : "bg-white/[0.04]"
            }`}
            onClick={() => setStep(n as WizardStep)}
          >
            {t(`plansStep${n}`)}
          </button>
        ))}
      </div>

      <div className="studio-panel space-y-4 p-4">
        {step === 1 ? (
          <>
            <p className="text-sm text-muted">{t("plansStep1Help")}</p>
            <label className="block text-sm">
              <span className="text-muted">{t("name")}</span>
              <input
                className="mt-1 h-8 w-full max-w-md rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">{t("effectiveFrom")}</span>
              <input
                type="date"
                className="mt-1 h-8 w-full max-w-xs rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
            </label>
            <div>
              <p className="text-sm text-muted">{t("plansSelectCarriers")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setPlanCarrierIds(activeCarriers.map((c) => c.id))
                  }
                >
                  {t("plansSelectAllCarriers")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setPlanCarrierIds([])}
                >
                  {t("plansClear")}
                </Button>
              </div>
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-glass-border p-2">
                {activeCarriers.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-white/[0.03]"
                  >
                    <input
                      type="checkbox"
                      checked={planCarrierIds.includes(c.id)}
                      onChange={() =>
                        setPlanCarrierIds((prev) => toggleId(prev, c.id))
                      }
                    />
                    {c.name} ({c.code})
                  </label>
                ))}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setStep(2)}
              disabled={!planName.trim()}
            >
              {t("plansNext")}
            </Button>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <p className="text-sm text-muted">{t("plansStep2Help")}</p>
            <div>
              <p className="text-sm text-muted">{t("plansSelectAgencies")}</p>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeDescendants}
                  onChange={(e) => setIncludeDescendants(e.target.checked)}
                />
                {t("plansIncludeDescendants")}
              </label>
              <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-glass-border p-2">
                {agencies.map((a) => (
                  <label
                    key={a.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-white/[0.03]"
                  >
                    <input
                      type="checkbox"
                      checked={applyAgencyIds.includes(a.id)}
                      onChange={() =>
                        setApplyAgencyIds((prev) => toggleId(prev, a.id))
                      }
                    />
                    {a.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setStep(1)}
              >
                {t("plansBack")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setStep(3)}
                disabled={applyAgencyIds.length === 0}
              >
                {t("plansNext")}
              </Button>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <p className="text-sm text-muted">{t("plansStep3Help")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-muted">{t("plansSlotAgencyRoot")}</span>
                <select
                  className="mt-1 h-8 w-full rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
                  value={agencyRootTierId}
                  onChange={(e) => setAgencyRootTierId(e.target.value)}
                >
                  <option value="">{t("plansPickTier")}</option>
                  {agencyTiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name} (${tier.rate})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-muted">{t("plansSlotAgencyChild")}</span>
                <select
                  className="mt-1 h-8 w-full rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
                  value={agencyChildTierId}
                  onChange={(e) => setAgencyChildTierId(e.target.value)}
                >
                  <option value="">{t("plansOptional")}</option>
                  {agencyTiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name} (${tier.rate})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-muted">{t("plansSlotAgentDefault")}</span>
                <select
                  className="mt-1 h-8 w-full rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
                  value={agentDefaultTierId}
                  onChange={(e) => setAgentDefaultTierId(e.target.value)}
                >
                  <option value="">{t("plansPickTier")}</option>
                  {agentTiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name} (${tier.rate})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-muted">{t("plansSlotAgentGroup")}</span>
                <select
                  className="mt-1 h-8 w-full rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
                  value={agentGroupId}
                  onChange={(e) => setAgentGroupId(e.target.value)}
                >
                  <option value="">{t("plansOptional")}</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              {agentGroupId ? (
                <label className="block text-sm">
                  <span className="text-muted">{t("plansSlotAgentGroupTier")}</span>
                  <select
                    className="mt-1 h-8 w-full rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
                    value={agentGroupTierId}
                    onChange={(e) => setAgentGroupTierId(e.target.value)}
                  >
                    <option value="">{t("plansPickTier")}</option>
                    {agentTiers.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.name} (${tier.rate})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            {(ladderPreview.root || ladderPreview.writing) && (
              <div className="rounded-lg border border-glass-border bg-white/[0.02] p-3 text-sm">
                <p className="font-medium">{t("plansLadderTitle")}</p>
                <p className="mt-2 text-muted">
                  {[
                    ladderPreview.root
                      ? `${t("plansSlotAgencyRoot")} $${ladderPreview.root.rate}`
                      : null,
                    ladderPreview.child
                      ? `${t("plansSlotAgencyChild")} $${ladderPreview.child.rate}`
                      : null,
                    ladderPreview.writing
                      ? `${t("plansSlotAgentDefault")} $${ladderPreview.writing.rate}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" → ")}
                </p>
                {ladderPreview.root && ladderPreview.writing ? (
                  <p className="mt-1 text-xs text-muted">
                    {t("plansLadderSpread", {
                      spread: (
                        ladderPreview.root.rate - ladderPreview.writing.rate
                      ).toFixed(2),
                    })}
                  </p>
                ) : null}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setStep(2)}
              >
                {t("plansBack")}
              </Button>
              <Button type="button" size="sm" onClick={() => setStep(4)}>
                {t("plansNext")}
              </Button>
            </div>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <p className="text-sm text-muted">{t("plansStep4Help")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-muted">{t("plansPayMode")}</span>
                <select
                  className="mt-1 h-8 w-full rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
                  value={payModeDefault}
                  onChange={(e) =>
                    setPayModeDefault(e.target.value as PayMode)
                  }
                >
                  <option value="through_agency">
                    {t("plansPayMode_through_agency")}
                  </option>
                  <option value="direct">{t("plansPayMode_direct")}</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-muted">{t("plansRetention")}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="1"
                  className="mt-1 h-8 w-full rounded-lg border border-glass-border bg-sheet px-2.5 text-xs"
                  value={retentionPct}
                  onChange={(e) => setRetentionPct(e.target.value)}
                  disabled={payModeDefault === "direct"}
                />
              </label>
            </div>
            <p className="text-xs text-muted">
              {payModeDefault === "direct"
                ? t("plansPayModeDirectHint")
                : t("plansPayModeAgencyHint")}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setStep(3)}
              >
                {t("plansBack")}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => void onPreview()}
              >
                {t("plansPreview")}
              </Button>
            </div>
          </>
        ) : null}

        {step === 5 ? (
          <>
            <p className="text-sm text-muted">{t("plansStep5Help")}</p>
            {preview ? (
              <div className="space-y-2 rounded-lg border border-glass-border p-3 text-sm">
                <p>
                  {t("plansPreviewSummary", {
                    terms: preview.termCount,
                    create: preview.diff.create,
                    update: preview.diff.update,
                    agencies: preview.agencyCount,
                    agents: preview.agentCount,
                    carriers: preview.carrierCount,
                  })}
                </p>
                <p className="text-muted">
                  {preview.payMode === "direct"
                    ? t("plansPayMode_direct")
                    : t("plansPayMode_through_agency")}
                  {preview.payMode === "through_agency"
                    ? ` · ${t("plansRetention")}: ${Math.round(preview.retentionFraction * 100)}%`
                    : null}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">{t("plansPreviewEmpty")}</p>
            )}
            <label className="block text-sm">
              <span className="text-muted">{t("plansApplyCarriersOverride")}</span>
              <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-glass-border p-2">
                {activeCarriers.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-white/[0.03]"
                  >
                    <input
                      type="checkbox"
                      checked={applyCarrierIds.includes(c.id)}
                      onChange={() =>
                        setApplyCarrierIds((prev) => toggleId(prev, c.id))
                      }
                    />
                    {c.name} ({c.code})
                  </label>
                ))}
              </div>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setStep(4)}
              >
                {t("plansBack")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => void onPreview()}
              >
                {t("plansPreview")}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy || !preview}
                onClick={() => void onApply()}
              >
                {t("plansApply")}
              </Button>
            </div>
          </>
        ) : null}
      </div>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold">
          {t("plansSavedTitle")}
        </h2>
        <div className="studio-panel overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-glass-border text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{t("name")}</th>
                <th className="px-4 py-3 font-medium">{t("plansPayMode")}</th>
                <th className="px-4 py-3 font-medium">{t("effectiveFrom")}</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted" colSpan={4}>
                    {workspaceLoading ? t("loading") : t("plansEmpty")}
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="border-t border-glass-border">
                    <td className="px-4 py-3 font-medium">{plan.name}</td>
                    <td className="px-4 py-3">
                      {t(`plansPayMode_${plan.payModeDefault}`)}
                    </td>
                    <td className="px-4 py-3">{plan.effectiveFrom}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => loadPlanIntoWizard(plan)}
                      >
                        {t("plansEdit")}
                      </Button>{" "}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void onDeletePlan(plan.id)}
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
      </section>
    </div>
  );
}
