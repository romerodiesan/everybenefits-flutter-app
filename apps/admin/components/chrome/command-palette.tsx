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
      { id: "overview", label: t("navOverview"), run: () => router.push("/") },
      { id: "users", label: t("navUsers"), run: () => router.push("/users") },
      {
        id: "orgs",
        label: t("navOrganizations"),
        run: () => router.push("/organizations"),
      },
      {
        id: "approvals",
        label: t("navApprovals"),
        run: () => router.push("/approvals"),
      },
      {
        id: "notifications",
        label: t("navNotifications"),
        run: () => router.push("/notifications"),
      },
      {
        id: "settings",
        label: t("navSettings"),
        run: () => router.push("/settings"),
      },
    ],
    [router, t],
  );

  return (
    <SharedCommandPalette
      open={open}
      onOpenChange={onOpenChange}
      commands={commands}
      title={t("navCommand")}
      placeholder={t("navCommand")}
      emptyLabel={t("commandEmpty")}
    />
  );
}
