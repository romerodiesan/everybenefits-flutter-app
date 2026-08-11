"use client";

import { useEffect, useRef, type InputHTMLAttributes } from "react";

type TableCheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "className"
> & {
  indeterminate?: boolean;
};

/** Custom selection checkbox for DataTable bulk select. */
export function TableCheckbox({
  indeterminate = false,
  checked,
  disabled,
  ...props
}: TableCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate && !checked;
    }
  }, [indeterminate, checked]);

  const isIndeterminate = indeterminate && !checked;
  const isOn = Boolean(checked) || isIndeterminate;

  return (
    <label
      className={`relative inline-flex h-8 w-8 items-center justify-center ${
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      }`}
    >
      <input
        ref={ref}
        type="checkbox"
        className="peer sr-only"
        checked={Boolean(checked)}
        disabled={disabled}
        {...props}
      />
      <span
        aria-hidden
        className={`flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-[6px] border transition ${
          isOn
            ? "border-brand bg-brand text-on-brand shadow-sm shadow-brand/25"
            : "border-glass-border bg-sheet text-transparent shadow-sm peer-hover:border-brand/45 peer-hover:bg-brand/[0.06]"
        } peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-sheet`}
      >
        {isIndeterminate ? (
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
            <path
              d="M4 8h8"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
            <path
              d="M3.5 8.2 6.4 11l6.1-6.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </label>
  );
}
