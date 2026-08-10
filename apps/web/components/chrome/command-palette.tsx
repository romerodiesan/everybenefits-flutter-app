"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { usePulseAiEnabled } from "@/lib/hooks/use-pulse-ai-enabled";
import { useAuth, useAccess } from "@/lib/providers/auth-provider";
import { canAccessTools } from "@/lib/roles";
import { AGENT_TOOLS } from "@/lib/tools/catalog";

type Command = {
  id: string;
  label: string;
  run: () => void;
};

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
  const access = useAccess();
  const pulseAiEnabled = usePulseAiEnabled();
  const [query, setQuery] = useState("");
  const activeQuery = open ? query : "";
  const toolsAllowed = profile ? canAccessTools(access) : false;

  const close = () => {
    setQuery("");
    onOpenChange(false);
  };

  const commands = useMemo<Command[]>(() => {
    const items: Command[] = [
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
        run: () => router.push("/account"),
      },
    );
    return items;
  }, [pulseAiEnabled, toolsAllowed, router, t]);

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(activeQuery.trim().toLowerCase()),
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-4 pt-[12vh] dark:bg-black/55"
      onClick={close}
    >
      <div
        className="pulse-sheet w-full max-w-lg overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("navCommand")}
          className="w-full border-b border-glass-border bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-muted"
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
            if (e.key === "Enter" && filtered[0]) {
              filtered[0].run();
              close();
            }
          }}
        />
        <ul className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">{t("emptyGeneric")}</li>
          ) : (
            filtered.map((cmd) => (
              <li key={cmd.id}>
                <button
                  type="button"
                  className="flex w-full px-4 py-2.5 text-left text-sm font-medium transition hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]"
                  onClick={() => {
                    cmd.run();
                    close();
                  }}
                >
                  {cmd.label}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
