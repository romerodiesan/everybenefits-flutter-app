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
import { TableCheckbox } from "@/components/ui/table-checkbox";

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
      size: 44,
      header: ({ table }) => (
        <TableCheckbox
          aria-label="Select all on page"
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <TableCheckbox
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
        <div className="border-b border-brand/15 bg-gradient-to-r from-brand/[0.09] via-brand/[0.05] to-transparent px-3 py-3 sm:px-4">
          {bulkBar}
        </div>
      ) : null}

      <div className="relative max-h-[min(70vh,44rem)] overflow-auto">
        <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-left text-xs">
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`border-b border-glass-border bg-sheet/95 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted backdrop-blur-sm ${
                      header.id === "__select" ? "w-9 px-1" : "px-3"
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
                <td colSpan={colCount} className="px-3 py-10 text-center">
                  <p className="text-xs font-semibold text-ink">
                    {emptyTitle ?? emptyMessage}
                  </p>
                  {emptyHint ? (
                    <p className="mx-auto mt-1 max-w-sm text-[11px] text-muted">
                      {emptyHint}
                    </p>
                  ) : null}
                </td>
              </tr>
            ) : (
              rows.map((row: Row<T>, rowIndex) => (
                <tr
                  key={row.id}
                  className={`transition-colors hover:bg-ink/[0.03] dark:hover:bg-white/[0.035] ${
                    row.getIsSelected() ? "bg-brand/[0.04]" : ""
                  } ${
                    rowIndex < rows.length - 1
                      ? "shadow-[inset_0_-1px_0_0_var(--glass-border)]"
                      : ""
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`py-1.5 align-middle ${
                        cell.column.id === "__select" ? "w-9 px-1" : "px-3"
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-glass-border px-3 py-1.5">
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span>{rowsLabel}</span>
            <select
              className="h-7 rounded-md border border-glass-border bg-transparent px-1.5 text-[11px] text-ink"
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
          <div className="flex gap-1">
            <Button
              variant="secondary"
              className="h-7 rounded-lg px-2.5 text-[11px]"
              disabled={!canPreviousPage || loading}
              onClick={onPreviousPage}
            >
              {previousLabel}
            </Button>
            <Button
              variant="secondary"
              className="h-7 rounded-lg px-2.5 text-[11px]"
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
