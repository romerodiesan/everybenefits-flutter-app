"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  appendCourseToPath,
  createCourse,
  createPath,
} from "@/lib/firebase/courses";
import { COURSE_LEVELS, type CourseLevel, type LearningPath } from "@/lib/types";
import { Button, Input, Label, TextArea } from "@/components/ui/primitives";
import { InstructorMultiSelect } from "@/components/studio/instructor-multi-select";
import { useLevelLabels } from "@/components/academy/shared";

type PathChoice = "none" | "new" | string;
type Step = "defaults" | "titles" | "review";

type Props = {
  paths: LearningPath[];
  createdBy: string;
  defaultTeacherName: string;
  onClose: () => void;
};

export function CreateCoursesWizard({
  paths,
  createdBy,
  defaultTeacherName,
  onClose,
}: Props) {
  const t = useTranslations();
  const router = useRouter();
  const levelLabel = useLevelLabels();

  const [step, setStep] = useState<Step>("defaults");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [instructorIds, setInstructorIds] = useState<string[]>([]);
  const [teacherName, setTeacherName] = useState("");
  const [level, setLevel] = useState<CourseLevel>("basic");
  const [pathChoice, setPathChoice] = useState<PathChoice>("none");
  const [pathTitle, setPathTitle] = useState("");
  const [titles, setTitles] = useState<string[]>([""]);
  const [pasteBuffer, setPasteBuffer] = useState("");

  const pathOptions = useMemo(
    () => [...paths].sort((a, b) => a.title.localeCompare(b.title)),
    [paths],
  );

  const cleanTitles = useMemo(
    () => titles.map((row) => row.trim()).filter(Boolean),
    [titles],
  );

  const defaultsReady =
    pathChoice !== "new" || pathTitle.trim().length > 0;

  const applyPaste = () => {
    const lines = pasteBuffer
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    setTitles((prev) => {
      const existing = prev.map((row) => row.trim()).filter(Boolean);
      return [...existing, ...lines];
    });
    setPasteBuffer("");
  };

  const createAll = async () => {
    if (cleanTitles.length === 0 || !defaultsReady) return;
    setBusy(true);
    setError(null);
    setProgress({ done: 0, total: cleanTitles.length });
    const createdIds: string[] = [];
    const resolvedTeacher =
      teacherName.trim() || defaultTeacherName || "Instructor";

    try {
      let pathId: string | null =
        pathChoice !== "none" && pathChoice !== "new" ? pathChoice : null;

      if (pathChoice === "new") {
        pathId = await createPath({
          title: pathTitle.trim(),
          description: "",
          level,
          createdBy,
          courseIds: [],
        });
      }

      for (let i = 0; i < cleanTitles.length; i++) {
        const title = cleanTitles[i];
        try {
          const id = await createCourse({
            title,
            description: description.trim(),
            teacherName: resolvedTeacher,
            instructorIds,
            level,
            createdBy,
          });
          createdIds.push(id);
          if (pathId) {
            await appendCourseToPath(pathId, id);
          }
        } catch (err) {
          setError(
            err instanceof Error ? err.message : t("wizardPartialFail", {
              done: createdIds.length,
              total: cleanTitles.length,
            }),
          );
        }
        setProgress({ done: i + 1, total: cleanTitles.length });
      }

      if (createdIds.length === 0) {
        setError(t("wizardPartialFail", { done: 0, total: cleanTitles.length }));
        return;
      }
      if (createdIds.length < cleanTitles.length) {
        setError(
          t("wizardPartialFail", {
            done: createdIds.length,
            total: cleanTitles.length,
          }),
        );
      }
      onClose();
      router.push(`/courses/${createdIds[0]}`);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const steps: { id: Step; label: string }[] = [
    { id: "defaults", label: t("wizardStepDefaults") },
    { id: "titles", label: t("wizardStepTitles") },
    { id: "review", label: t("wizardStepReview") },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-3 sm:items-center sm:p-6"
      onClick={() => !busy && onClose()}
    >
      <div
        className="studio-panel flex max-h-[90svh] w-full max-w-xl flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-glass-border px-5 py-4">
          <h2 className="font-display text-xl">{t("wizardCourseTitle")}</h2>
          <ol className="mt-3 flex flex-wrap gap-2">
            {steps.map((item, index) => {
              const active = item.id === step;
              const done =
                (item.id === "defaults" && step !== "defaults") ||
                (item.id === "titles" && step === "review");
              return (
                <li
                  key={item.id}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    active
                      ? "bg-brand/15 text-brand"
                      : done
                        ? "text-ink"
                        : "text-muted"
                  }`}
                >
                  {index + 1}. {item.label}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {step === "defaults" ? (
            <>
              <div>
                <Label>{t("wizardSharedDescription")}</Label>
                <TextArea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("fieldTeacher")}</Label>
                <InstructorMultiSelect
                  value={instructorIds}
                  onChange={(ids, name) => {
                    setInstructorIds(ids);
                    setTeacherName(name);
                  }}
                />
              </div>
              <div>
                <Label>{t("fieldLevel")}</Label>
                <select
                  className="h-10 w-full rounded-xl border border-glass-border bg-sheet px-3 text-sm"
                  value={level}
                  onChange={(e) => setLevel(e.target.value as CourseLevel)}
                >
                  {COURSE_LEVELS.map((option) => (
                    <option key={option} value={option}>
                      {levelLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>{t("fieldPath")}</Label>
                <select
                  className="h-10 w-full rounded-xl border border-glass-border bg-sheet px-3 text-sm"
                  value={pathChoice}
                  onChange={(e) =>
                    setPathChoice(e.target.value as PathChoice)
                  }
                >
                  <option value="none">{t("pathNone")}</option>
                  <option value="new">{t("pathCreateNew")}</option>
                  {pathOptions.map((path) => (
                    <option key={path.id} value={path.id}>
                      {path.title}
                    </option>
                  ))}
                </select>
              </div>
              {pathChoice === "new" ? (
                <div>
                  <Label>{t("fieldPathTitle")}</Label>
                  <Input
                    value={pathTitle}
                    onChange={(e) => setPathTitle(e.target.value)}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {step === "titles" ? (
            <>
              <p className="text-sm text-muted">{t("wizardTitlesHint")}</p>
              <ul className="space-y-2">
                {titles.map((row, index) => (
                  <li key={index} className="flex gap-2">
                    <Input
                      value={row}
                      placeholder={`${t("fieldTitle")} ${index + 1}`}
                      onChange={(e) =>
                        setTitles((prev) =>
                          prev.map((value, i) =>
                            i === index ? e.target.value : value,
                          ),
                        )
                      }
                    />
                    {titles.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="shrink-0 px-3"
                        onClick={() =>
                          setTitles((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                      >
                        ×
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setTitles((prev) => [...prev, ""])}
              >
                {t("wizardAddTitle")}
              </Button>
              <div>
                <Label>{t("wizardPasteTitles")}</Label>
                <TextArea
                  value={pasteBuffer}
                  onChange={(e) => setPasteBuffer(e.target.value)}
                  className="min-h-24"
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2"
                  disabled={!pasteBuffer.trim()}
                  onClick={applyPaste}
                >
                  {t("wizardPasteApply")}
                </Button>
              </div>
            </>
          ) : null}

          {step === "review" ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                {t("wizardReviewSummary", { count: cleanTitles.length })}
              </p>
              <dl className="studio-panel space-y-2 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t("fieldLevel")}</dt>
                  <dd>{levelLabel(level)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t("fieldTeacher")}</dt>
                  <dd className="truncate text-right">
                    {teacherName.trim() || defaultTeacherName || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t("fieldPath")}</dt>
                  <dd className="truncate text-right">
                    {pathChoice === "none"
                      ? t("pathNone")
                      : pathChoice === "new"
                        ? pathTitle.trim() || t("pathCreateNew")
                        : pathOptions.find((p) => p.id === pathChoice)?.title ??
                          pathChoice}
                  </dd>
                </div>
              </dl>
              <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                {cleanTitles.map((title) => (
                  <li
                    key={title}
                    className="rounded-lg border border-glass-border px-3 py-2"
                  >
                    {title}
                  </li>
                ))}
              </ul>
              {progress ? (
                <p className="text-xs text-muted">
                  {t("wizardCreating", {
                    done: progress.done,
                    total: progress.total,
                  })}
                </p>
              ) : null}
              {error ? (
                <p className="text-xs text-danger">{error}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-glass-border px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            disabled={busy || step === "defaults"}
            onClick={() =>
              setStep((current) =>
                current === "review"
                  ? "titles"
                  : current === "titles"
                    ? "defaults"
                    : current,
              )
            }
          >
            {t("wizardBack")}
          </Button>
          <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={onClose}
              >
                {t("actionCancel")}
              </Button>
            {step === "defaults" ? (
              <Button
                type="button"
                disabled={!defaultsReady}
                onClick={() => setStep("titles")}
              >
                {t("wizardNext")}
              </Button>
            ) : null}
            {step === "titles" ? (
              <Button
                type="button"
                disabled={cleanTitles.length === 0}
                onClick={() => setStep("review")}
              >
                {t("wizardNext")}
              </Button>
            ) : null}
            {step === "review" ? (
              <Button
                type="button"
                disabled={busy || cleanTitles.length === 0}
                onClick={() => void createAll()}
              >
                {t("wizardCreateAll")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
