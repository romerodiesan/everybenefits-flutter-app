"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { Button } from "@/components/ui/primitives";

export function BulkBarShell({
  selectedCount,
  selectedLabel,
  maxHint,
  busy,
  busyLabel,
  clearLabel,
  onClear,
  children,
}: {
  selectedCount: number;
  selectedLabel: string;
  maxHint?: string | null;
  busy?: boolean;
  busyLabel?: string;
  clearLabel: string;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-brand px-2.5 text-[11px] font-bold tracking-wide text-on-brand tabular-nums shadow-sm shadow-brand/20">
          {selectedCount}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight text-ink">
            {selectedLabel}
          </p>
          {maxHint ? (
            <p className="text-[10px] leading-tight text-muted">{maxHint}</p>
          ) : null}
        </div>
      </div>

      <div className="hidden h-6 w-px shrink-0 bg-glass-border sm:block" />

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {children}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {busy ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
            <span
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand/25 border-t-brand"
              aria-hidden
            />
            {busyLabel}
          </span>
        ) : null}
        <Button
          variant="ghost"
          className="h-8 px-2.5 text-xs text-muted hover:text-ink"
          disabled={busy}
          onClick={onClear}
        >
          {clearLabel}
        </Button>
      </div>
    </div>
  );
}

export function BulkField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="group flex min-w-[8.5rem] flex-col gap-1">
      <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

export const BulkSelect = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function BulkSelect({ className = "", ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={`h-8 w-full min-w-[9.5rem] appearance-none rounded-lg border border-glass-border bg-sheet py-1.5 pr-8 pl-2.5 text-xs font-medium text-ink shadow-sm outline-none transition hover:border-brand/40 focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-50 ${className}`}
        {...props}
      />
      <svg
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
      >
        <path
          d="M5.5 7.5 10 12l4.5-4.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});

export const BulkActionButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger";
  }
>(function BulkActionButton(
  { variant = "secondary", className = "", ...props },
  ref,
) {
  const styles = {
    primary:
      "bg-brand text-on-brand hover:brightness-110 shadow-sm shadow-brand/20",
    secondary:
      "border border-glass-border bg-sheet text-ink hover:border-brand/35 hover:bg-brand/[0.06]",
    danger:
      "border border-[#B42318]/25 bg-[#B42318]/10 text-[#B42318] hover:bg-[#B42318]/16",
  }[variant];

  return (
    <button
      ref={ref}
      className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  );
});
