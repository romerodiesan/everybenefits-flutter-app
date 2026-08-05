"use client";

import type { ReactNode } from "react";

export type SettingsSection =
  | "account"
  | "appearance"
  | "notifications"
  | "security"
  | "privacy"
  | "admin"
  | "danger";

export type SettingsNavItem = {
  id: SettingsSection;
  label: string;
  description: string;
  icon: ReactNode;
  danger?: boolean;
};

export function SettingsNav({
  items,
  active,
  onSelect,
}: {
  items: SettingsNavItem[];
  active: SettingsSection;
  onSelect: (section: SettingsSection) => void;
}) {
  return (
    <>
      {/* Mobile: horizontal chips */}
      <nav
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:hidden"
        aria-label="Settings sections"
      >
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={selected ? "true" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                selected
                  ? item.danger
                    ? "bg-[#B42318]/12 text-[#D92D20]"
                    : "bg-brand/14 text-brand"
                  : "pulse-sheet text-muted hover:text-ink"
              }`}
            >
              <span className="[&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Desktop: vertical rail */}
      <nav
        className="hidden space-y-0.5 lg:block"
        aria-label="Settings sections"
      >
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={selected ? "true" : undefined}
              className={`group flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition ${
                selected
                  ? item.danger
                    ? "bg-[#B42318]/10 shadow-[inset_3px_0_0_0_#D92D20]"
                    : "bg-brand/10 shadow-[inset_3px_0_0_0_var(--brand)]"
                  : "hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]"
              }`}
            >
              <span
                className={`mt-0.5 shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px] ${
                  selected
                    ? item.danger
                      ? "text-[#D92D20]"
                      : "text-brand"
                    : "text-muted group-hover:text-ink"
                }`}
              >
                {item.icon}
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-sm font-semibold leading-tight ${
                    selected
                      ? item.danger
                        ? "text-[#D92D20]"
                        : "text-ink"
                      : "text-muted group-hover:text-ink"
                  }`}
                >
                  {item.label}
                </span>
                <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted">
                  {item.description}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

export function SettingsPanelShell({
  title,
  subtitle,
  children,
  danger,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <section
      className={`pulse-sheet overflow-hidden ${
        danger ? "border border-[#B42318]/30" : ""
      }`}
    >
      <div className="border-b border-glass-border px-4 py-3.5 md:px-5">
        <h2
          className={`font-display text-base font-bold tracking-tight ${
            danger ? "text-[#D92D20]" : ""
          }`}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted">
            {subtitle}
          </p>
        )}
      </div>
      <div className="px-4 py-4 md:px-5">{children}</div>
    </section>
  );
}

export function SettingsAccordion({
  title,
  description,
  open,
  onToggle,
  enabledCount,
  totalCount,
  icon,
  children,
}: {
  title: string;
  description?: string;
  open: boolean;
  onToggle: () => void;
  enabledCount?: number;
  totalCount?: number;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const showCount =
    typeof enabledCount === "number" && typeof totalCount === "number";

  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-colors ${
        open
          ? "border-brand/25 bg-brand/[0.03]"
          : "border-glass-border bg-ink/[0.015] dark:bg-white/[0.02]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-ink/[0.03] dark:hover:bg-white/[0.03]"
      >
        {icon && (
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl [&>svg]:h-[18px] [&>svg]:w-[18px] ${
              open
                ? "bg-brand/15 text-brand"
                : "bg-ink/[0.06] text-muted dark:bg-white/[0.08]"
            }`}
            aria-hidden
          >
            {icon}
          </span>
        )}
        <span className="min-w-0 flex-1 pt-0.5">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">{title}</span>
            {showCount && (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                  open
                    ? "bg-brand/12 text-brand"
                    : "bg-ink/[0.06] text-muted dark:bg-white/[0.08]"
                }`}
              >
                {enabledCount}/{totalCount}
              </span>
            )}
          </span>
          {description && (
            <span className="mt-1 block text-xs leading-relaxed text-muted">
              {description}
            </span>
          )}
        </span>
        <svg
          viewBox="0 0 20 20"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className={`mt-1.5 shrink-0 text-muted transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <path
            d="M5 7.5 10 12.5 15 7.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div className="border-t border-glass-border/80 bg-surface/40 px-4 dark:bg-black/10">
          <div className="divide-y divide-glass-border">{children}</div>
        </div>
      )}
    </div>
  );
}

export function SettingsRow({
  label,
  hint,
  children,
}: {
  label: ReactNode;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0 flex-1">
        {typeof label === "string" ? (
          <p className="text-sm font-medium leading-snug text-ink">{label}</p>
        ) : (
          label
        )}
        {hint && (
          <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p>
        )}
      </div>
      <div className="shrink-0 self-end sm:self-center">{children}</div>
    </div>
  );
}

export function StatusBanner({
  kind,
  children,
}: {
  kind: "success" | "error" | "info";
  children: ReactNode;
}) {
  const styles = {
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    error: "border-[#B42318]/30 bg-[#B42318]/10 text-[#D92D20]",
    info: "border-brand/30 bg-brand/10 text-brand",
  }[kind];
  return (
    <div
      role="status"
      className={`rounded-xl border px-3.5 py-2.5 text-sm font-medium ${styles}`}
    >
      {children}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-0 p-0.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? "bg-brand"
          : "bg-ink/15 hover:bg-ink/20 dark:bg-white/15 dark:hover:bg-white/20"
      }`}
    >
      <span
        aria-hidden
        className={`pointer-events-none block h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition-transform duration-200 ease-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
