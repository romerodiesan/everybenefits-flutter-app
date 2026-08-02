"use client";

import { StudioShell } from "@/components/chrome/studio-shell";
import { ReviewQueue } from "@/components/studio/review-queue";

export default function ReviewPage() {
  return (
    <StudioShell>
      <ReviewQueue />
    </StudioShell>
  );
}
