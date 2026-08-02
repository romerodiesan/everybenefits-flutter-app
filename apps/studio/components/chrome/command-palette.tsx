"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

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
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const commands = useMemo<Command[]>(
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

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 p-4 pt-[12vh]"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="studio-panel w-full max-w-lg overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("commandPlaceholder")}
          className="h-12 w-full border-b border-glass-border bg-transparent px-4 text-sm outline-none placeholder:text-muted"
          onKeyDown={(e) => {
            if (e.key === "Escape") onOpenChange(false);
            if (e.key === "Enter" && filtered[0]) {
              filtered[0].run();
              onOpenChange(false);
            }
          }}
        />
        <ul className="max-h-72 overflow-auto p-1">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-white/[0.05]"
                onClick={() => {
                  c.run();
                  onOpenChange(false);
                }}
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
