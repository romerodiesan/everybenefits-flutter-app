"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type SVGProps,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { canAuthorCourses } from "@/lib/roles";
import {
  appBaseUrl,
  buildSsoHandoffUrl,
  ssoConsumeUrl,
  type PulseAppId,
} from "@/lib/sso";
import type { UserRole } from "@/lib/types";
import { BrandMark } from "@/components/chrome/brand-mark";

type IconProps = SVGProps<SVGSVGElement>;

function IconPulseMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M4.5 12h3.2l1.6-4.5 2.4 9 2-6.5H19.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconStudioMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M5 8h14v11H5zM9 8V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 13h6M9 16.5h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconChevron(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden {...props}>
      <path
        d="M4 6.2 8 10l4-3.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type AppMeta = {
  id: PulseAppId;
  labelKey: "appSwitchPulse" | "appSwitchStudio";
  blurbKey: "appSwitchPulseBlurb" | "appSwitchStudioBlurb";
  homePath: string;
  Icon: (props: IconProps) => ReactNode;
  tileClass: string;
  visible?: (role: UserRole | undefined) => boolean;
};

/** Registry of Pulse family apps. Add entries here as products launch. */
export const APPS: AppMeta[] = [
  {
    id: "pulse",
    labelKey: "appSwitchPulse",
    blurbKey: "appSwitchPulseBlurb",
    homePath: "/home",
    Icon: IconPulseMark,
    tileClass: "bg-brand/15 text-brand",
  },
  {
    id: "studio",
    labelKey: "appSwitchStudio",
    blurbKey: "appSwitchStudioBlurb",
    homePath: "/",
    Icon: IconStudioMark,
    tileClass: "bg-ink/[0.08] text-ink dark:bg-white/[0.1] dark:text-white",
    visible: (role) => Boolean(role && canAuthorCourses(role)),
  },
];

export function AppSwitcher({
  current,
  role,
}: {
  current: PulseAppId;
  role?: UserRole;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const apps = useMemo(
    () => APPS.filter((app) => !app.visible || app.visible(role)),
    [role],
  );

  const currentMeta = apps.find((a) => a.id === current) ?? APPS[0]!;
  const CurrentIcon = currentMeta.Icon;

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
      return;
    }
    const meta = APPS.find((a) => a.id === target);
    if (!meta) return;
    setBusy(true);
    try {
      const user = getFirebaseAuth().currentUser;
      if (user) {
        const idToken = await user.getIdToken();
        const consume = ssoConsumeUrl(target, locale, meta.homePath);
        window.location.assign(await buildSsoHandoffUrl(consume, idToken));
        return;
      }
      window.location.assign(`${appBaseUrl(target)}/${locale}${meta.homePath}`);
    } catch {
      window.location.assign(`${appBaseUrl(target)}/${locale}`);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  // Authors in Studio always see both apps; keep chevron for parity.
  const canSwitch = apps.length > 1;

  const brandInner = (
    <>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg ${currentMeta.tileClass}`}
      >
        {current === "studio" || current === "pulse" ? (
          <BrandMark size={28} />
        ) : (
          <CurrentIcon width={18} height={18} />
        )}
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
        <Link
          href={currentMeta.homePath}
          className="inline-flex max-w-full items-center gap-2 rounded-xl px-1.5 py-1 text-left transition hover:bg-ink/[0.05] dark:hover:bg-white/[0.06]"
          aria-label={t(currentMeta.labelKey)}
        >
          {brandInner}
        </Link>
      )}

      {open && canSwitch ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={t("appSwitchTitle")}
          className="absolute left-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-glass-border bg-sheet p-2 shadow-xl"
        >
          <p className="px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wide text-muted">
            {t("appSwitchTitle")}
          </p>
          <ul className="grid grid-cols-2 gap-1.5">
            {apps.map((app) => {
              const active = app.id === current;
              const Icon = app.Icon;
              return (
                <li key={app.id}>
                  <button
                    type="button"
                    disabled={busy}
                    aria-current={active ? "true" : undefined}
                    onClick={() => void switchTo(app.id)}
                    className={`flex h-full w-full cursor-pointer flex-col items-start gap-2 rounded-xl px-2.5 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      active
                        ? "bg-brand/10 ring-1 ring-brand/30"
                        : "hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${app.tileClass}`}
                    >
                      <Icon width={20} height={20} />
                    </span>
                    <span className="min-w-0 w-full">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-ink">
                          {t(app.labelKey)}
                        </span>
                        {active ? (
                          <span className="shrink-0 rounded-md bg-brand/15 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand">
                            {t("appSwitchHere")}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted">
                        {t(app.blurbKey)}
                      </span>
                    </span>
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
