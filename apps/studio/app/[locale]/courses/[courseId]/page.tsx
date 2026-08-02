"use client";

import { use } from "react";
import { StudioShell } from "@/components/chrome/studio-shell";
import { CourseWorkspace } from "@/components/workspace/course-workspace";

export default function CourseWorkspacePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  return (
    <StudioShell>
      <CourseWorkspace courseId={courseId} />
    </StudioShell>
  );
}
