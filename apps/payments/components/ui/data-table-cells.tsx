"use client";

import type { ReactNode } from "react";
import { Avatar, Button } from "@/components/ui/primitives";

export function UserCell({
  name,
  email,
  photoUrl,
}: {
  name: string;
  email?: string | null;
  photoUrl?: string | null;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar name={name} photoUrl={photoUrl} size={32} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight text-ink">
          {name}
        </p>
        {email ? (
          <p className="truncate text-xs leading-tight text-muted">{email}</p>
        ) : null}
      </div>
    </div>
  );
}

export function RoleBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-md bg-ink/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink dark:bg-white/[0.08]">
      {children}
    </span>
  );
}

export function StatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger";
  children: ReactNode;
}) {
  const styles = {
    neutral: "bg-ink/[0.06] text-muted dark:bg-white/[0.08]",
    success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    warning: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
    danger: "bg-[#B42318]/12 text-[#B42318] dark:text-[#F97066]",
  }[tone];
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles}`}
    >
      {children}
    </span>
  );
}

export function RowActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">{children}</div>
  );
}

export function RowActionButton({
  variant = "ghost",
  ...props
}: React.ComponentProps<typeof Button> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <Button
      variant={variant}
      className="h-8 rounded-lg px-2.5 text-xs font-semibold"
      {...props}
    />
  );
}
