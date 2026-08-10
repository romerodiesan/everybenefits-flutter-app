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
        id: "roles",
        label: t("navRoles"),
        run: () => router.push("/roles"),
      },
      {
        id: "settings",
        label: t("navSettings"),
        run: () => router.push("/settings"),
      },
    ],
    [router, t],
  );

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 p-4 pt-[12vh]">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-glass-border bg-sheet shadow-2xl">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("navCommand")}
          className="w-full border-b border-glass-border bg-transparent px-4 py-3 text-sm outline-none"
        />
        <ul className="max-h-72 overflow-y-auto p-2">
          {filtered.map((cmd) => (
            <li key={cmd.id}>
              <button
                type="button"
                className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-brand/10"
                onClick={() => {
                  onOpenChange(false);
                  cmd.run();
                }}
              >
                {cmd.label}
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="px-3 py-4 text-sm text-muted">{t("commandEmpty")}</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
