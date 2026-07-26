"use client";

import { use } from "react";
import { StudioShell } from "@/components/chrome/studio-shell";
import { InsightsHome } from "@/components/studio/insights-home";

export default function InsightsCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  return (
    <StudioShell>
      <InsightsHome initialCourseId={courseId} />
    </StudioShell>
  );
}
