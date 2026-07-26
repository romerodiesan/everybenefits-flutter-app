"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  estimateQuizSeconds,
  estimateReadingSeconds,
  getLessonAnswerKey,
  readVideoDuration,
  saveLessonQuiz,
  saveLessonReading,
  uploadLessonVideo,
} from "@/lib/firebase/courses";
import { QUIZ_DEFAULT_PASS_PERCENT } from "@/lib/types";
import type { Lesson, QuizQuestion, QuizSelectionMode } from "@/lib/types";
import { Button, Input, Label, TextArea } from "@/components/ui/primitives";
import { ProgressBar } from "@/components/academy/shared";
import { Markdown } from "@/components/academy/markdown";

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
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const hasVideo = Boolean(lesson.videoPath || lesson.videoUrl);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setProgress(0);
    try {
      const durationSeconds = await readVideoDuration(file);
      await uploadLessonVideo({
        courseId,
        lessonId: lesson.id,
        file,
        durationSeconds,
        onProgress: setProgress,
      });
    } finally {
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        onChange={(event) => void upload(event.target.files?.[0])}
        aria-label={hasVideo ? t("studioReplaceVideo") : t("studioUploadVideo")}
        className="w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand/14 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand"
      />
      {progress !== null && (
        <div className="mt-2">
          <ProgressBar value={progress} />
          <p className="mt-1.5 text-[11px] font-semibold text-muted">
            {t("studioUploading", { percent: Math.round(progress * 100) })}
          </p>
        </div>
      )}
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
              <div className="flex items-start gap-2">
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
                <select
                  value={question.selectionMode}
                  onChange={(event) =>
                    setMode(index, event.target.value as QuizSelectionMode)
                  }
                  className="h-10 shrink-0 rounded-xl border border-glass-border bg-sheet px-2 text-xs text-ink outline-none focus:border-brand"
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
