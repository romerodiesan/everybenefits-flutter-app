"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { getFirebaseAuth } from "@pulse/firebase-client";
import { canAccessAdmin, canAuthorCourses, type UserRole } from "@pulse/shared";
import {
  appBaseUrl,
  buildSsoHandoffUrl,
  ssoConsumeUrl,
  type PulseAppId,
} from "@pulse/sso/client";
import { BrandMark } from "./brand-mark";

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

function IconAdminMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 3.5 19 7v5c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5V7l7-3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 12.2l1.8 1.8 3.4-3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
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
  labelKey: "appSwitchPulse" | "appSwitchStudio" | "appSwitchAdmin";
  homePath: string;
  Icon: (props: IconProps) => ReactNode;
  visible?: (role: UserRole | undefined) => boolean;
};

/** Registry of Pulse family apps. Add entries here as products launch. */
export const APPS: AppMeta[] = [
  {
    id: "pulse",
    labelKey: "appSwitchPulse",
    homePath: "/home",
    Icon: IconPulseMark,
  },
  {
    id: "studio",
    labelKey: "appSwitchStudio",
    homePath: "/",
    Icon: IconStudioMark,
    visible: (role) => Boolean(role && canAuthorCourses(role)),
  },
  {
    id: "admin",
    labelKey: "appSwitchAdmin",
    homePath: "/",
    Icon: IconAdminMark,
    visible: (role) => Boolean(role && canAccessAdmin(role)),
  },
];

export type AppSwitcherLinkProps = {
  href: string;
  className?: string;
  "aria-label"?: string;
  children?: ReactNode;
};

export function AppSwitcher({
  current,
  role,
  linkComponent: Link,
}: {
  current: PulseAppId;
  role?: UserRole;
  linkComponent: ComponentType<AppSwitcherLinkProps>;
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
  const canSwitch = apps.length > 1;

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

  const mark =
    current === "pulse" ? (
      <BrandMark size={22} />
    ) : (
      <CurrentIcon width={16} height={16} className="text-brand" />
    );

  const triggerClass =
    "inline-flex max-w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-left transition hover:bg-ink/[0.05] dark:hover:bg-white/[0.06]";

  return (
    <div ref={rootRef} className="relative">
      {canSwitch ? (
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={t("appSwitchTitle")}
          disabled={busy}
          onClick={() => setOpen((v) => !v)}
          className={`${triggerClass} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand/10 text-brand">
            {mark}
          </span>
          <span className="truncate font-display text-[15px] font-bold tracking-tight">
            {t(currentMeta.labelKey)}
          </span>
          <IconChevron
            width={12}
            height={12}
            className={`shrink-0 text-muted transition duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      ) : (
        <Link
          href={currentMeta.homePath}
          className={triggerClass}
          aria-label={t(currentMeta.labelKey)}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand/10 text-brand">
            {mark}
          </span>
          <span className="truncate font-display text-[15px] font-bold tracking-tight">
            {t(currentMeta.labelKey)}
          </span>
        </Link>
      )}

      {open && canSwitch ? (
        <ul
          id={panelId}
          role="listbox"
          aria-label={t("appSwitchTitle")}
          className="absolute left-0 top-full z-50 mt-1.5 min-w-[10.5rem] overflow-hidden rounded-xl border border-glass-border bg-sheet p-1 shadow-lg"
        >
          {apps.map((app) => {
            const active = app.id === current;
            const Icon = app.Icon;
            return (
              <li key={app.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void switchTo(app.id)}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    active
                      ? "bg-brand/10 font-semibold text-brand"
                      : "text-ink hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ink/[0.04] dark:bg-white/[0.06]">
                    {app.id === "pulse" ? (
                      <BrandMark size={18} />
                    ) : (
                      <Icon width={14} height={14} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {t(app.labelKey)}
                  </span>
                  {active ? (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-brand">
                      {t("appSwitchHere")}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
