"use client";

import { useMemo, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type Row,
  type RowSelectionState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/primitives";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

const CHECKBOX_CLASS =
  "h-4 w-4 cursor-pointer rounded border-glass-border accent-brand";

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
  /** Rendered above the table when at least one row is selected. */
  bulkBar?: ReactNode;
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
  enableRowSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
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
  bulkBar,
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
  enableRowSelection = false,
  rowSelection,
  onRowSelectionChange,
}: DataTableProps<T>) {
  const selectionColumn = useMemo<ColumnDef<T, unknown> | null>(() => {
    if (!enableRowSelection) return null;
    return {
      id: "__select",
      size: 40,
      header: ({ table }) => (
        <input
          type="checkbox"
          className={CHECKBOX_CLASS}
          aria-label="Select all on page"
          checked={table.getIsAllPageRowsSelected()}
          ref={(el) => {
            if (el) {
              el.indeterminate = table.getIsSomePageRowsSelected();
            }
          }}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className={CHECKBOX_CLASS}
          aria-label="Select row"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
    };
  }, [enableRowSelection]);

  const allColumns = useMemo(() => {
    if (!selectionColumn) return columns;
    return [selectionColumn, ...columns];
  }, [columns, selectionColumn]);

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    manualPagination: true,
    enableRowSelection,
    onRowSelectionChange,
    state: enableRowSelection
      ? { rowSelection: rowSelection ?? {} }
      : undefined,
  });

  const showPagination = Boolean(
    onPreviousPage || onNextPage || onPageSizeChange,
  );
  const showInitialSkeleton = loading && data.length === 0;
  const rows = table.getRowModel().rows;
  const selectedCount = enableRowSelection
    ? Object.keys(rowSelection ?? {}).filter((k) => rowSelection?.[k]).length
    : 0;
  const colCount = allColumns.length;

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

      {bulkBar && selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-glass-border bg-brand/[0.06] px-3 py-2.5 sm:px-4">
          {bulkBar}
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
                    className={`border-b border-glass-border bg-sheet/95 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted backdrop-blur-sm ${
                      header.id === "__select" ? "w-10 px-3" : "px-4"
                    }`}
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
              <DataTableSkeleton columns={colCount} rows={skeletonRows} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-14 text-center">
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
                  className={`transition-colors hover:bg-ink/[0.03] dark:hover:bg-white/[0.035] ${
                    row.getIsSelected() ? "bg-brand/[0.04]" : ""
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`border-b border-glass-border/70 py-2 align-middle last:border-b-0 ${
                        cell.column.id === "__select" ? "w-10 px-3" : "px-4"
                      }`}
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
