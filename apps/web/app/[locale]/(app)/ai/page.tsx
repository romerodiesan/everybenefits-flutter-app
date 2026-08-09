"use client";

import dynamic from "next/dynamic";

const PulseAgent = dynamic(
  () => import("@/components/ai/pulse-agent").then((m) => m.PulseAgent),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-3xl space-y-3 p-4 lg:p-6">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-ink/[0.06] dark:bg-white/[0.06]" />
        <div className="h-64 animate-pulse rounded-2xl bg-ink/[0.05] dark:bg-white/[0.05]" />
      </div>
    ),
  },
);

export default function AiPage() {
  return <PulseAgent />;
}
