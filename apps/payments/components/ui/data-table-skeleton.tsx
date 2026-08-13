"use client";

export function DataTableSkeleton({
  columns,
  rows = 8,
}: {
  columns: number;
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx}>
          {Array.from({ length: columns }).map((__, colIdx) => (
            <td
              key={colIdx}
              className="border-b border-glass-border/70 px-3 py-1.5"
            >
              <div
                className="h-3 animate-pulse rounded-md bg-ink/[0.06] dark:bg-white/[0.08]"
                style={{
                  width: `${50 + ((rowIdx + colIdx) % 5) * 8}%`,
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function PageHeaderSkeleton({
  withActions = false,
}: {
  withActions?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-ink/[0.08] dark:bg-white/[0.08]" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-ink/[0.05] dark:bg-white/[0.05]" />
      </div>
      {withActions ? (
        <div className="h-10 w-36 animate-pulse rounded-xl bg-ink/[0.06] dark:bg-white/[0.06]" />
      ) : null}
    </div>
  );
}

export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="studio-panel space-y-3 rounded-2xl p-4">
          <div className="h-3 w-20 animate-pulse rounded bg-ink/[0.06] dark:bg-white/[0.06]" />
          <div className="h-8 w-16 animate-pulse rounded-lg bg-ink/[0.08] dark:bg-white/[0.08]" />
        </div>
      ))}
    </div>
  );
}

export function OrgTreeSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="studio-panel divide-y divide-glass-border rounded-2xl">
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-3 px-4 py-3"
          style={{ paddingLeft: `${0.75 + (i % 4) * 1.1}rem` }}
        >
          <div className="h-4 w-4 animate-pulse rounded bg-ink/[0.06] dark:bg-white/[0.06]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-ink/[0.08] dark:bg-white/[0.08]" />
            <div className="h-3 w-28 animate-pulse rounded bg-ink/[0.05] dark:bg-white/[0.05]" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function TablePageSkeleton({
  columns = 7,
  withToolbar = true,
}: {
  columns?: number;
  withToolbar?: boolean;
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeaderSkeleton withActions />
      <div className="studio-panel overflow-hidden rounded-2xl">
        {withToolbar ? (
          <div className="flex flex-wrap gap-2 border-b border-glass-border px-4 py-3">
            <div className="h-8 min-w-[12rem] flex-1 animate-pulse rounded-lg bg-ink/[0.06] dark:bg-white/[0.06]" />
            <div className="h-8 w-28 animate-pulse rounded-lg bg-ink/[0.06] dark:bg-white/[0.06]" />
            <div className="h-8 w-28 animate-pulse rounded-lg bg-ink/[0.06] dark:bg-white/[0.06]" />
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead>
              <tr>
                {Array.from({ length: columns }).map((_, i) => (
                  <th key={i} className="px-4 py-2.5">
                    <div className="h-3 w-16 animate-pulse rounded bg-ink/[0.05] dark:bg-white/[0.05]" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <DataTableSkeleton columns={columns} rows={8} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
