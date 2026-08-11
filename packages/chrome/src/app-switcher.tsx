"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
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

const PANEL_WIDTH_PX = 220;

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
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const access = permissions ?? role;
  const apps = useMemo(() => listVisibleApps(access), [access]);

  const currentMeta =
    apps.find((a) => a.id === current) ??
    getAppEntry(current) ??
    PULSE_APPS[0]!;

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const margin = 8;
      let left = r.left;
      left = Math.min(left, window.innerWidth - PANEL_WIDTH_PX - margin);
      left = Math.max(margin, left);
      let top = r.bottom + 6;
      const estimatedHeight = 16 + apps.length * 44 + (switchError ? 36 : 0);
      if (top + estimatedHeight > window.innerHeight - margin) {
        top = Math.max(margin, r.top - estimatedHeight - 6);
      }
      setCoords({ top, left });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, apps.length, switchError]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
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
    <AppIcon id={currentMeta.id} width={16} height={16} />
  );

  const brandInner = (
    <>
      <span
        className={`relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md ${currentMeta.tileClass}`}
      >
        {triggerIcon}
        {busy ? (
          <span
            className="absolute inset-0 animate-pulse rounded-md bg-sheet/50"
            aria-hidden
          />
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-base font-bold leading-tight tracking-tight text-ink">
          {t(currentMeta.labelKey)}
        </span>
        {canSwitch ? (
          <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
            {t("appSwitchTitle")}
          </span>
        ) : null}
      </span>
      {canSwitch ? (
        <IconChevron
          width={12}
          height={12}
          className={`ml-0.5 shrink-0 text-muted transition duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      ) : null}
    </>
  );

  const triggerClass =
    "group inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-lg px-1 py-0.5 text-left outline-none transition hover:bg-ink/[0.05] focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/[0.06]";

  const panel =
    open && canSwitch && mounted && coords
      ? createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={t("appSwitchTitle")}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: PANEL_WIDTH_PX,
            }}
            className="z-[200] overflow-hidden rounded-xl border border-glass-border bg-sheet shadow-[0_12px_28px_-12px_rgba(0,0,0,0.45)]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-glass-border px-2.5 py-1.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted">
                {t("appSwitchTitle")}
              </p>
              <p className="truncate text-[10px] text-muted">
                {t(currentMeta.labelKey)}
              </p>
            </div>

            {switchError ? (
              <p className="mx-1.5 mt-1.5 rounded-lg bg-red-500/10 px-2 py-1.5 text-[10px] leading-snug text-red-500">
                {switchError}
              </p>
            ) : null}

            <ul className="max-h-[min(16rem,50vh)] space-y-0.5 overflow-y-auto p-1.5">
              {apps.map((app) => {
                const active = app.id === current;
                return (
                  <li key={app.id}>
                    <button
                      type="button"
                      disabled={busy}
                      aria-current={active ? "page" : undefined}
                      onClick={() => void switchTo(app.id)}
                      className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-60 ${
                        active
                          ? "bg-brand/10 ring-1 ring-brand/20"
                          : "hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${app.tileClass}`}
                      >
                        <AppIcon id={app.id} width={14} height={14} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold leading-tight text-ink">
                          {t(app.labelKey)}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] leading-snug text-muted">
                          {t(app.blurbKey)}
                        </span>
                      </span>
                      {active ? (
                        <IconCheck
                          width={14}
                          height={14}
                          className="shrink-0 text-brand"
                        />
                      ) : (
                        <span className="w-3.5 shrink-0" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )
      : null;

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
      {panel}
    </div>
  );
}
