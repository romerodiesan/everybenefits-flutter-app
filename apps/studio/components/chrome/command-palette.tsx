"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  CommandPalette as SharedCommandPalette,
  type CommandPaletteItem,
} from "@pulse/ui";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const router = useRouter();

  const commands = useMemo<CommandPaletteItem[]>(
    () => [
      {
        id: "library",
        label: t("navLibrary"),
        run: () => router.push("/"),
      },
      {
        id: "review",
        label: t("navReview"),
        run: () => router.push("/review"),
      },
      {
        id: "insights",
        label: t("navInsights"),
        run: () => router.push("/insights"),
      },
      {
        id: "preview",
        label: t("commandPreview"),
        run: () => {
          window.dispatchEvent(new CustomEvent("studio:toggle-preview"));
        },
      },
      {
        id: "submit",
        label: t("commandSubmit"),
        run: () => {
          window.dispatchEvent(new CustomEvent("studio:submit-review"));
        },
      },
      {
        id: "publish",
        label: t("commandPublish"),
        run: () => {
          window.dispatchEvent(new CustomEvent("studio:publish"));
        },
      },
      {
        id: "new-lesson",
        label: t("commandNewLesson"),
        run: () => {
          window.dispatchEvent(new CustomEvent("studio:add-lesson"));
        },
      },
    ],
    [router, t],
  );

  return (
    <SharedCommandPalette
      open={open}
      onOpenChange={onOpenChange}
      commands={commands}
      title={t("commandPlaceholder")}
      placeholder={t("commandPlaceholder")}
      emptyLabel="No matching commands"
      className="z-50 bg-black/55"
      panelClassName="studio-panel rounded-none border-0 shadow-2xl"
    />
  );
}
