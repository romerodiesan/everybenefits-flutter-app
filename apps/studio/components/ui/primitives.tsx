"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

type ControlSize = "md" | "sm";

const buttonSize: Record<ControlSize, string> = {
  md: "h-10 rounded-xl px-4 text-sm",
  sm: "h-8 rounded-lg px-2.5 text-xs",
};

const inputSize: Record<ControlSize, string> = {
  md: "h-10 rounded-xl px-3.5 text-sm",
  sm: "h-8 rounded-lg px-2.5 text-xs",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: ControlSize;
  }
>(function Button(
  { variant = "primary", size = "md", className = "", ...props },
  ref,
) {
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
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 font-semibold transition disabled:cursor-not-allowed ${buttonSize[size]} ${styles} ${className}`}
      {...props}
    />
  );
});

export function Input({
  className = "",
  size = "md",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  size?: ControlSize;
}) {
  return (
    <input
      className={`w-full border border-glass-border bg-sheet text-ink outline-none placeholder:text-muted focus:border-brand ${inputSize[size]} ${className}`}
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
