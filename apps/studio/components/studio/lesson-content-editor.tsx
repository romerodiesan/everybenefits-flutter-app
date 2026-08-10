"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import {
  clearLessonVideo,
  estimateQuizSeconds,
  estimateReadingSeconds,
  getLessonAnswerKey,
  lessonVideoLabel,
  resolveVideoUrl,
  saveLessonQuiz,
  saveLessonReading,
} from "@/lib/firebase/courses";
import { QUIZ_DEFAULT_PASS_PERCENT } from "@/lib/types";
import type { Lesson, QuizQuestion, QuizSelectionMode } from "@/lib/types";
import { Button, Input, Label, TextArea } from "@/components/ui/primitives";
import { ProgressBar } from "@/components/academy/shared";
import { Markdown } from "@/components/academy/markdown";
import { useLessonUploadQueueOptional } from "@/lib/uploads/lesson-upload-queue";
import { useAlerts } from "@/lib/providers/alert-provider";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

/** Video upload, Markdown body or quiz builder, depending on the lesson type. */
export function LessonContentEditor({
  courseId,
  lesson,
}: {
  courseId: string;
  lesson: Lesson;
}) {
  if (lesson.type === "reading") {
    return <ReadingEditor courseId={courseId} lesson={lesson} />;
  }
  if (lesson.type === "quiz") {
    return <QuizEditor courseId={courseId} lesson={lesson} />;
  }
  return <VideoEditor courseId={courseId} lesson={lesson} />;
}

function VideoEditor({
  courseId,
  lesson,
}: {
  courseId: string;
  lesson: Lesson;
}) {
  const t = useTranslations();
  const alerts = useAlerts();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const queue = useLessonUploadQueueOptional();
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const hasVideo = Boolean(lesson.videoPath || lesson.videoUrl);
  const videoLabel = lessonVideoLabel(lesson);

  const activeJob = queue?.jobs.find(
    (job) =>
      job.lessonId === lesson.id &&
      (job.status === "queued" || job.status === "uploading"),
  );

  useEffect(() => {
    let cancelled = false;
    setPreviewUrl(null);
    if (!hasVideo) return;
    resolveVideoUrl(lesson)
      .then((url) => {
        if (!cancelled) setPreviewUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [lesson.id, lesson.videoPath, lesson.videoUrl, hasVideo]);

  const enqueueFile = (file: File | undefined) => {
    if (!file || !queue) return;
    queue.enqueue({ courseId, lessonId: lesson.id, file });
    if (fileRef.current) fileRef.current.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith("video/")) {
      enqueueFile(file);
    }
  };

  const removeVideo = async () => {
    if (!hasVideo) return;
    const confirmed = await alerts.confirm({
      title: t("actionDelete"),
      description: t("studioRemoveVideoConfirm"),
      confirmLabel: t("actionDelete"),
      danger: true,
    });
    if (!confirmed) return;
    setRemoving(true);
    try {
      await clearLessonVideo(courseId, lesson.id);
      setPreviewUrl(null);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-4">
      {hasVideo ? (
        <div className="studio-panel overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-glass-border px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {t("studioAssignedVideo")}
              </p>
              <p className="mt-1 truncate text-sm font-medium">
                {videoLabel ?? t("studioVideoReady")}
              </p>
              {lesson.durationSeconds > 0 ? (
                <p className="mt-0.5 text-[11px] text-muted">
                  {t("studioVideoDuration", {
                    minutes: Math.floor(lesson.durationSeconds / 60),
                    seconds: lesson.durationSeconds % 60,
                  })}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="danger"
              className="h-9 shrink-0 px-3 text-xs"
              disabled={removing || Boolean(activeJob)}
              onClick={() => void removeVideo()}
            >
              {t("studioRemoveVideo")}
            </Button>
          </div>
          {previewUrl ? (
            <video
              key={previewUrl}
              src={previewUrl}
              controls
              className="aspect-video w-full bg-ink/90"
            />
          ) : (
            <p className="px-4 py-8 text-center text-sm text-muted">
              {t("studioVideoPreviewLoading")}
            </p>
          )}
        </div>
      ) : null}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-2xl border border-dashed px-4 py-10 text-center transition ${
          dragOver
            ? "border-brand bg-brand/10"
            : "border-glass-border bg-rail/30"
        }`}
      >
        <p className="text-sm text-muted">
          {hasVideo ? t("workspaceReplaceDrop") : t("workspaceDropVideo")}
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          onChange={(event) => enqueueFile(event.target.files?.[0])}
          aria-label={hasVideo ? t("studioReplaceVideo") : t("studioUploadVideo")}
          className="mx-auto mt-4 block w-full max-w-sm text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand/14 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand"
        />
      </div>
      {activeJob ? (
        <div>
          <ProgressBar value={activeJob.progress} />
          <p className="mt-1.5 text-[11px] font-semibold text-muted">
            {t("studioUploading", {
              percent: Math.round(activeJob.progress * 100),
            })}
            {" · "}
            {activeJob.fileName}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ReadingEditor({
  courseId,
  lesson,
}: {
  courseId: string;
  lesson: Lesson;
}) {
  const t = useTranslations();
  const [body, setBody] = useState(lesson.bodyMarkdown ?? "");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await saveLessonReading({
        courseId,
        lessonId: lesson.id,
        bodyMarkdown: body,
        durationSeconds: estimateReadingSeconds(body),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <Label>{t("studioReadingBody")}</Label>
        <button
          type="button"
          onClick={() => setPreview((value) => !value)}
          className="text-[11px] font-semibold text-brand"
        >
          {preview ? t("studioReadingEdit") : t("studioReadingPreview")}
        </button>
      </div>

      {preview ? (
        <div className="rounded-xl border border-glass-border bg-sheet px-3.5 py-3">
          {body.trim() ? (
            <Markdown source={body} />
          ) : (
            <p className="text-sm text-muted">{t("readingEmpty")}</p>
          )}
        </div>
      ) : (
        <TextArea
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            setSaved(false);
          }}
          placeholder={t("studioReadingPlaceholder")}
          className="min-h-48 font-mono text-[13px]"
        />
      )}

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          className="h-9 px-3 text-xs"
          onClick={() => void save()}
          disabled={saving}
        >
          {t("studioSaveReading")}
        </Button>
        <span className="text-[11px] font-semibold text-muted">
          {t("studioReadingEstimate", {
            minutes: Math.max(1, Math.round(estimateReadingSeconds(body) / 60)),
          })}
        </span>
        {saved && (
          <span className="text-[11px] font-semibold text-brand">
            {t("studioSaved")}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-muted">{t("studioMarkdownHint")}</p>
    </div>
  );
}

/** Question plus its correct option indexes, kept together while editing. */
type DraftQuestion = QuizQuestion & { correct: number[] };

function QuizEditor({
  courseId,
  lesson,
}: {
  courseId: string;
  lesson: Lesson;
}) {
  const t = useTranslations();
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [passPercent, setPassPercent] = useState(
    lesson.passPercent || QUIZ_DEFAULT_PASS_PERCENT,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The answer key lives in a doc learners can't read, so it loads separately.
  useEffect(() => {
    let cancelled = false;
    getLessonAnswerKey(courseId, lesson.id)
      .then((key) => {
        if (cancelled) return;
        setQuestions(
          lesson.questions.map((question) => ({
            ...question,
            correct: key[question.id] ?? [],
          })),
        );
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setQuestions(
          lesson.questions.map((question) => ({ ...question, correct: [] })),
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, lesson.id, lesson.questions]);

  const update = (index: number, patch: Partial<DraftQuestion>) => {
    setSaved(false);
    setQuestions((current) =>
      current.map((question, i) =>
        i === index ? { ...question, ...patch } : question,
      ),
    );
  };

  const addQuestion = () => {
    setSaved(false);
    setQuestions((current) => [
      ...current,
      {
        // Stable enough within a lesson, and never reused after a delete.
        id: `q${Date.now().toString(36)}`,
        prompt: "",
        selectionMode: "single",
        options: ["", ""],
        correct: [],
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setSaved(false);
    setQuestions((current) => current.filter((_, i) => i !== index));
  };

  const toggleCorrect = (index: number, option: number) => {
    const question = questions[index];
    if (!question) return;
    const isMulti = question.selectionMode === "multi";
    const has = question.correct.includes(option);
    const correct = isMulti
      ? has
        ? question.correct.filter((value) => value !== option)
        : [...question.correct, option].sort((a, b) => a - b)
      : [option];
    update(index, { correct });
  };

  const setMode = (index: number, mode: QuizSelectionMode) => {
    const question = questions[index];
    if (!question) return;
    // Going back to single answer keeps at most one correct option.
    const correct =
      mode === "single" ? question.correct.slice(0, 1) : question.correct;
    update(index, { selectionMode: mode, correct });
  };

  const setOption = (index: number, option: number, value: string) => {
    const question = questions[index];
    if (!question) return;
    update(index, {
      options: question.options.map((current, i) =>
        i === option ? value : current,
      ),
    });
  };

  const addOption = (index: number) => {
    const question = questions[index];
    if (!question || question.options.length >= MAX_OPTIONS) return;
    update(index, { options: [...question.options, ""] });
  };

  const removeOption = (index: number, option: number) => {
    const question = questions[index];
    if (!question || question.options.length <= MIN_OPTIONS) return;
    update(index, {
      options: question.options.filter((_, i) => i !== option),
      // Drop the deleted option and shift the indexes above it down.
      correct: question.correct
        .filter((value) => value !== option)
        .map((value) => (value > option ? value - 1 : value)),
    });
  };

  const firstProblem = () => {
    if (questions.length === 0) return t("studioQuizNeedsQuestion");
    for (const question of questions) {
      if (!question.prompt.trim()) return t("studioQuizNeedsPrompt");
      if (question.options.some((option) => !option.trim())) {
        return t("studioQuizNeedsOptions");
      }
      if (question.correct.length === 0) return t("studioQuizNeedsCorrect");
    }
    return null;
  };

  const save = async () => {
    const problem = firstProblem();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      await saveLessonQuiz({
        courseId,
        lessonId: lesson.id,
        // The `correct` field stays behind: it belongs in the answer key only.
        questions: questions.map((question) => ({
          id: question.id,
          prompt: question.prompt,
          selectionMode: question.selectionMode,
          options: question.options,
        })),
        answerKey: Object.fromEntries(
          questions.map((question) => [question.id, question.correct]),
        ),
        passPercent,
        durationSeconds: estimateQuizSeconds(questions.length),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-xs text-muted">{t("loading")}</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-28">
          <Label>{t("studioQuizPassPercent")}</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={passPercent}
            onChange={(event) => {
              setSaved(false);
              setPassPercent(Number(event.target.value));
            }}
            className="h-9"
          />
        </div>
        <Button
          variant="secondary"
          className="h-9 px-3 text-xs"
          onClick={addQuestion}
        >
          {t("studioQuizAddQuestion")}
        </Button>
      </div>

      {questions.length === 0 ? (
        <p className="mt-3 text-xs text-muted">{t("studioQuizEmpty")}</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {questions.map((question, index) => (
            <li
              key={question.id}
              className="rounded-xl border border-glass-border bg-sheet p-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <span className="mt-2.5 w-5 shrink-0 text-xs font-semibold text-muted">
                  {index + 1}.
                </span>
                <div className="min-w-0 flex-1">
                  <Input
                    value={question.prompt}
                    onChange={(event) =>
                      update(index, { prompt: event.target.value })
                    }
                    placeholder={t("studioQuizPrompt")}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={question.selectionMode}
                    onChange={(event) =>
                      setMode(index, event.target.value as QuizSelectionMode)
                    }
                    className="h-10 min-w-0 flex-1 rounded-xl border border-glass-border bg-sheet px-2 text-xs text-ink outline-none focus:border-brand sm:flex-none"
                  >
                    <option value="single">{t("quizPickOne")}</option>
                    <option value="multi">{t("quizPickMany")}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    title={t("studioDelete")}
                    aria-label={t("studioDelete")}
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm text-muted transition hover:bg-ink/[0.05] hover:text-ink dark:hover:bg-white/[0.06]"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <ul className="mt-2 space-y-1.5 pl-7">
                {question.options.map((option, optionIndex) => (
                  <li key={optionIndex} className="flex items-center gap-2">
                    <input
                      type={
                        question.selectionMode === "multi" ? "checkbox" : "radio"
                      }
                      name={`${question.id}-correct`}
                      checked={question.correct.includes(optionIndex)}
                      onChange={() => toggleCorrect(index, optionIndex)}
                      aria-label={t("studioQuizMarkCorrect")}
                      className="h-4 w-4 shrink-0 accent-[var(--brand)]"
                    />
                    <Input
                      value={option}
                      onChange={(event) =>
                        setOption(index, optionIndex, event.target.value)
                      }
                      placeholder={t("studioQuizOption", {
                        index: optionIndex + 1,
                      })}
                      className="h-9"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(index, optionIndex)}
                      disabled={question.options.length <= MIN_OPTIONS}
                      title={t("studioDelete")}
                      aria-label={t("studioDelete")}
                      className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg text-xs text-muted transition hover:text-ink disabled:opacity-30"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>

              {question.options.length < MAX_OPTIONS && (
                <button
                  type="button"
                  onClick={() => addOption(index)}
                  className="ml-7 mt-1.5 text-[11px] font-semibold text-brand"
                >
                  + {t("studioQuizAddOption")}
                </button>
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          className="h-9 px-3 text-xs"
          onClick={() => void save()}
          disabled={saving}
        >
          {t("studioSaveQuiz")}
        </Button>
        {saved && (
          <span className="text-[11px] font-semibold text-brand">
            {t("studioSaved")}
          </span>
        )}
        {error && (
          <span className="text-[11px] font-semibold text-[#B42318]">
            {error}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        {t("studioQuizAnswerKeyHint")}
      </p>
    </div>
  );
}
