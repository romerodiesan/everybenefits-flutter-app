"use client";

import { useEffect, useState, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import {
  deleteLesson,
  deleteModule,
  reorderLessons,
  upsertModule,
} from "@/lib/firebase/courses";
import type { CourseContent, Lesson } from "@/lib/types";
import { LessonTypeIcon } from "@/components/academy/shared";

export function SyllabusPane({
  courseId,
  content,
  selectedLessonId,
  selectedModuleId,
  busy,
  onSelectLesson,
  onSelectModule,
  onAddModule,
  onAddLesson,
  onBusy,
}: {
  courseId: string;
  content: CourseContent;
  selectedLessonId: string | null;
  selectedModuleId: string | null;
  busy: boolean;
  onSelectLesson: (lesson: Lesson) => void;
  onSelectModule: (moduleId: string) => void;
  onAddModule: () => void;
  onAddLesson: (moduleId: string) => void;
  onBusy: (value: boolean) => void;
}) {
  const t = useTranslations();
  const [dragLessonId, setDragLessonId] = useState<string | null>(null);

  const lessonsOf = (moduleId: string) =>
    content.lessons.filter((lesson) => lesson.moduleId === moduleId);

  const onDropLesson = async (moduleId: string, targetLessonId: string) => {
    if (!dragLessonId || dragLessonId === targetLessonId) return;
    const group = [...lessonsOf(moduleId)];
    const fromIndex = group.findIndex((lesson) => lesson.id === dragLessonId);
    const toIndex = group.findIndex((lesson) => lesson.id === targetLessonId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = group.splice(fromIndex, 1);
    group.splice(toIndex, 0, moved);

    const flat: string[] = [];
    for (const block of content.modules) {
      const ids =
        block.id === moduleId
          ? group.map((lesson) => lesson.id)
          : lessonsOf(block.id).map((lesson) => lesson.id);
      flat.push(...ids);
    }
    const known = new Set(flat);
    for (const lesson of content.lessons) {
      if (!known.has(lesson.id)) flat.push(lesson.id);
    }

    onBusy(true);
    try {
      await reorderLessons(courseId, flat);
    } finally {
      onBusy(false);
      setDragLessonId(null);
    }
  };

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-glass-border px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {t("workspaceModules")}
        </p>
        <button
          type="button"
          className="text-[11px] font-semibold text-brand hover:underline"
          disabled={busy}
          onClick={onAddModule}
        >
          {t("workspaceAddModule")}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {content.modules.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-muted">
            {t("workspaceAddModule")}
          </p>
        ) : (
          content.modules.map((module) => (
            <ModuleTree
              key={module.id}
              courseId={courseId}
              moduleId={module.id}
              title={module.title}
              order={module.order}
              lessons={lessonsOf(module.id)}
              selected={selectedModuleId === module.id}
              selectedLessonId={selectedLessonId}
              busy={busy}
              dragLessonId={dragLessonId}
              onSelectModule={() => onSelectModule(module.id)}
              onSelectLesson={onSelectLesson}
              onAddLesson={() => onAddLesson(module.id)}
              onDragStart={setDragLessonId}
              onDropLesson={(lessonId) => void onDropLesson(module.id, lessonId)}
              onBusy={onBusy}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function ModuleTree({
  courseId,
  moduleId,
  title,
  order,
  lessons,
  selected,
  selectedLessonId,
  busy,
  dragLessonId,
  onSelectModule,
  onSelectLesson,
  onAddLesson,
  onDragStart,
  onDropLesson,
  onBusy,
}: {
  courseId: string;
  moduleId: string;
  title: string;
  order: number;
  lessons: Lesson[];
  selected: boolean;
  selectedLessonId: string | null;
  busy: boolean;
  dragLessonId: string | null;
  onSelectModule: () => void;
  onSelectLesson: (lesson: Lesson) => void;
  onAddLesson: () => void;
  onDragStart: (lessonId: string) => void;
  onDropLesson: (targetLessonId: string) => void;
  onBusy: (value: boolean) => void;
}) {
  const t = useTranslations();
  const [draft, setDraft] = useState(title);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => setDraft(title), [title]);

  const rename = async () => {
    if (!draft.trim() || draft === title) return;
    onBusy(true);
    try {
      await upsertModule({ courseId, moduleId, title: draft, order });
    } finally {
      onBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`${t("actionDelete")}: ${title}?`)) return;
    onBusy(true);
    try {
      await deleteModule(courseId, moduleId);
    } finally {
      onBusy(false);
    }
  };

  return (
    <div
      className={`mb-2 rounded-xl border ${
        selected ? "border-brand/40 bg-brand/5" : "border-transparent"
      }`}
    >
      <div className="flex items-center gap-1 px-1.5 py-1">
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center text-muted"
          onClick={() => setExpanded((value) => !value)}
        >
          <span className={`text-xs transition-transform ${expanded ? "rotate-90" : ""}`}>
            ▸
          </span>
        </button>
        <input
          value={draft}
          onFocus={onSelectModule}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void rename()}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
        />
        <button
          type="button"
          className="px-1 text-[11px] text-muted hover:text-danger"
          disabled={busy}
          onClick={() => void remove()}
        >
          ✕
        </button>
      </div>
      {expanded ? (
        <ul className="space-y-0.5 px-1 pb-2">
          {lessons.map((lesson) => (
            <LessonTreeRow
              key={lesson.id}
              courseId={courseId}
              lesson={lesson}
              active={lesson.id === selectedLessonId}
              dragging={dragLessonId === lesson.id}
              busy={busy}
              onSelect={() => onSelectLesson(lesson)}
              onDragStart={() => onDragStart(lesson.id)}
              onDrop={() => onDropLesson(lesson.id)}
              onBusy={onBusy}
            />
          ))}
          <li>
            <button
              type="button"
              className="w-full rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold text-brand hover:bg-white/[0.04]"
              disabled={busy}
              onClick={onAddLesson}
            >
              + {t("workspaceAddLesson")}
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

function LessonTreeRow({
  courseId,
  lesson,
  active,
  dragging,
  busy,
  onSelect,
  onDragStart,
  onDrop,
  onBusy,
}: {
  courseId: string;
  lesson: Lesson;
  active: boolean;
  dragging: boolean;
  busy: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDrop: () => void;
  onBusy: (value: boolean) => void;
}) {
  const t = useTranslations();

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const remove = async () => {
    if (!window.confirm(`${t("actionDelete")}: ${lesson.title}?`)) return;
    onBusy(true);
    try {
      await deleteLesson(courseId, lesson.id);
    } finally {
      onBusy(false);
    }
  };

  return (
    <li>
      <div
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", lesson.id);
          event.dataTransfer.effectAllowed = "move";
          onDragStart();
        }}
        onDragOver={onDragOver}
        onDrop={(event) => {
          event.preventDefault();
          onDrop();
        }}
        className={`group flex items-center gap-1 rounded-lg px-1.5 py-1.5 ${
          active ? "bg-brand/20 text-brand" : "hover:bg-white/[0.04]"
        } ${dragging ? "opacity-50" : ""}`}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={onSelect}
        >
          <LessonTypeIcon type={lesson.type} />
          <span className="truncate text-xs">{lesson.title}</span>
        </button>
        <button
          type="button"
          className="inline px-1 text-[10px] text-muted hover:text-danger lg:invisible lg:group-hover:visible"
          disabled={busy}
          onClick={() => void remove()}
        >
          ✕
        </button>
      </div>
    </li>
  );
}
