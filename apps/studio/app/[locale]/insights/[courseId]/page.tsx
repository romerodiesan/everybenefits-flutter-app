import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string; courseId: string }>;
};

/** Legacy Insights course route → Analytics. */
export default async function InsightsCourseRedirect({ params }: Props) {
  const { locale, courseId } = await params;
  redirect(`/${locale}/analytics/${courseId}`);
}
