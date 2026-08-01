"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { getStorageUrl, resolveVideoUrl } from "@/lib/firebase/courses";
import type { Course, Lesson } from "@/lib/types";
import { Button } from "@pulse/ui";

type MediaItem = {
  id: string;
  label: string;
  path: string | null;
  url: string | null;
  kind: "cover" | "video";
};

/** Side panel listing cover art and lesson videos for quick URL copy. */
export function MediaLibrary({
  course,
  lessons,
  open,
  onClose,
}: {
  course: Course;
  lessons: Lesson[];
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations();
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const items = useMemo<MediaItem[]>(() => {
    const list: MediaItem[] = [];
    if (course.coverPath || course.coverUrl) {
      list.push({
        id: "cover",
        label: t("workspaceCover"),
        path: course.coverPath,
        url: course.coverUrl,
        kind: "cover",
      });
    }
    for (const lesson of lessons) {
      if (!lesson.videoPath && !lesson.videoUrl) continue;
      list.push({
        id: lesson.id,
        label: lesson.title,
        path: lesson.videoPath,
        url: lesson.videoUrl,
        kind: "video",
      });
    }
    return list;
  }, [course.coverPath, course.coverUrl, lessons, t]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const run = async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        items.map(async (item) => {
          if (item.url?.trim()) {
            next[item.id] = item.url.trim();
            return;
          }
          if (!item.path?.trim()) return;
          try {
            if (item.kind === "cover") {
              next[item.id] = await getStorageUrl(item.path);
            } else {
              const lesson = lessons.find((entry) => entry.id === item.id);
              if (!lesson) return;
              const url = await resolveVideoUrl(lesson);
              if (url) next[item.id] = url;
            }
          } catch {
            // Leave unresolved; row still shows the storage path.
          }
        }),
      );
      if (!cancelled) setResolved(next);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [open, items, lessons]);

  if (!open) return null;

  const copy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
    } catch {
      // Clipboard may be blocked.
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col border-l border-glass-border bg-[var(--panel)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-glass-border px-4 py-3">
          <h2 className="font-display text-lg">{t("mediaTitle")}</h2>
          <Button variant="ghost" className="h-9 px-3 text-xs" onClick={onClose}>
            {t("actionCancel")}
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">{t("mediaEmpty")}</p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => {
                const url = resolved[item.id] ?? item.url?.trim() ?? null;
                const display = url ?? item.path ?? "—";
                return (
                  <li key={item.id} className="studio-panel p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.label}</p>
                        <p className="mt-1 break-all text-[11px] text-muted">
                          {item.path ?? display}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        className="h-8 shrink-0 px-2.5 text-[11px]"
                        disabled={!url}
                        onClick={() => url && void copy(item.id, url)}
                      >
                        {copiedId === item.id ? t("mediaCopied") : t("mediaCopy")}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
