"use client";

import { StudioShell } from "@/components/chrome/studio-shell";
import { InsightsHome } from "@/components/studio/insights-home";

export default function InsightsPage() {
  return (
    <StudioShell>
      <InsightsHome />
    </StudioShell>
  );
}
