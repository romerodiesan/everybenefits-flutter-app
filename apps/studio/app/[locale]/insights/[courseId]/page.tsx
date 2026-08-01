"use client";

import { use } from "react";
import { CourseInsights } from "@/components/insights/course-insights";

export default function InsightsCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  return <CourseInsights courseId={courseId} />;
}
