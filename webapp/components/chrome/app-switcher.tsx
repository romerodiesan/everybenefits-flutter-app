"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getFirebaseAuth } from "@/lib/firebase/client";
import {
  appBaseUrl,
  handoffUrlWithToken,
  ssoConsumeUrl,
  type PulseAppId,
} from "@/lib/sso";

type AppMeta = {
  id: PulseAppId;
  labelKey: "appSwitchPulse" | "appSwitchStudio";
  blurbKey: "appSwitchPulseBlurb" | "appSwitchStudioBlurb";
};

const APPS: AppMeta[] = [
  {
    id: "pulse",
    labelKey: "appSwitchPulse",
    blurbKey: "appSwitchPulseBlurb",
  },
  {
    id: "studio",
    labelKey: "appSwitchStudio",
    blurbKey: "appSwitchStudioBlurb",
  },
];

export function AppSwitcher({
  current,
  compact = false,
}: {
  current: PulseAppId;
  compact?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const switchTo = async (target: PulseAppId) => {
    if (target === current) {
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      const user = getFirebaseAuth().currentUser;
      const nextHome = target === "studio" ? "/" : "/home";
      if (user) {
        const idToken = await user.getIdToken();
        const consume = ssoConsumeUrl(target, locale, nextHome);
        window.location.assign(handoffUrlWithToken(consume, idToken));
        return;
      }
      window.location.assign(`${appBaseUrl(target)}/${locale}`);
    } catch {
      window.location.assign(`${appBaseUrl(target)}/${locale}`);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const currentMeta = APPS.find((a) => a.id === current)!;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className={
          compact
            ? "inline-flex h-8 items-center gap-1.5 rounded-lg border border-glass-border bg-ink/[0.04] px-2.5 text-xs font-semibold text-ink hover:bg-ink/[0.07] dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
            : "inline-flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-glass-border bg-ink/[0.04] px-3 text-sm font-semibold text-ink hover:bg-ink/[0.07] dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
        }
      >
        <span className="truncate">{t(currentMeta.labelKey)}</span>
        <span className="text-[10px] text-muted" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute left-0 z-50 mt-1.5 min-w-[220px] overflow-hidden rounded-xl border border-glass-border bg-sheet shadow-xl"
        >
          {APPS.map((app) => {
            const active = app.id === current;
            return (
              <li key={app.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void switchTo(app.id)}
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition ${
                    active
                      ? "bg-brand/15 text-brand"
                      : "text-ink hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="font-semibold">{t(app.labelKey)}</span>
                  <span className="text-[11px] text-muted">
                    {t(app.blurbKey)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
