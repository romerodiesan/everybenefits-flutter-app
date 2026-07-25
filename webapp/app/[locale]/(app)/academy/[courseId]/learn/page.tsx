import { Suspense } from "react";
import { CoursePlayer } from "@/components/academy/course-player";

export default async function CourseLearnPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return (
    <Suspense fallback={null}>
      <CoursePlayer courseId={courseId} />
    </Suspense>
  );
}
