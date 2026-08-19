"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  POLL_AUDIENCES,
  POLL_LIMITS,
  POLL_SURFACES,
  withPollCompatDefaults,
  type Poll,
  type PollAudience,
  type PollLocalizedString,
  type PollOption,
  type PollSurface,
} from "@pulse/shared";
import { useAlerts } from "@/lib/providers/alert-provider";
import { useAccess } from "@/lib/providers/auth-provider";
import { can, canManagePlatform } from "@/lib/roles";
import { useRouter } from "@/i18n/navigation";
import { getAdminRepository } from "@/lib/repositories/admin-repository";
import { watchPoll } from "@/lib/firebase/polls";
import {
  datetimeLocalToMillis,
  fillLocalized,
  functionsErrorMessage,
  mergeCampaignItem,
  millisToDatetimeLocal,
} from "@/lib/campaign-form";
import { Button, Input, Label } from "@/components/ui/primitives";
import {
  CampaignFilterBar,
  CampaignLibraryItem,
  CampaignWorkspace,
} from "@/components/admin/campaign-workspace";
import {
  PollComposeCard,
  PollLearnerPreview,
  PollPreviewSkeleton,
  PollResultsPanel,
} from "@/components/admin/poll-preview";

type FormState = {
  id: string;
  active: boolean;
  surface: PollSurface;
  audiences: PollAudience[];
  question: PollLocalizedString;
  options: PollOption[];
  allowChange: boolean;
  showResultsBeforeVote: boolean;
  dismissible: boolean;
  bumpVersion: boolean;
  startsAt: number | null;
  endsAt: number | null;
};

type CanvasTab = "compose" | "preview" | "results";

const emptyOption = (): PollOption => ({
  id: `o${Math.random().toString(36).slice(2, 8)}`,
  label: { en: "", es: "" },
});

const emptyForm = (): FormState => ({
  id: "",
  active: true,
  surface: "home",
  audiences: ["all"],
  question: { en: "", es: "" },
  options: [emptyOption(), emptyOption()],
  allowChange: false,
  showResultsBeforeVote: false,
  dismissible: true,
  bumpVersion: false,
  startsAt: null,
  endsAt: null,
});

export function PollsHome() {
  const t = useTranslations();
  const alerts = useAlerts();
  const access = useAccess();
  const router = useRouter();
  const canRead =
    can(access, "admin.polls.read") || canManagePlatform(access);
  const canWrite =
    can(access, "admin.polls.write") || canManagePlatform(access);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [locale, setLocale] = useState<"en" | "es">("en");
  const [canvasTab, setCanvasTab] = useState<CanvasTab>("compose");
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "draft">(
    "all",
  );

  const visiblePolls = useMemo(
    () =>
      [...polls]
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
        .filter((poll) =>
          statusFilter === "all"
            ? true
            : statusFilter === "live"
              ? poll.active
              : !poll.active,
        ),
    [polls, statusFilter],
  );
  const selectedPoll = polls.find((poll) => poll.id === editingId);
  const liveCounts = selectedPoll?.counts ?? {};
  const liveVoteCount = selectedPoll?.voteCount ?? 0;

  useEffect(() => {
    if (!canRead) {
      router.replace("/");
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  useEffect(() => {
    if (!editingId) return;
    return watchPoll(editingId, (poll) => {
      setPolls((prev) =>
        mergeCampaignItem(prev, {
          ...(prev.find((item) => item.id === poll.id) ?? poll),
          counts: poll.counts,
          voteCount: poll.voteCount,
          updatedAt: poll.updatedAt,
        }),
      );
    });
  }, [editingId]);

  async function load() {
    setLoading(true);
    try {
      const data = await getAdminRepository().listPolls();
      setPolls(data.polls);
    } catch (err) {
      setError(functionsErrorMessage(err, t("pollsLoadError")));
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setCanvasTab("compose");
    setError(null);
  }

  function openEdit(poll: Poll) {
    const normalized = withPollCompatDefaults(poll);
    setEditingId(normalized.id);
    setForm({
      id: normalized.id,
      active: normalized.active,
      surface: normalized.surface,
      audiences: normalized.audiences,
      question: normalized.question,
      options: normalized.options,
      allowChange: normalized.allowChange,
      showResultsBeforeVote: normalized.showResultsBeforeVote,
      dismissible: normalized.dismissible,
      bumpVersion: false,
      startsAt: normalized.startsAt,
      endsAt: normalized.endsAt,
    });
    setError(null);
  }

  function toggleAudience(audience: PollAudience) {
    setForm((prev) => {
      if (audience === "all") return { ...prev, audiences: ["all"] };
      const withoutAll = prev.audiences.filter((item) => item !== "all");
      const next = withoutAll.includes(audience)
        ? withoutAll.filter((item) => item !== audience)
        : [...withoutAll, audience];
      return { ...prev, audiences: next.length ? next : ["all"] };
    });
  }

  async function onSave() {
    if (!canWrite) return;
    setBusy(true);
    setError(null);
    try {
      const question = fillLocalized(form.question);
      const options = form.options.map((option, index) => ({
        id: option.id.trim() || `o${index + 1}`,
        label: fillLocalized(option.label),
      }));
      if (!question.en) throw new Error(t("pollsValidationQuestion"));
      if (options.some((option) => !option.label.en)) {
        throw new Error(t("pollsValidationOptions"));
      }
      const saved = await getAdminRepository().upsertPoll({
        id:
          (editingId ?? form.id.trim().toLowerCase()) ||
          `poll-${Date.now().toString(36)}`,
        active: form.active,
        surface: form.surface,
        audiences: form.audiences,
        question,
        options,
        allowChange: form.allowChange,
        showResultsBeforeVote: form.showResultsBeforeVote,
        dismissible: form.dismissible,
        bumpVersion: form.bumpVersion,
        startsAt: form.startsAt,
        endsAt: form.endsAt,
      });
      if (!saved) throw new Error("save failed");
      alerts.success(t("pollsSaved"));
      setEditingId(saved.id);
      setForm((prev) => ({ ...prev, id: saved.id, question, options }));
      setPolls((prev) => mergeCampaignItem(prev, saved));
    } catch (err) {
      const message = functionsErrorMessage(err, t("pollsSaveError"));
      setError(message);
      alerts.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function onDeactivate(id: string) {
    if (!canWrite) return;
    setBusy(true);
    try {
      await getAdminRepository().deletePoll(id);
      alerts.success(t("pollsDeactivated"));
      setPolls((prev) =>
        prev.map((poll) =>
          poll.id === id ? { ...poll, active: false } : poll,
        ),
      );
      if (editingId === id) {
        setForm((prev) => ({ ...prev, active: false }));
      }
    } catch (err) {
      alerts.error(functionsErrorMessage(err, t("pollsSaveError")));
    } finally {
      setBusy(false);
    }
  }

  const resultsPoll = {
    counts: liveCounts,
    voteCount: liveVoteCount,
    updatedAt: selectedPoll?.updatedAt ?? null,
  };

  return (
    <CampaignWorkspace
      eyebrow={t("bannersWorkspaceEyebrow")}
      title={t("pollsTitle")}
      subtitle={t("pollsSubtitle")}
      createLabel={t("pollsNew")}
      onCreate={openCreate}
      createDisabled={busy || !canWrite}
      error={error}
      library={
        <>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              {t("pollsLibrary")}
            </h2>
            <span className="text-[10px] tabular-nums text-muted">
              {visiblePolls.length}
            </span>
          </div>
          <CampaignFilterBar
            value={statusFilter}
            onChange={setStatusFilter}
            labels={{
              all: t("campaignFilter_all"),
              live: t("campaignFilter_live"),
              draft: t("campaignFilter_draft"),
            }}
          />
          <div className="mt-3">
            {loading ? (
              <div className="space-y-2" aria-label={t("loading")}>
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="h-14 animate-pulse rounded-lg bg-rail" />
                ))}
              </div>
            ) : visiblePolls.length === 0 ? (
              <p className="px-2 py-8 text-sm text-muted">{t("pollsEmpty")}</p>
            ) : (
              <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
                {visiblePolls.map((poll) => (
                  <li key={poll.id}>
                    <CampaignLibraryItem
                      title={poll.question.en || poll.question.es || poll.id}
                      meta={`${poll.surface} · ${poll.voteCount} ${t("pollsVotes")}`}
                      active={poll.active}
                      selected={editingId === poll.id}
                      onClick={() => openEdit(poll)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      }
      canvasTabs={[
        { id: "compose", label: t("campaignTabCompose") },
        { id: "preview", label: t("campaignTabPreview") },
        {
          id: "results",
          label: t("campaignTabResults"),
          disabled: !editingId,
        },
      ]}
      canvasTab={canvasTab}
      onCanvasTabChange={(id) => setCanvasTab(id as CanvasTab)}
      canvasToolbar={
        <div className="flex rounded-lg bg-rail/80 p-0.5">
          {(["en", "es"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setLocale(item)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase ${
                locale === item ? "bg-sheet text-ink shadow-sm" : "text-muted"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      }
      canvas={
        loading ? (
          <PollPreviewSkeleton />
        ) : canvasTab === "results" ? (
          <PollResultsPanel
            locale={locale}
            options={form.options}
            poll={resultsPoll}
            emptyLabel={t("pollsResultsEmpty")}
            updatedLabel={t("pollsResultsUpdated")}
          />
        ) : canvasTab === "preview" ? (
          <PollLearnerPreview
            locale={locale}
            surface={form.surface}
            question={form.question}
            options={form.options}
            poll={resultsPoll}
            emptyHint={t("pollsQuestion")}
          />
        ) : (
          <div className="space-y-4">
            <PollComposeCard
              locale={locale}
              surface={form.surface}
              question={form.question}
              options={form.options}
              questionPlaceholder={t("pollsQuestion")}
              optionPlaceholder={(index) => `${t("pollsOption")} ${index + 1}`}
              onQuestionChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  question: { ...prev.question, [locale]: value },
                }))
              }
              onOptionChange={(index, value) =>
                setForm((prev) => ({
                  ...prev,
                  options: prev.options.map((option, optionIndex) =>
                    optionIndex === index
                      ? { ...option, label: { ...option.label, [locale]: value } }
                      : option,
                  ),
                }))
              }
            />
            <div className="flex items-center justify-center gap-2">
              {form.options.length < POLL_LIMITS.maxOptions ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!canWrite}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      options: [...prev.options, emptyOption()],
                    }))
                  }
                >
                  {t("pollsAddOption")}
                </Button>
              ) : null}
              {form.options.length > POLL_LIMITS.minOptions ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!canWrite}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      options: prev.options.slice(0, -1),
                    }))
                  }
                >
                  {t("campaignRemoveLast")}
                </Button>
              ) : null}
            </div>
          </div>
        )
      }
      inspector={
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">
                {editingId ? t("pollsEdit") : t("pollsNew")}
              </h2>
              <p className="mt-0.5 truncate text-[11px] text-muted">
                {editingId || t("campaignUnsaved")}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                form.active ? "bg-ok/15 text-ok" : "bg-muted/15 text-muted"
              }`}
            >
              {form.active ? t("pollsActive") : t("pollsInactive")}
            </span>
          </div>

          {!editingId ? (
            <div>
              <Label>{t("bannersId")}</Label>
              <Input
                value={form.id}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, id: event.target.value }))
                }
                placeholder="quarterly-check-in"
                disabled={!canWrite}
              />
            </div>
          ) : null}

          <label className="block text-xs font-semibold">
            {t("pollsSurface")}
            <select
              className="mt-1 w-full rounded-lg border border-glass-border bg-transparent px-3 py-2 text-sm"
              value={form.surface}
              disabled={!canWrite}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  surface: event.target.value as PollSurface,
                }))
              }
            >
              {POLL_SURFACES.map((surface) => (
                <option key={surface} value={surface}>
                  {t(`bannersSurface_${surface}`)}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              {t("pollsAudience")}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {POLL_AUDIENCES.map((audience) => (
                <button
                  key={audience}
                  type="button"
                  disabled={!canWrite}
                  onClick={() => toggleAudience(audience)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    form.audiences.includes(audience)
                      ? "bg-brand text-on-brand"
                      : "bg-rail text-muted"
                  }`}
                >
                  {audience}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              {t("campaignSchedule")}
            </p>
            <div className="mt-2 space-y-2">
              <label className="block text-xs">
                {t("campaignStartsAt")}
                <Input
                  type="datetime-local"
                  className="mt-1"
                  disabled={!canWrite}
                  value={millisToDatetimeLocal(form.startsAt)}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      startsAt: datetimeLocalToMillis(event.target.value),
                    }))
                  }
                />
              </label>
              <label className="block text-xs">
                {t("campaignEndsAt")}
                <Input
                  type="datetime-local"
                  className="mt-1"
                  disabled={!canWrite}
                  value={millisToDatetimeLocal(form.endsAt)}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      endsAt: datetimeLocalToMillis(event.target.value),
                    }))
                  }
                />
              </label>
            </div>
          </div>

          <div className="space-y-2 border-y border-glass-border py-4 text-xs">
            {(
              [
                ["active", "pollsActive"],
                ["allowChange", "pollsAllowChange"],
                ["showResultsBeforeVote", "pollsShowResultsBefore"],
                ["dismissible", "pollsDismissible"],
                ["bumpVersion", "pollsBumpVersion"],
              ] as const
            ).map(([field, label]) => (
              <label
                key={field}
                className="flex cursor-pointer items-start gap-2.5 rounded-lg p-1.5 hover:bg-rail/70"
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  disabled={!canWrite}
                  checked={form[field]}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      [field]: event.target.checked,
                    }))
                  }
                />
                <span className="leading-snug text-ink">{t(label)}</span>
              </label>
            ))}
          </div>

          <Button
            className="w-full"
            type="button"
            onClick={() => void onSave()}
            disabled={busy || !canWrite}
          >
            {busy ? t("loading") : t("pollsSave")}
          </Button>
          {editingId && form.active ? (
            <Button
              className="w-full"
              type="button"
              variant="ghost"
              disabled={busy || !canWrite}
              onClick={() => void onDeactivate(editingId)}
            >
              {t("pollsDeactivate")}
            </Button>
          ) : null}
        </>
      }
    />
  );
}
