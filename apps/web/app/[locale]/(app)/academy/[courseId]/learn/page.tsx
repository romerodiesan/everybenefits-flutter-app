import { Suspense } from "react";
import { CoursePlayer } from "@/components/academy/course-player";
import { PlayerSkeleton } from "@/components/ui/skeleton";

export default async function CourseLearnPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return (
    <Suspense fallback={<PlayerSkeleton />}>
      <CoursePlayer courseId={courseId} />
    </Suspense>
  );
}
