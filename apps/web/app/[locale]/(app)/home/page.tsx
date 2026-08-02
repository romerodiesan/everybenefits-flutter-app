import { Suspense } from "react";
import { ForumsHome } from "@/components/forums/forums-home";

function HomeFallback() {
  return (
    <div className="mx-auto max-w-3xl space-y-3 p-4 lg:p-6">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-ink/[0.06] dark:bg-white/[0.06]" />
      <div className="h-4 w-64 animate-pulse rounded bg-ink/[0.04] dark:bg-white/[0.04]" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-2xl bg-ink/[0.05] dark:bg-white/[0.05]"
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <ForumsHome />
    </Suspense>
  );
}
