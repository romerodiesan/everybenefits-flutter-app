"use client";

import { useEffect, useState } from "react";
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
import { canManagePlatform } from "@/lib/roles";
import { useRouter } from "@/i18n/navigation";
import { getAdminRepository } from "@/lib/repositories/admin-repository";
import { Button, Input, Label } from "@/components/ui/primitives";

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
};

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
});

function fillLocalized(value: PollLocalizedString): PollLocalizedString {
  const en = value.en.trim();
  const es = value.es.trim();
  return { en: en || es, es: es || en };
}

function functionsErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.trim()
      : "";
  return (
    message
      .replace(/^FirebaseError:\s*/i, "")
      .replace(/^functions\/[\w-]+:\s*/i, "")
      .trim() || fallback
  );
}

export function PollsHome() {
  const t = useTranslations();
  const alerts = useAlerts();
  const access = useAccess();
  const router = useRouter();
  const allowed = canManagePlatform(access);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (!allowed) {
      router.replace("/");
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

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
      });
      if (!saved) throw new Error("save failed");
      alerts.success(t("pollsSaved"));
      setEditingId(saved.id);
      setForm((prev) => ({ ...prev, id: saved.id, question, options }));
      await load();
    } catch (err) {
      const message = functionsErrorMessage(err, t("pollsSaveError"));
      setError(message);
      alerts.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function onDeactivate(id: string) {
    setBusy(true);
    try {
      await getAdminRepository().deletePoll(id);
      alerts.success(t("pollsDeactivated"));
      if (editingId === id) openCreate();
      await load();
    } catch (err) {
      alerts.error(functionsErrorMessage(err, t("pollsSaveError")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t("navPolls")}
          </p>
          <h1 className="font-display text-2xl font-bold">{t("pollsTitle")}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">{t("pollsSubtitle")}</p>
        </div>
        <Button type="button" onClick={openCreate} disabled={busy}>
          {t("pollsNew")}
        </Button>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-2xl border border-glass-border bg-sheet p-4">
          <h2 className="mb-3 text-sm font-bold">{t("pollsLibrary")}</h2>
          {loading ? (
            <p className="text-sm text-muted">{t("loading")}</p>
          ) : polls.length === 0 ? (
            <p className="text-sm text-muted">{t("pollsEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {polls.map((poll) => (
                <li key={poll.id}>
                  <button
                    type="button"
                    onClick={() => openEdit(poll)}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                      editingId === poll.id
                        ? "border-brand bg-brand/10"
                        : "border-glass-border hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="block font-semibold">
                      {poll.question.en || poll.question.es || poll.id}
                    </span>
                    <span className="text-[11px] text-muted">
                      {poll.surface} · {poll.active ? t("pollsActive") : t("pollsInactive")} ·{" "}
                      {poll.voteCount} {t("pollsVotes")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-glass-border bg-sheet p-4">
          <h2 className="mb-3 text-sm font-bold">
            {editingId ? t("pollsEdit") : t("pollsNew")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold">
              {t("pollsSurface")}
              <select
                className="mt-1 w-full rounded-lg border border-glass-border bg-canvas px-2 py-2 text-sm"
                value={form.surface}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    surface: event.target.value as PollSurface,
                  }))
                }
              >
                {POLL_SURFACES.map((surface) => (
                  <option key={surface} value={surface}>
                    {surface}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, active: event.target.checked }))
                }
              />
              {t("pollsActive")}
            </label>
          </div>

          <p className="mt-4 text-xs font-semibold">{t("pollsAudience")}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {POLL_AUDIENCES.map((audience) => (
              <button
                key={audience}
                type="button"
                onClick={() => toggleAudience(audience)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  form.audiences.includes(audience)
                    ? "bg-brand text-on-brand"
                    : "bg-white/[0.06] text-muted"
                }`}
              >
                {audience}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label>{t("pollsQuestion")} (EN)</Label>
              <Input
                id="poll-q-en"
                maxLength={POLL_LIMITS.question}
                value={form.question.en}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    question: { ...prev.question, en: event.target.value },
                  }))
                }
              />
            </div>
            <div>
              <Label>{t("pollsQuestion")} (ES)</Label>
              <Input
                id="poll-q-es"
                maxLength={POLL_LIMITS.question}
                value={form.question.es}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    question: { ...prev.question, es: event.target.value },
                  }))
                }
              />
            </div>
          </div>

          <p className="mt-4 text-xs font-semibold">{t("pollsOptions")}</p>
          <div className="mt-2 space-y-3">
            {form.options.map((option, index) => (
              <div
                key={option.id}
                className="grid gap-2 rounded-xl border border-glass-border p-2 sm:grid-cols-[1fr_1fr_auto]"
              >
                <Input
                  maxLength={POLL_LIMITS.option}
                  placeholder={`${t("pollsOption")} EN`}
                  value={option.label.en}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      options: prev.options.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              label: { ...item.label, en: event.target.value },
                            }
                          : item,
                      ),
                    }))
                  }
                />
                <Input
                  maxLength={POLL_LIMITS.option}
                  placeholder={`${t("pollsOption")} ES`}
                  value={option.label.es}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      options: prev.options.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              label: { ...item.label, es: event.target.value },
                            }
                          : item,
                      ),
                    }))
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={form.options.length <= POLL_LIMITS.minOptions}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      options: prev.options.filter((_, i) => i !== index),
                    }))
                  }
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
          {form.options.length < POLL_LIMITS.maxOptions ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-2"
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

          <div className="mt-4 grid gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.allowChange}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    allowChange: event.target.checked,
                  }))
                }
              />
              {t("pollsAllowChange")}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.showResultsBeforeVote}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    showResultsBeforeVote: event.target.checked,
                  }))
                }
              />
              {t("pollsShowResultsBefore")}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.dismissible}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    dismissible: event.target.checked,
                  }))
                }
              />
              {t("pollsDismissible")}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.bumpVersion}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    bumpVersion: event.target.checked,
                  }))
                }
              />
              {t("pollsBumpVersion")}
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void onSave()} disabled={busy}>
              {t("pollsSave")}
            </Button>
            {editingId ? (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void onDeactivate(editingId)}
              >
                {t("pollsDeactivate")}
              </Button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
