"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { canAuthorCourses } from "@/lib/roles";
import { buildSsoHandoffUrl, ssoConsumeUrl } from "@/lib/sso";
import { useLocale } from "next-intl";
import { useAuth } from "@/lib/providers/auth-provider";

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
  const locale = useLocale();
  const router = useRouter();
  const { profile } = useAuth();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const isAuthor = profile ? canAuthorCourses(profile.role) : false;

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
      {
        id: "ai",
        label: t("navAi"),
        run: () => router.push("/ai"),
      },
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
    ];
    if (isAuthor) {
      items.push({
        id: "studio",
        label: t("studioTitle"),
        run: () => {
          void (async () => {
            const user = getFirebaseAuth().currentUser;
            if (!user) return;
            const idToken = await user.getIdToken();
            const consume = ssoConsumeUrl("studio", locale, "/");
            window.location.assign(await buildSsoHandoffUrl(consume, idToken));
          })();
        },
      });
    }
    return items;
  }, [isAuthor, locale, router, t]);

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
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-ink transition hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]"
                onClick={() => {
                  c.run();
                  onOpenChange(false);
                }}
              >
                {c.label}
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted">
              {t("commandEmpty")}
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
