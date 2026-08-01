/** Shared pulse loading placeholders. */

export function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-xl bg-ink/[0.06] dark:bg-white/[0.08] ${className}`}
    />
  );
}

export function ChatInboxSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-2.5 px-2 py-2">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatDirectorySkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-1 py-1" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-2">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <Skeleton className="h-3.5 flex-1" />
        </div>
      ))}
    </div>
  );
}

export function ConversationSkeleton() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-glass-border px-4 py-3">
        <Skeleton className="h-5 w-40" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-hidden p-4">
        <div className="flex justify-start">
          <Skeleton className="h-14 w-[70%] rounded-2xl" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-[55%] rounded-2xl" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-16 w-[65%] rounded-2xl" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-12 w-[48%] rounded-2xl" />
        </div>
      </div>
      <div className="flex shrink-0 gap-2 border-t border-glass-border p-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );
}

export function CardListSkeleton({
  rows = 4,
  className = "",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`} aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-glass-border bg-sheet/40 p-4"
        >
          <Skeleton className="mb-3 h-4 w-1/3" />
          <Skeleton className="mb-2 h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function ProfileFormSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-2/3" />
    </div>
  );
}

export function CourseGridSkeleton({
  cards = 6,
}: {
  cards?: number;
}) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: cards }, (_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-glass-border bg-sheet/40"
        >
          <Skeleton className="aspect-[16/9] w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-5xl space-y-4 px-4 py-10 lg:px-8"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <Skeleton className="mt-4 aspect-video w-full max-w-3xl" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export function PlayerSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-3 w-32" />
      <div className="mt-4 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <div className="space-y-3">
          <Skeleton className="h-5 w-1/2" />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function NotificationListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="mt-6 space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <li
          key={i}
          className="pulse-row flex flex-col gap-2 px-3.5 py-3"
        >
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-12 shrink-0" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </li>
      ))}
    </ul>
  );
}

/** Forum feed card placeholders (matches final post layout). */
export function FeedSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="feed-card overflow-hidden p-4"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-center gap-3">
            <div className="feed-shimmer h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="feed-shimmer h-3 w-28 rounded-full" />
              <div className="feed-shimmer h-2.5 w-16 rounded-full" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="feed-shimmer h-4 w-[88%] rounded-full" />
            <div className="feed-shimmer h-3 w-full rounded-full" />
            <div className="feed-shimmer h-3 w-[72%] rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
