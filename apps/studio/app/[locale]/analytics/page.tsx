"use client";

import { StudioShell } from "@/components/chrome/studio-shell";
import { AnalyticsHome } from "@/components/studio/analytics-home";

export default function AnalyticsPage() {
  return (
    <StudioShell>
      <AnalyticsHome />
    </StudioShell>
  );
}
