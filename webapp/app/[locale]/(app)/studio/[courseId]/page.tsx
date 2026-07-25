import { StudioCourseEditor } from "@/components/studio/studio-course-editor";

export default async function StudioCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <StudioCourseEditor courseId={courseId} />;
}
