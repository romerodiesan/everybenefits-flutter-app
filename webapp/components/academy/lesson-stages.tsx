"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { submitQuizAttempt } from "@/lib/firebase/courses";
import type { Lesson, QuizAttemptResult } from "@/lib/types";
import { Markdown } from "./markdown";

/** Reading lesson: Markdown body plus an explicit completion CTA. */
export function ReadingStage({
  lesson,
  completed,
  onComplete,
}: {
  lesson: Lesson;
  completed: boolean;
  onComplete: () => void;
}) {
  const t = useTranslations();
  const body = lesson.bodyMarkdown?.trim() ?? "";

  return (
    <article className="pulse-sheet px-5 py-6 md:px-8 md:py-8">
      {body ? (
        <Markdown source={body} />
      ) : (
        <p className="text-sm text-muted">{t("readingEmpty")}</p>
      )}

      {body && (
        <div className="mt-6 border-t border-glass-border pt-4">
          {completed ? (
            <p className="text-sm font-semibold text-brand">
              ✓ {t("readingCompleted")}
            </p>
          ) : (
            <button
              type="button"
              onClick={onComplete}
              className="inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand transition hover:brightness-110"
            >
              {t("readingMarkComplete")}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * Quiz lesson: answers are graded by the `submitQuizAttempt` callable, which is
 * also what marks the lesson complete, so nothing here decides pass/fail.
 */
export function QuizStage({
  courseId,
  lesson,
}: {
  courseId: string;
  lesson: Lesson;
}) {
  const t = useTranslations();
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (lesson.questions.length === 0) {
    return (
      <div className="pulse-sheet px-5 py-10 text-center text-sm text-muted">
        {t("quizEmpty")}
      </div>
    );
  }

  const toggle = (question: Lesson["questions"][number], option: number) => {
    setResult(null);
    setError(null);
    setAnswers((current) => {
      const selected = current[question.id] ?? [];
      if (question.selectionMode === "single") {
        return { ...current, [question.id]: [option] };
      }
      return {
        ...current,
        [question.id]: selected.includes(option)
          ? selected.filter((value) => value !== option)
          : [...selected, option].sort((a, b) => a - b),
      };
    });
  };

  const unanswered = lesson.questions.some(
    (question) => (answers[question.id] ?? []).length === 0,
  );

  const submit = async () => {
    if (unanswered) {
      setError(t("quizIncomplete"));
      return;
    }
    setError(null);
    setGrading(true);
    try {
      setResult(
        await submitQuizAttempt({ courseId, lessonId: lesson.id, answers }),
      );
    } catch {
      setError(t("quizSubmitError"));
    } finally {
      setGrading(false);
    }
  };

  const retry = () => {
    setAnswers({});
    setResult(null);
    setError(null);
  };

  return (
    <div className="pulse-sheet px-5 py-6 md:px-8 md:py-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {t("quizPassRequirement", { percent: lesson.passPercent })}
      </p>

      <ol className="mt-5 space-y-6">
        {lesson.questions.map((question, index) => {
          const selected = answers[question.id] ?? [];
          const outcome = result?.correctByQuestion[question.id];

          return (
            <li key={question.id}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {t("quizQuestionOf", {
                  index: index + 1,
                  total: lesson.questions.length,
                })}
                {" · "}
                {question.selectionMode === "multi"
                  ? t("quizPickMany")
                  : t("quizPickOne")}
              </p>
              <p className="mt-1 font-display text-base font-bold leading-snug">
                {question.prompt}
              </p>

              <div className="mt-2.5 space-y-1.5">
                {question.options.map((option, optionIndex) => {
                  const active = selected.includes(optionIndex);
                  return (
                    <label
                      key={optionIndex}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition ${
                        active
                          ? "border-brand/60 bg-brand/[0.08]"
                          : "border-glass-border hover:bg-ink/[0.03] dark:hover:bg-white/[0.03]"
                      }`}
                    >
                      <input
                        type={
                          question.selectionMode === "multi"
                            ? "checkbox"
                            : "radio"
                        }
                        name={question.id}
                        checked={active}
                        disabled={Boolean(result)}
                        onChange={() => toggle(question, optionIndex)}
                        className="h-4 w-4 shrink-0 accent-[var(--brand)]"
                      />
                      <span className="min-w-0 flex-1">{option}</span>
                    </label>
                  );
                })}
              </div>

              {outcome !== undefined && (
                <p
                  className={`mt-2 text-xs font-semibold ${
                    outcome ? "text-brand" : "text-[#B42318]"
                  }`}
                >
                  {outcome ? t("quizAnswerCorrect") : t("quizAnswerIncorrect")}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-glass-border pt-4">
        {result ? (
          <>
            <p className="font-display text-lg font-bold">
              {t("quizScore", { score: result.score })}
            </p>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                result.passed
                  ? "bg-brand/14 text-brand"
                  : "bg-[#B42318]/12 text-[#B42318]"
              }`}
            >
              {result.passed ? t("quizPassed") : t("quizFailed")}
            </span>
            {!result.passed && (
              <button
                type="button"
                onClick={retry}
                className="inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand transition hover:brightness-110"
              >
                {t("quizRetry")}
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={grading}
            className="inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand transition hover:brightness-110 disabled:opacity-50"
          >
            {grading ? t("quizGrading") : t("quizSubmit")}
          </button>
        )}
        {error && (
          <span className="text-xs font-semibold text-[#B42318]">{error}</span>
        )}
      </div>
    </div>
  );
}
