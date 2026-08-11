"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function PaymentsHomePage() {
  const t = useTranslations();
  const cards = [
    {
      href: "/participants",
      title: t("overviewCardParticipants"),
      hint: t("overviewCardParticipantsHint"),
    },
    {
      href: "/relationships",
      title: t("overviewCardRelationships"),
      hint: t("overviewCardRelationshipsHint"),
    },
    {
      href: "/statements",
      title: t("overviewCardStatements"),
      hint: t("overviewCardStatementsHint"),
    },
  ] as const;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 lg:p-10">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
          {t("brandShort")}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight lg:text-4xl">
          {t("overviewTitle")}
        </h1>
        <p className="max-w-2xl text-sm text-muted lg:text-base">
          {t("overviewSubtitle")}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="studio-panel block p-5 transition hover:border-brand/40"
          >
            <h2 className="font-display text-lg font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm text-muted">{card.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
