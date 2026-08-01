"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { Course } from "@/lib/types";
import { Button } from "@pulse/ui";
import { StatusChip } from "@/components/academy/shared";

export function CourseWorkspaceHeader({
  course,
  syncDot,
  syncLabel,
  busy,
  isAdmin,
  onMedia,
  onPreview,
  onChangeStatus,
  onRemove,
}: {
  course: Course;
  syncDot: string;
  syncLabel: string | null;
  busy: boolean;
  isAdmin: boolean;
  onMedia: () => void;
  onPreview: () => void;
  onChangeStatus: (status: Course["status"]) => void;
  onRemove: () => void;
}) {
  const t = useTranslations();

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-glass-border px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-[11px] font-semibold text-muted hover:text-ink"
          >
            ← {t("navLibrary")}
          </Link>
          <span
            className={`inline-block h-2 w-2 rounded-full ${syncDot}`}
            title={syncLabel ?? undefined}
          />
          {syncLabel ? (
            <span className="text-[11px] text-muted">{syncLabel}</span>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="truncate font-display text-lg sm:text-xl">{course.title}</h1>
          <StatusChip status={course.status} />
        </div>
      </div>
      <div className="flex max-w-full flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          className="h-9 px-3 text-xs"
          onClick={onMedia}
        >
          {t("actionMedia")}
        </Button>
        <Button
          variant="secondary"
          className="h-9 px-3 text-xs"
          onClick={onPreview}
        >
          {t("actionPreview")}
        </Button>
        {course.status === "draft" && !isAdmin ? (
          <Button
            className="h-9 px-3 text-xs"
            disabled={busy}
            onClick={() => onChangeStatus("pending")}
          >
            {t("actionSubmit")}
          </Button>
        ) : null}
        {isAdmin && course.status !== "published" ? (
          <Button
            className="h-9 px-3 text-xs"
            disabled={busy}
            onClick={() => onChangeStatus("published")}
          >
            {t("actionPublish")}
          </Button>
        ) : null}
        {isAdmin && course.status === "pending" ? (
          <Button
            variant="secondary"
            className="h-9 px-3 text-xs"
            disabled={busy}
            onClick={() => onChangeStatus("draft")}
          >
            {t("actionReject")}
          </Button>
        ) : null}
        {isAdmin && course.status === "published" ? (
          <Button
            variant="secondary"
            className="h-9 px-3 text-xs"
            disabled={busy}
            onClick={() => onChangeStatus("draft")}
          >
            {t("actionUnpublish")}
          </Button>
        ) : null}
        <Button
          variant="danger"
          className="h-9 px-3 text-xs"
          disabled={busy}
          onClick={onRemove}
        >
          {t("actionDelete")}
        </Button>
      </div>
    </header>
  );
}
