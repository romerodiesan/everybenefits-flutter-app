"use client";

import type { ReactNode } from "react";

export type SettingsSection =
  | "account"
  | "appearance"
  | "notifications"
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
          className={`font-display text-base font-bold ${
            danger ? "text-[#D92D20]" : ""
          }`}
        >
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      <div className="px-4 py-4 md:px-5">{children}</div>
    </section>
  );
}

export function SettingsRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
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
      className={`inline-flex h-7 w-12 shrink-0 items-center rounded-full border-0 p-0.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? "bg-brand"
          : "bg-ink/15 hover:bg-ink/20 dark:bg-white/15 dark:hover:bg-white/20"
      }`}
    >
      <span
        aria-hidden
        className={`block h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition-[margin] duration-200 ease-out ${
          checked ? "ml-auto" : "ml-0"
        }`}
      />
    </button>
  );
}
