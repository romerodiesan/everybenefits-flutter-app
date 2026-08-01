"use client";

import { use } from "react";
import { CourseWorkspace } from "@/components/workspace/course-workspace";

export default function CourseWorkspacePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  return <CourseWorkspace courseId={courseId} />;
}
