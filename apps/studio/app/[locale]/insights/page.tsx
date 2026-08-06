import { redirect } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };

/** Legacy Insights route → Analytics. */
export default async function InsightsRedirect({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/analytics`);
}
