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
  type RoleOrPermissions,
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
  /** Role slug or resolved permission list (prefer permissions for custom roles). */
  permissions?: RoleOrPermissions;
  /** @deprecated Use `permissions`. */
  role?: RoleOrPermissions;
  /** Build final navigation URL (SSO handoff or plain). */
  resolveSwitchUrl: (
    target: PulseAppId,
    homePath: string,
  ) => Promise<string>;
  /** Optional product mark override for the trigger tile only. */
  renderTriggerIcon?: (meta: AppRegistryEntry) => ReactNode;
  /** Single-app home link — each host passes its i18n Link. */
  HomeLink: ComponentType<AppSwitcherHomeLinkProps>;
};

export function AppSwitcher({
  current,
  permissions,
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
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const access = permissions ?? role;
  const apps = useMemo(() => listVisibleApps(access), [access]);

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
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
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
    }
  };

  const canSwitch = apps.length > 1;

  const triggerIcon = renderTriggerIcon?.(currentMeta) ?? (
    <AppIcon id={currentMeta.id} width={18} height={18} />
  );

  const brandInner = (
    <>
      <span
        className={`relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg ${currentMeta.tileClass}`}
      >
        {triggerIcon}
        {busy ? (
          <span
            className="absolute inset-0 animate-pulse rounded-lg bg-sheet/50"
            aria-hidden
          />
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-lg font-bold leading-tight tracking-tight text-ink">
          {t(currentMeta.labelKey)}
        </span>
        {canSwitch ? (
          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
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

  const triggerClass =
    "group inline-flex max-w-full cursor-pointer items-center gap-2 rounded-xl px-1.5 py-1 text-left outline-none transition hover:bg-ink/[0.05] focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/[0.06]";

  return (
    <div ref={rootRef} className="relative">
      {canSwitch ? (
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={t("appSwitchTitle")}
          aria-busy={busy}
          disabled={busy}
          onClick={() => {
            setSwitchError(null);
            setOpen((v) => !v);
          }}
          className={triggerClass}
        >
          {brandInner}
        </button>
      ) : (
        <HomeLink
          href={currentMeta.homePath}
          className={triggerClass}
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
          className="absolute left-0 top-full z-50 mt-2 w-[min(20.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-glass-border bg-sheet shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-glass-border px-3.5 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              {t("appSwitchTitle")}
            </p>
            <p className="truncate text-[11px] text-muted">
              {t(currentMeta.labelKey)}
            </p>
          </div>

          {switchError ? (
            <p className="mx-2 mt-2 rounded-xl bg-red-500/10 px-2.5 py-2 text-[11px] leading-snug text-red-500">
              {switchError}
            </p>
          ) : null}

          <ul className="max-h-[min(22rem,55vh)] space-y-0.5 overflow-y-auto p-2">
            {apps.map((app) => {
              const active = app.id === current;
              return (
                <li key={app.id}>
                  <button
                    type="button"
                    disabled={busy}
                    aria-current={active ? "page" : undefined}
                    onClick={() => void switchTo(app.id)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-60 ${
                      active
                        ? "bg-brand/10 ring-1 ring-brand/20"
                        : "hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${app.tileClass}`}
                    >
                      <AppIcon id={app.id} width={20} height={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {t(app.labelKey)}
                        </span>
                        {active ? (
                          <span className="shrink-0 rounded-full bg-brand/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand">
                            {t("appSwitchHere")}
                          </span>
                        ) : null}
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
