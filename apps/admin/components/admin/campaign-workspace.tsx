"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/primitives";

export type CampaignCanvasTab = {
  id: string;
  label: string;
  disabled?: boolean;
};

export function CampaignWorkspace({
  eyebrow,
  title,
  subtitle,
  createLabel,
  onCreate,
  createDisabled,
  error,
  library,
  canvasTabs,
  canvasTab,
  onCanvasTabChange,
  canvasToolbar,
  canvas,
  inspector,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  createLabel: string;
  onCreate: () => void;
  createDisabled?: boolean;
  error?: string | null;
  library: ReactNode;
  canvasTabs: CampaignCanvasTab[];
  canvasTab: string;
  onCanvasTabChange: (id: string) => void;
  canvasToolbar?: ReactNode;
  canvas: ReactNode;
  inspector: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
            {eyebrow}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
            {subtitle}
          </p>
        </div>
        <Button type="button" onClick={onCreate} disabled={createDisabled}>
          {createLabel}
        </Button>
      </header>

      {error ? (
        <p role="alert" className="rounded-lg border border-danger/20 bg-danger/8 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
        <aside className="h-fit rounded-xl border border-glass-border bg-panel p-3 xl:sticky xl:top-4">
          {library}
        </aside>

        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-lg border border-glass-border bg-rail/80 p-0.5">
              {canvasTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  disabled={tab.disabled}
                  onClick={() => onCanvasTabChange(tab.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    canvasTab === tab.id
                      ? "bg-sheet text-ink shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {canvasToolbar}
          </div>
          <div className="rounded-xl border border-glass-border bg-panel p-4">
            {canvas}
          </div>
        </section>

        <aside className="h-fit space-y-4 rounded-xl border border-glass-border bg-panel p-4 xl:sticky xl:top-4">
          {inspector}
        </aside>
      </div>
    </div>
  );
}

export function CampaignFilterBar({
  value,
  onChange,
  labels,
}: {
  value: "all" | "live" | "draft";
  onChange: (value: "all" | "live" | "draft") => void;
  labels: { all: string; live: string; draft: string };
}) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg bg-rail/80 p-1">
      {(["all", "live", "draft"] as const).map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onChange(filter)}
          className={`rounded-md px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
            value === filter ? "bg-sheet text-ink shadow-sm" : "text-muted"
          }`}
        >
          {labels[filter]}
        </button>
      ))}
    </div>
  );
}

export function CampaignLibraryItem({
  title,
  meta,
  active,
  selected,
  onClick,
}: {
  title: string;
  meta: string;
  active: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2 text-left transition ${
        selected ? "bg-brand/10 ring-1 ring-brand/25" : "hover:bg-rail/80"
      }`}
    >
      <span className="line-clamp-2 text-sm font-medium text-ink">{title}</span>
      <span className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
        <span
          className={`h-1.5 w-1.5 rounded-full ${active ? "bg-ok" : "bg-muted"}`}
        />
        {meta}
      </span>
    </button>
  );
}
