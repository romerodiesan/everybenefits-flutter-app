"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { usePulseAiEnabled } from "@/lib/hooks/use-pulse-ai-enabled";

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
  const pulseAiEnabled = usePulseAiEnabled();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

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
    items.push(
      {
        id: "academy",
        label: t("navAcademy"),
        run: () => router.push("/academy"),
      },
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
  }, [pulseAiEnabled, router, t]);

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-4 pt-[12vh] dark:bg-black/55"
      onClick={() => onOpenChange(false)}
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
            if (e.key === "Escape") onOpenChange(false);
            if (e.key === "Enter" && filtered[0]) {
              filtered[0].run();
              onOpenChange(false);
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
                    onOpenChange(false);
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
