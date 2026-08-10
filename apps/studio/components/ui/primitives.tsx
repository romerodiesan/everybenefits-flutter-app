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
