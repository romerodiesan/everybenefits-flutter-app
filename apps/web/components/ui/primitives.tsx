"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles = {
    primary:
      "bg-brand text-on-brand hover:brightness-110 disabled:opacity-50",
    secondary:
      "pulse-sheet text-ink hover:bg-white/[0.04] dark:hover:bg-white/[0.04] disabled:opacity-50",
    ghost: "text-ink hover:bg-white/[0.04] disabled:opacity-50",
    danger: "bg-[#B42318] text-white hover:brightness-110 disabled:opacity-50",
  }[variant];
  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition ${styles} ${className}`}
      {...props}
    />
  );
}

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-10 w-full rounded-xl border border-glass-border bg-sheet px-3.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brand ${className}`}
      {...props}
    />
  );
}

export function TextArea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-24 w-full rounded-xl border border-glass-border bg-sheet px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brand ${className}`}
      {...props}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium tracking-wide text-muted">
      {children}
    </label>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`pulse-sheet p-4 ${className}`}>
      {children}
    </div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-md bg-brand/14 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
      {children}
    </span>
  );
}

export function Avatar({
  name,
  photoUrl,
  size = 36,
  className = "",
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const initial = (name.trim() || "U").charAt(0).toUpperCase();
  // Native <img>: Storage emulator URLs use LAN IPs (e.g. 10.0.0.77:9199)
  // that next/image rejects unless every host is listed in next.config.
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-brand/14 text-brand ${className}`}
      style={{ width: size, height: size }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- emulator/LAN photo URLs
        <img
          src={photoUrl}
          alt=""
          width={size}
          height={size}
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center font-display font-semibold"
          style={{ fontSize: size * 0.36 }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}
