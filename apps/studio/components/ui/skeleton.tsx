"use client";

import type { ReactNode } from "react";
import { Button } from "@pulse/ui";

export function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-md bg-white/[0.06] dark:bg-white/[0.08] ${className}`}
      aria-hidden
    />
  );
}

/** Table-shaped loading placeholder matching final column count. */
export function TableSkeleton({
  columns = 5,
  rows = 8,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0" aria-busy="true">
      <table className="w-full min-w-[28rem] text-left text-sm">
        <thead>
          <tr className="border-b border-glass-border">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-2.5">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-glass-border last:border-0">
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c} className="px-4 py-3">
                  <Skeleton
                    className={`h-4 ${c === 0 ? "w-28" : c === columns - 1 ? "w-16 ml-auto" : "w-20"}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ListRowSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-glass-border px-3 py-3"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({
  cards = 6,
  className = "mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
}: {
  cards?: number;
  className?: string;
}) {
  return (
    <div className={className} aria-busy="true">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="studio-panel overflow-hidden">
          <Skeleton className="aspect-[16/9] w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Course workspace: rail + canvas + inspector. */
export function WorkspaceSkeleton() {
  return (
    <div
      className="flex h-[calc(100svh-7.25rem)] flex-col lg:h-[calc(100vh)]"
      aria-busy="true"
    >
      <div className="flex items-center justify-between gap-3 border-b border-glass-border px-4 py-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-xl" />
          <Skeleton className="h-9 w-20 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        <div className="hidden space-y-2 overflow-hidden border-r border-glass-border p-3 lg:block">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
        <div className="space-y-3 border-x border-glass-border p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-40 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <div className="hidden space-y-3 overflow-hidden p-3 lg:block">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="mt-4 h-28 w-full rounded-xl" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Path editor: header + form + course list proportions. */
export function PathWorkspaceSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8" aria-busy="true">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-20 rounded-xl" />
        </div>
      </div>
      <div className="studio-panel mt-6 space-y-3 p-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
      <div className="mt-8 space-y-3">
        <Skeleton className="h-6 w-40" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function BlockSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-3 ${className}`} aria-busy="true">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-28 rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

export function TablePagination({
  pageSize,
  showing,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
  labelShowing,
  labelPrev,
  labelNext,
  labelPageSize,
}: {
  pageSize: number;
  showing: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  labelShowing: ReactNode;
  labelPrev: string;
  labelNext: string;
  labelPageSize?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-glass-border pt-3 text-sm">
      <p className="text-muted">{labelShowing}</p>
      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-muted">
            {labelPageSize ?? "Rows"}
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-9 rounded-lg border border-glass-border bg-transparent px-2 text-ink"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
        <Button
          variant="secondary"
          className="h-9 px-3 text-xs"
          disabled={!hasPrev}
          onClick={onPrev}
        >
          {labelPrev}
        </Button>
        <Button
          variant="secondary"
          className="h-9 px-3 text-xs"
          disabled={!hasNext}
          onClick={onNext}
        >
          {labelNext}
        </Button>
        <span className="sr-only">{showing} rows</span>
      </div>
    </div>
  );
}
