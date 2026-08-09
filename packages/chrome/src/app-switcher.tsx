"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import {
  getAppEntry,
  listVisibleApps,
  PULSE_APPS,
  type AppRegistryEntry,
  type PulseAppId,
  type UserRole,
} from "@pulse/shared";
import { AppIcon, IconCheck, IconChevron } from "./icons";

export type AppSwitcherHomeLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
};

export type AppSwitcherProps = {
  current: PulseAppId;
  role?: UserRole;
  /** Build final navigation URL (SSO handoff or plain). */
  resolveSwitchUrl: (
    target: PulseAppId,
    homePath: string,
  ) => Promise<string>;
  /** Slot for product mark in the trigger (e.g. Pulse logo). */
  renderTriggerIcon?: (meta: AppRegistryEntry) => ReactNode;
  /** Single-app home link — each host passes its i18n Link. */
  HomeLink: ComponentType<AppSwitcherHomeLinkProps>;
};

export function AppSwitcher({
  current,
  role,
  resolveSwitchUrl,
  renderTriggerIcon,
  HomeLink,
}: AppSwitcherProps) {
  const t = useTranslations();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const apps = useMemo(() => listVisibleApps(role), [role]);

  const currentMeta =
    apps.find((a) => a.id === current) ??
    getAppEntry(current) ??
    PULSE_APPS[0]!;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const switchTo = async (target: PulseAppId) => {
    if (target === current) {
      setOpen(false);
      setSwitchError(null);
      return;
    }
    const meta = getAppEntry(target);
    if (!meta) return;
    setBusy(true);
    setSwitchError(null);
    try {
      window.location.assign(await resolveSwitchUrl(target, meta.homePath));
    } catch {
      setSwitchError(t("appSwitchHandoffFailed"));
      setBusy(false);
      // Keep panel open so the user sees the error.
    }
  };

  const canSwitch = apps.length > 1;

  const triggerIcon = renderTriggerIcon?.(currentMeta) ?? (
    <AppIcon id={currentMeta.id} width={18} height={18} />
  );

  const brandInner = (
    <>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg ${currentMeta.tileClass}`}
      >
        {triggerIcon}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-lg font-bold leading-tight tracking-tight">
          {t(currentMeta.labelKey)}
        </span>
        {canSwitch ? (
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted">
            {t("appSwitchTitle")}
          </span>
        ) : null}
      </span>
      {canSwitch ? (
        <IconChevron
          width={14}
          height={14}
          className={`ml-0.5 shrink-0 text-muted transition duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      ) : null}
    </>
  );

  return (
    <div ref={rootRef} className="relative">
      {canSwitch ? (
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={t("appSwitchTitle")}
          disabled={busy}
          onClick={() => setOpen((v) => !v)}
          className="group inline-flex max-w-full cursor-pointer items-center gap-2 rounded-xl px-1.5 py-1 text-left transition hover:bg-ink/[0.05] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/[0.06]"
        >
          {brandInner}
        </button>
      ) : (
        <HomeLink
          href={currentMeta.homePath}
          className="inline-flex max-w-full items-center gap-2 rounded-xl px-1.5 py-1 text-left transition hover:bg-ink/[0.05] dark:hover:bg-white/[0.06]"
          aria-label={t(currentMeta.labelKey)}
        >
          {brandInner}
        </HomeLink>
      )}

      {open && canSwitch ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={t("appSwitchTitle")}
          className="absolute left-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-glass-border bg-sheet shadow-xl"
        >
          <p className="px-3 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-wide text-muted">
            {t("appSwitchTitle")}
          </p>
          {switchError ? (
            <p className="mx-1.5 mb-1.5 rounded-lg bg-red-500/10 px-2.5 py-2 text-[11px] leading-snug text-red-500">
              {switchError}
            </p>
          ) : null}
          <ul className="max-h-[min(20rem,50vh)] overflow-y-auto p-1.5">
            {apps.map((app) => {
              const active = app.id === current;
              return (
                <li key={app.id}>
                  <button
                    type="button"
                    disabled={busy}
                    aria-current={active ? "true" : undefined}
                    onClick={() => void switchTo(app.id)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      active
                        ? "bg-brand/10"
                        : "hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${app.tileClass}`}
                    >
                      <AppIcon id={app.id} width={20} height={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {t(app.labelKey)}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] leading-snug text-muted">
                        {t(app.blurbKey)}
                      </span>
                    </span>
                    {active ? (
                      <IconCheck
                        width={16}
                        height={16}
                        className="shrink-0 text-brand"
                      />
                    ) : (
                      <span className="w-4 shrink-0" aria-hidden />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
