"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  CommandPalette as SharedCommandPalette,
  type CommandPaletteItem,
} from "@pulse/ui";
import { usePulseAiEnabled } from "@/lib/hooks/use-pulse-ai-enabled";
import { useAuth } from "@/lib/providers/auth-provider";
import { canAccessTools } from "@/lib/roles";
import { AGENT_TOOLS } from "@/lib/tools/catalog";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { profile } = useAuth();
  const pulseAiEnabled = usePulseAiEnabled();
  const toolsAllowed = profile ? canAccessTools(profile.role) : false;

  const commands = useMemo<CommandPaletteItem[]>(() => {
    const items: CommandPaletteItem[] = [
      {
        id: "home",
        label: t("navHome"),
        run: () => router.push("/home"),
      },
      {
        id: "chats",
        label: t("navChats"),
        run: () => router.push("/chats"),
      },
    ];
    if (pulseAiEnabled) {
      items.push({
        id: "ai",
        label: t("navAi"),
        run: () => router.push("/ai"),
      });
    }
    items.push({
      id: "academy",
      label: t("navAcademy"),
      run: () => router.push("/academy"),
    });
    if (toolsAllowed) {
      for (const tool of AGENT_TOOLS) {
        items.push({
          id: `tool-${tool.id}`,
          label: t(tool.titleKey),
          run: () => router.push(tool.href),
        });
      }
    }
    items.push(
      {
        id: "notifications",
        label: t("navNotifications"),
        run: () => router.push("/notifications"),
      },
      {
        id: "profile",
        label: t("navProfile"),
        run: () => router.push("/profile"),
      },
    );
    return items;
  }, [pulseAiEnabled, toolsAllowed, router, t]);

  return (
    <SharedCommandPalette
      open={open}
      onOpenChange={onOpenChange}
      commands={commands}
      title={t("navCommand")}
      placeholder={t("navCommand")}
      emptyLabel={t("emptyGeneric")}
      className="z-50 bg-black/45 dark:bg-black/55"
      panelClassName="pulse-sheet rounded-none border-0 shadow-2xl"
    />
  );
}
