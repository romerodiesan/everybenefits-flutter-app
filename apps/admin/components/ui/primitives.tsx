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

const searchInputSize: Record<ControlSize, string> = {
  md: "h-10 rounded-xl py-2 pr-3.5 pl-10 text-sm",
  sm: "h-8 rounded-lg py-1.5 pr-3 pl-9 text-xs",
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
      className={`w-full border border-glass-border bg-transparent text-ink outline-none placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15 ${inputSize[size]} ${className}`}
      {...props}
    />
  );
}

export function SearchInput({
  className = "",
  size = "md",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  size?: ControlSize;
}) {
  return (
    <div className={`relative w-full ${className}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted ${
          size === "sm" ? "left-2.5 h-3.5 w-3.5" : "left-3 h-4 w-4"
        }`}
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
        className={`w-full border border-glass-border bg-transparent text-ink outline-none placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15 ${searchInputSize[size]}`}
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
