import { setRequestLocale } from "next-intl/server";
import { LegalDocument } from "@/components/legal/legal-document";
import { getTermsDoc } from "@/lib/legal/content";
import type { AppLocale } from "@/i18n/routing";

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const doc = getTermsDoc(locale as AppLocale);
  return <LegalDocument doc={doc} />;
}
