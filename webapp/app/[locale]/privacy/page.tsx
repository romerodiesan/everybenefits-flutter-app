import { setRequestLocale } from "next-intl/server";
import { LegalDocument } from "@/components/legal/legal-document";
import { getPrivacyDoc } from "@/lib/legal/content";
import type { AppLocale } from "@/i18n/routing";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const doc = getPrivacyDoc(locale as AppLocale);
  return <LegalDocument doc={doc} />;
}
