"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

const TABS = [
  { href: "/plans", key: "plansTabPlans" as const, exact: true },
  { href: "/plans/tiers", key: "plansTabTiers" as const, exact: false },
  { href: "/plans/groups", key: "plansTabGroups" as const, exact: false },
  {
    href: "/contract-terms",
    key: "plansTabMaterialized" as const,
    exact: false,
  },
];

export function PlansSubnav() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const path = pathname.replace(new RegExp(`^/${locale}`), "") || "/";

  return (
    <nav className="flex flex-wrap gap-2 border-b border-glass-border pb-3 text-sm">
      {TABS.map((tab) => {
        const active = tab.exact
          ? path === tab.href
          : path === tab.href || path.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              active
                ? "bg-brand text-on-brand"
                : "text-muted hover:bg-white/[0.04] hover:text-ink"
            }`}
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
