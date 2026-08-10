"use client";

import type { ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/primitives";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export type DataTableProps<T> = {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  loading?: boolean;
  /** Keep previous rows visible while refetching (stale-while-revalidate). */
  isFetching?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  emptyMessage?: string;
  toolbar?: ReactNode;
  pageSize?: number;
  canPreviousPage?: boolean;
  canNextPage?: boolean;
  onPreviousPage?: () => void;
  onNextPage?: () => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  getRowId?: (row: T) => string;
  skeletonRows?: number;
  previousLabel?: string;
  nextLabel?: string;
  rowsLabel?: string;
};

export function DataTable<T>({
  columns,
  data,
  loading = false,
  isFetching = false,
  emptyTitle,
  emptyHint,
  emptyMessage = "No results.",
  toolbar,
  pageSize = 25,
  canPreviousPage = false,
  canNextPage = false,
  onPreviousPage,
  onNextPage,
  onPageSizeChange,
  pageSizeOptions = [25, 50],
  getRowId,
  skeletonRows = 8,
  previousLabel = "Previous",
  nextLabel = "Next",
  rowsLabel = "Rows",
}: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    manualPagination: true,
  });

  const showPagination = Boolean(
    onPreviousPage || onNextPage || onPageSizeChange,
  );
  const showInitialSkeleton = loading && data.length === 0;
  const rows = table.getRowModel().rows;

  return (
    <div className="studio-panel overflow-hidden rounded-2xl">
      {toolbar ? (
        <div className="flex flex-wrap items-end gap-3 border-b border-glass-border px-3 py-3 sm:px-4">
          {toolbar}
          {isFetching && !showInitialSkeleton ? (
            <span
              className="mb-3 ml-auto h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand/30 border-t-brand"
              aria-label="Refreshing"
            />
          ) : null}
        </div>
      ) : null}

      <div className="relative max-h-[min(70vh,44rem)] overflow-auto">
        <table className="w-full min-w-[48rem] border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="border-b border-glass-border bg-sheet/95 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted backdrop-blur-sm"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {showInitialSkeleton ? (
              <DataTableSkeleton
                columns={columns.length}
                rows={skeletonRows}
              />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center">
                  <p className="text-sm font-semibold text-ink">
                    {emptyTitle ?? emptyMessage}
                  </p>
                  {emptyHint ? (
                    <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
                      {emptyHint}
                    </p>
                  ) : null}
                </td>
              </tr>
            ) : (
              rows.map((row: Row<T>) => (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-ink/[0.03] dark:hover:bg-white/[0.035]"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="border-b border-glass-border/70 px-4 py-2 align-middle last:border-b-0"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPagination ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-glass-border px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>{rowsLabel}</span>
            <select
              className="h-8 rounded-lg border border-glass-border bg-transparent px-2 text-xs text-ink"
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              disabled={!onPageSizeChange}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="secondary"
              className="h-8 px-3 text-xs"
              disabled={!canPreviousPage || loading}
              onClick={onPreviousPage}
            >
              {previousLabel}
            </Button>
            <Button
              variant="secondary"
              className="h-8 px-3 text-xs"
              disabled={!canNextPage || loading}
              onClick={onNextPage}
            >
              {nextLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
