"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { UsState } from "@pulse/shared";

type Props = {
  states: readonly UsState[];
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyLabel?: string;
};

export function StateSearchSelect({
  states,
  value,
  onChange,
  placeholder = "Search state…",
  disabled = false,
  emptyLabel = "No states available",
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = states.find((s) => s.code === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return states;
    return states.filter(
      (s) =>
        s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
    );
  }, [states, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled || states.length === 0}
        className="mt-1 flex h-8 w-full items-center justify-between rounded-lg border border-glass-border bg-sheet px-2.5 text-left text-xs disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (disabled || states.length === 0) return;
          setOpen((o) => !o);
          setQuery("");
        }}
      >
        <span className={selected ? "" : "text-muted"}>
          {selected
            ? `${selected.code} — ${selected.name}`
            : states.length === 0
              ? emptyLabel
              : placeholder}
        </span>
        <span className="text-muted" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-glass-border bg-sheet shadow-lg">
          <input
            autoFocus
            className="w-full border-b border-glass-border bg-transparent px-2.5 py-1.5 text-xs outline-none"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                setQuery("");
              }
            }}
          />
          <ul
            id={listId}
            role="listbox"
            className="max-h-40 overflow-y-auto py-0.5 text-xs"
          >
            {filtered.length === 0 ? (
              <li className="px-2.5 py-1.5 text-muted">{emptyLabel}</li>
            ) : (
              filtered.map((s) => (
                <li key={s.code} role="option" aria-selected={s.code === value}>
                  <button
                    type="button"
                    className="w-full px-2.5 py-1 text-left hover:bg-black/5"
                    onClick={() => {
                      onChange(s.code);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className="font-medium">{s.code}</span>
                    <span className="text-muted"> — {s.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
