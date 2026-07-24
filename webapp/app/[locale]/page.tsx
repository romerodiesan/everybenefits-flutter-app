import { setRequestLocale } from "next-intl/server";
import { LandingHero } from "@/components/landing/hero";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LandingHero />;
}
