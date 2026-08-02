"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { resolveVideoUrl } from "@/lib/firebase/courses";
import type { Course, CourseContent, Lesson } from "@/lib/types";
import { Button } from "@/components/ui/primitives";
import { LessonTypeIcon, useLessonTypeLabels } from "@/components/academy/shared";
import { Markdown } from "@/components/academy/markdown";

/** Full-screen learner-facing preview of a course draft. */
export function LearnerPreview({
  course,
  content,
  onClose,
}: {
  course: Course;
  content: CourseContent;
  onClose: () => void;
}) {
  const t = useTranslations();
  const typeLabel = useLessonTypeLabels();
  const [lessonId, setLessonId] = useState<string | null>(
    content.lessons[0]?.id ?? null,
  );
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [syllabusOpen, setSyllabusOpen] = useState(false);

  const lesson = useMemo(
    () => content.lessons.find((entry) => entry.id === lessonId) ?? null,
    [content.lessons, lessonId],
  );

  useEffect(() => {
    if (!lesson || lesson.type !== "video") {
      setVideoUrl(null);
      return;
    }
    let cancelled = false;
    resolveVideoUrl(lesson)
      .then((url) => {
        if (!cancelled) setVideoUrl(url);
      })
      .catch(() => {
        if (!cancelled) setVideoUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [lesson]);

  const lessonsOf = (moduleId: string) =>
    content.lessons.filter((entry) => entry.moduleId === moduleId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0b0e]">
      <header className="flex items-center justify-between gap-3 border-b border-glass-border px-3 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="rounded-lg p-2 text-muted hover:bg-white/[0.06] hover:text-ink lg:hidden"
            aria-label={t("workspaceModules")}
            onClick={() => setSyllabusOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted">
              {t("actionPreview")}
            </p>
            <h1 className="truncate font-display text-lg">{course.title}</h1>
          </div>
        </div>
        <Button variant="secondary" className="h-9 shrink-0 px-3 text-xs" onClick={onClose}>
          {t("previewClose")}
        </Button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {syllabusOpen ? (
          <button
            type="button"
            aria-label="Close syllabus"
            className="absolute inset-0 z-10 bg-black/50 lg:hidden"
            onClick={() => setSyllabusOpen(false)}
          />
        ) : null}
        <aside
          className={`absolute inset-y-0 left-0 z-20 w-[min(280px,88vw)] shrink-0 overflow-y-auto border-r border-glass-border bg-[#0a0b0e] p-3 transition-transform lg:static lg:z-auto lg:w-[280px] lg:translate-x-0 ${
            syllabusOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {content.modules.length === 0 ? (
            <p className="px-2 py-6 text-sm text-muted">{t("workspaceNoLesson")}</p>
          ) : (
            content.modules.map((module) => (
              <div key={module.id} className="mb-4">
                <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {module.title}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {lessonsOf(module.id).map((entry) => {
                    const active = entry.id === lessonId;
                    return (
                      <li key={entry.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setLessonId(entry.id);
                            setSyllabusOpen(false);
                          }}
                          className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
                            active
                              ? "bg-brand/20 text-brand"
                              : "text-muted hover:bg-white/[0.04] hover:text-ink"
                          }`}
                        >
                          <LessonTypeIcon type={entry.type} />
                          <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          {!lesson ? (
            <p className="text-sm text-muted">{t("workspaceNoLesson")}</p>
          ) : (
            <PreviewLesson lesson={lesson} videoUrl={videoUrl} typeLabel={typeLabel} />
          )}
        </main>
      </div>
    </div>
  );
}

function PreviewLesson({
  lesson,
  videoUrl,
  typeLabel,
}: {
  lesson: Lesson;
  videoUrl: string | null;
  typeLabel: (type: Lesson["type"]) => string;
}) {
  const t = useTranslations();

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {typeLabel(lesson.type)}
      </p>
      <h2 className="mt-1 font-display text-2xl">{lesson.title}</h2>

      {lesson.type === "video" ? (
        <div className="mt-6 overflow-hidden rounded-xl border border-glass-border bg-black">
          {videoUrl ? (
            <video
              key={videoUrl}
              src={videoUrl}
              controls
              className="aspect-video w-full"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center text-sm text-muted">
              {t("mediaEmpty")}
            </div>
          )}
        </div>
      ) : null}

      {lesson.type === "reading" ? (
        <div className="mt-6">
          {lesson.bodyMarkdown?.trim() ? (
            <Markdown source={lesson.bodyMarkdown} />
          ) : (
            <p className="text-sm text-muted">{t("readingEmpty")}</p>
          )}
        </div>
      ) : null}

      {lesson.type === "quiz" ? (
        <div className="mt-6 space-y-4">
          {lesson.questions.length === 0 ? (
            <p className="text-sm text-muted">{t("studioQuizEmpty")}</p>
          ) : (
            lesson.questions.map((question, index) => (
              <div
                key={question.id}
                className="studio-panel space-y-3 p-4"
              >
                <p className="text-sm font-medium">
                  <span className="text-muted">{index + 1}. </span>
                  {question.prompt}
                </p>
                <p className="text-[11px] text-muted">
                  {question.selectionMode === "multi"
                    ? t("quizPickMany")
                    : t("quizPickOne")}
                </p>
                <ul className="space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <li
                      key={`${question.id}-${optionIndex}`}
                      className="rounded-lg border border-glass-border px-3 py-2 text-sm text-muted"
                    >
                      {option || "—"}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
