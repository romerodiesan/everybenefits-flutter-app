"use client";

import dynamic from "next/dynamic";
import { PageContentSkeleton } from "@/components/ui/skeleton";

const PulseAgent = dynamic(
  () => import("@/components/ai/pulse-agent").then((m) => m.PulseAgent),
  {
    ssr: false,
    loading: () => <PageContentSkeleton rows={1} />,
  },
);

export default function AiPage() {
  return <PulseAgent />;
}
