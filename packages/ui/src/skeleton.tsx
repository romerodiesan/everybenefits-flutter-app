"use client";

import type { ReactNode } from "react";
import { Button } from "./primitives";

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

export function TreeSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-2 py-1.5"
          style={{ paddingLeft: `${(i % 4) * 12}px` }}
        >
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
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
  loading = false,
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
  loading?: boolean;
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
              disabled={loading}
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
          disabled={!hasPrev || loading}
          onClick={onPrev}
        >
          {labelPrev}
        </Button>
        <Button
          variant="secondary"
          className="h-9 px-3 text-xs"
          disabled={!hasNext || loading}
          onClick={onNext}
        >
          {labelNext}
        </Button>
        <span className="sr-only">{showing} rows</span>
      </div>
    </div>
  );
}
