"use client";

import { use } from "react";
import { StudioShell } from "@/components/chrome/studio-shell";
import { AnalyticsHome } from "@/components/studio/analytics-home";

export default function AnalyticsCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  return (
    <StudioShell>
      <AnalyticsHome initialCourseId={courseId} />
    </StudioShell>
  );
}
