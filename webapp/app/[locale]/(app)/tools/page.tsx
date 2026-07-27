import { redirect } from "@/i18n/navigation";

/** Catalog skipped — tools live in the nav dropdown. */
export default async function ToolsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/tools/afc", locale });
}
