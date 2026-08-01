import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@pulse/i18n";
import { AuthProvider } from "@/lib/providers/auth-provider";
import { AdminAppFrame } from "@/components/chrome/admin-app-frame";
import { ThemedApp } from "@/components/chrome/themed-app";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AuthProvider>
        <ThemedApp>
          <AdminAppFrame>{children}</AdminAppFrame>
        </ThemedApp>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
