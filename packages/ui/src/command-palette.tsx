"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type CommandPaletteItem = {
  id: string;
  label: string;
  run: () => void;
};

export function CommandPalette({
  commands,
  open,
  onOpenChange,
  title,
  placeholder = "Type a command…",
  emptyLabel = "No matching commands",
  className = "",
  panelClassName = "",
}: {
  commands: CommandPaletteItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  placeholder?: string;
  emptyLabel?: string;
  /** Overlay / root class overrides (z-index, backdrop). */
  className?: string;
  /** Dialog panel class overrides. */
  panelClassName?: string;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      return;
    }
    setActiveIndex(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const close = () => onOpenChange(false);

  const runAt = (index: number) => {
    const cmd = filtered[index];
    if (!cmd) return;
    close();
    cmd.run();
  };

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[80] flex items-start justify-center bg-black/50 p-4 pt-[12vh] ${className}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={close}
      />
      <div
        className={`relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-glass-border bg-sheet shadow-2xl ${panelClassName}`}
      >
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-controls={listId}
          aria-activedescendant={
            filtered[activeIndex]
              ? `${listId}-item-${filtered[activeIndex]!.id}`
              : undefined
          }
          className="w-full border-b border-glass-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              close();
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              if (filtered.length === 0) return;
              setActiveIndex((i) => (i + 1) % filtered.length);
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              if (filtered.length === 0) return;
              setActiveIndex(
                (i) => (i - 1 + filtered.length) % filtered.length,
              );
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              runAt(activeIndex);
            }
          }}
        />
        <ul id={listId} role="listbox" className="max-h-72 overflow-y-auto p-2">
          {filtered.map((cmd, index) => {
            const active = index === activeIndex;
            return (
              <li key={cmd.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  id={`${listId}-item-${cmd.id}`}
                  className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    active
                      ? "bg-brand/10 text-brand"
                      : "hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]"
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => runAt(index)}
                >
                  {cmd.label}
                </button>
              </li>
            );
          })}
          {filtered.length === 0 ? (
            <li className="px-3 py-4 text-sm text-muted">{emptyLabel}</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
