"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
  }
>(function Button({ variant = "primary", className = "", ...props }, ref) {
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
      ref={ref}
      className={`inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed ${styles} ${className}`}
      {...props}
    />
  );
});

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-10 w-full rounded-xl border border-glass-border bg-transparent px-3.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15 ${className}`}
      {...props}
    />
  );
}

export function SearchInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`relative w-full ${className}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
      >
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m21 21-4.3-4.3M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z"
        />
      </svg>
      <input
        type="search"
        className="h-10 w-full rounded-xl border border-glass-border bg-transparent py-2 pr-3.5 pl-10 text-sm text-ink outline-none placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
        {...props}
      />
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium tracking-wide text-muted">
      {children}
    </label>
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
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-brand/14 text-brand ${className}`}
      style={{ width: size, height: size }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
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
