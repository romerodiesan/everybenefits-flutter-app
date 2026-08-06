"use client";

import { useTranslations } from "next-intl";
import {
  useLessonUploadQueue,
  type UploadJob,
} from "@/lib/uploads/lesson-upload-queue";
import { ProgressBar } from "@/components/academy/shared";
import { Button } from "@/components/ui/primitives";

function statusLabel(
  t: ReturnType<typeof useTranslations>,
  status: UploadJob["status"],
) {
  if (status === "queued") return t("workspaceUploadQueued");
  if (status === "uploading") return t("workspaceUploadUploading");
  if (status === "done") return t("workspaceUploadDone");
  if (status === "cancelled") return t("workspaceUploadCancelled");
  return t("workspaceUploadError");
}

export function UploadQueueStrip() {
  const t = useTranslations();
  const {
    jobs,
    activeCount,
    cancel,
    clearFinished,
    expandQueue,
    setExpandQueue,
  } = useLessonUploadQueue();

  if (jobs.length === 0) return null;

  const finished = jobs.filter(
    (job) =>
      job.status === "done" ||
      job.status === "error" ||
      job.status === "cancelled",
  ).length;

  return (
    <div className="border-t border-glass-border bg-rail/40">
      <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-4">
        <button
          type="button"
          className="text-left text-xs font-semibold text-ink"
          onClick={() => setExpandQueue(!expandQueue)}
        >
          {t("workspaceUploads")}
          {activeCount > 0
            ? ` · ${t("workspaceActiveUploads", { count: activeCount })}`
            : null}
        </button>
        <div className="flex items-center gap-2">
          {finished > 0 ? (
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={clearFinished}
            >
              {t("workspaceUploadsClear")}
            </Button>
          ) : null}
          <button
            type="button"
            className="text-xs text-muted hover:text-ink"
            onClick={() => setExpandQueue(!expandQueue)}
            aria-expanded={expandQueue}
          >
            {expandQueue ? "▾" : "▴"}
          </button>
        </div>
      </div>
      {expandQueue ? (
        <ul className="max-h-40 space-y-2 overflow-y-auto border-t border-glass-border px-3 py-2 sm:px-4">
          {jobs.length === 0 ? (
            <li className="text-xs text-muted">{t("workspaceUploadsEmpty")}</li>
          ) : (
            jobs.map((job) => (
              <li key={job.id} className="rounded-lg bg-panel/80 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{job.fileName}</p>
                    <p className="text-[11px] text-muted">
                      {statusLabel(t, job.status)}
                      {job.error ? ` · ${job.error}` : null}
                    </p>
                  </div>
                  {job.status === "queued" || job.status === "uploading" ? (
                    <button
                      type="button"
                      className="shrink-0 text-[11px] font-semibold text-muted hover:text-danger"
                      onClick={() => cancel(job.id)}
                    >
                      {t("workspaceUploadCancel")}
                    </button>
                  ) : null}
                </div>
                {job.status === "uploading" ? (
                  <div className="mt-2">
                    <ProgressBar value={job.progress} />
                  </div>
                ) : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
