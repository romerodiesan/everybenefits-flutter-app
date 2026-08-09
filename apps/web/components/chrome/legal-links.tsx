"use client";

import { Fragment } from "react";
import { useLocale, useTranslations } from "next-intl";
import { legalUrls } from "@/lib/legal-links";

type LegalLinksProps = {
  /** Quieter styling for chrome footers */
  compact?: boolean;
  className?: string;
};

const LINK_KEYS = [
  ["privacy", "footerPrivacy"],
  ["data", "footerData"],
  ["cookies", "footerCookies"],
  ["terms", "footerTerms"],
] as const;

/** Muted external links to the Legal Center (legal.everybenefits.us). */
export function LegalLinks({ compact = false, className = "" }: LegalLinksProps) {
  const t = useTranslations();
  const locale = useLocale();
  const legal = legalUrls(locale);

  return (
    <nav
      aria-label={t("legalPoliciesNav")}
      className={`flex flex-wrap items-center ${
        compact
          ? "gap-x-1.5 gap-y-1 text-[10px] leading-tight text-muted/70"
          : "gap-x-2 gap-y-1.5 text-xs text-muted"
      } ${className}`}
    >
      {LINK_KEYS.map(([path, labelKey], i) => (
        <Fragment key={path}>
          {i > 0 && (
            <span aria-hidden className="select-none opacity-35">
              ·
            </span>
          )}
          <a
            href={legal[path]}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-ink hover:underline"
          >
            {t(labelKey)}
          </a>
        </Fragment>
      ))}
    </nav>
  );
}
