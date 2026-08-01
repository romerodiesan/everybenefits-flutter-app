"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { canAccessTools } from "@/lib/roles";
import {
  AFC_AGES,
  AFC_COVERAGES,
  AFC_TIERS,
  AFC_BENEFITS,
  formatUsd,
  lookupAfcPremium,
  type AfcAge,
  type AfcCoverage,
  type AfcTier,
} from "@/lib/tools/afc-rates";
import { Label, Panel } from "@pulse/ui";
import { CardListSkeleton } from "@/components/ui/skeleton";

const selectClass =
  "h-10 w-full rounded-xl border border-glass-border bg-sheet px-3.5 text-sm text-ink outline-none focus:border-brand";

export function AfcQuote() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { profile, loading } = useAuth();
  const allowed = profile ? canAccessTools(profile.role) : false;

  const [age, setAge] = useState<AfcAge>("30");
  const [tier, setTier] = useState<AfcTier>("elite_plus");
  const [coverage, setCoverage] = useState<AfcCoverage>("individual");

  useEffect(() => {
    if (loading || !profile) return;
    if (!canAccessTools(profile.role)) {
      router.replace("/home");
    }
  }, [loading, profile, router]);

  const premium = useMemo(
    () => lookupAfcPremium(tier, age, coverage),
    [tier, age, coverage],
  );
  const benefits = AFC_BENEFITS[tier];

  if (loading || !profile || !allowed) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <CardListSkeleton rows={3} />
      </div>
    );
  }

  const benefitRows = [
    {
      label: t("afcQuoteBenHosp"),
      value: formatUsd(benefits.hospitalDaily, locale),
    },
    {
      label: t("afcQuoteBenObs1"),
      value: t("afcQuoteBenObs1Value", {
        amount: formatUsd(benefits.observation24to47, locale),
      }),
    },
    {
      label: t("afcQuoteBenObs2"),
      value: t("afcQuoteBenObs2Value", {
        amount: formatUsd(benefits.observation48Plus, locale),
      }),
    },
    {
      label: t("afcQuoteBenEr"),
      value: t("afcQuoteBenErValue", {
        amount: formatUsd(benefits.erAmount, locale),
        count: benefits.erPerYear,
      }),
    },
    {
      label: t("afcQuoteBenRx"),
      value: t("afcQuoteBenRxValue", {
        amount: formatUsd(benefits.rxPerDay, locale),
      }),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-5 lg:px-8 lg:py-6">
      <header className="border-b border-glass-border pb-4">
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          {t("afcQuoteTitle")}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
          {t("afcQuoteSubtitle")}
        </p>
      </header>

      <div
        className="flex gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed"
        role="note"
      >
        <svg
          viewBox="0 0 24 24"
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300"
          fill="none"
          aria-hidden
        >
          <path
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
            d="M12 3.5 21 19H3L12 3.5Z"
          />
          <path
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            d="M12 10v4.5M12 17.5h.01"
          />
        </svg>
        <div className="text-ink/90">
          <p className="font-semibold">{t("afcQuoteDisclaimerTitle")}</p>
          <p className="mt-1 text-muted">{t("afcQuoteDisclaimerBody")}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="space-y-4 p-5">
          <h2 className="font-display text-base font-semibold">
            {t("afcQuoteClientData")}
          </h2>

          <div>
            <Label>{t("afcQuoteAge")}</Label>
            <select
              className={selectClass}
              value={age}
              onChange={(e) => setAge(e.target.value as AfcAge)}
            >
              {AFC_AGES.map((a) => (
                <option key={a} value={a}>
                  {t("afcQuoteAgeOption", { age: a })}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted">{t("afcQuoteAgeHint")}</p>
          </div>

          <div>
            <Label>{t("afcQuoteCoverage")}</Label>
            <select
              className={selectClass}
              value={coverage}
              onChange={(e) => setCoverage(e.target.value as AfcCoverage)}
            >
              {AFC_COVERAGES.map((c) => (
                <option key={c} value={c}>
                  {t(`afcQuoteCoverage_${c}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>{t("afcQuoteTier")}</Label>
            <select
              className={selectClass}
              value={tier}
              onChange={(e) => setTier(e.target.value as AfcTier)}
            >
              {AFC_TIERS.map((tierKey) => (
                <option key={tierKey} value={tierKey}>
                  {t(`afcQuoteTier_${tierKey}`)}
                </option>
              ))}
            </select>
          </div>
        </Panel>

        <Panel className="flex flex-col justify-center p-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
            {t("afcQuotePremiumLabel")}
          </p>
          <p className="mt-2 font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">
            {formatUsd(premium, locale)}
          </p>

          <div className="mt-6 rounded-xl border border-glass-border bg-ink/[0.02] p-4 text-left dark:bg-white/[0.03]">
            <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
              {t("afcQuoteBenefitsTitle", {
                tier: t(`afcQuoteTier_${tier}`),
              })}
            </p>
            <ul className="space-y-2.5">
              {benefitRows.map((row) => (
                <li
                  key={row.label}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <span className="text-muted">{row.label}</span>
                  <span className="shrink-0 text-right font-semibold text-brand">
                    {row.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>
    </div>
  );
}
