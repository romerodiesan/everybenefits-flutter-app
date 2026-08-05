"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  ACCENTS,
  useThemeSettings,
  type AccentSeed,
  type ThemeMode,
} from "@/lib/providers/theme-provider";
import {
  SettingsPanelShell,
  SettingsRow,
} from "@/components/profile/settings-nav";
import {
  restorePendingLocaleHash,
  switchLocale,
} from "@/lib/i18n/switch-locale";

export function AppearancePanel() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { mode, accent, setMode, setAccent } = useThemeSettings();

  useEffect(() => {
    restorePendingLocaleHash();
  }, [locale]);

  const onSwitchLocale = (code: string) => {
    if (code === locale) return;
    switchLocale(router, pathname, code, { hash: "#appearance" });
  };

  return (
    <SettingsPanelShell
      title={t("profileAppearance")}
      subtitle={t("profileAppearanceHint")}
    >
      <div className="divide-y divide-glass-border">
        <SettingsRow label={t("profileTheme")}>
          <div className="flex rounded-xl bg-ink/[0.04] p-1 dark:bg-white/[0.05]">
            {(
              [
                ["system", t("profileThemeSystem")],
                ["light", t("profileThemeLight")],
                ["dark", t("profileThemeDark")],
              ] as [ThemeMode, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                className={`h-8 rounded-lg px-3 text-xs font-semibold transition ${
                  mode === value
                    ? "bg-sheet text-brand shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </SettingsRow>

        <SettingsRow label={t("profileAccent")}>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ACCENTS) as AccentSeed[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setAccent(key)}
                aria-label={key}
                aria-pressed={accent === key}
                className={`h-8 w-8 rounded-full border-2 transition ${
                  accent === key
                    ? "scale-110 border-ink"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: ACCENTS[key] }}
              />
            ))}
          </div>
        </SettingsRow>

        <SettingsRow label={t("profileLanguage")}>
          <div className="flex rounded-xl bg-ink/[0.04] p-1 dark:bg-white/[0.05]">
            {(
              [
                ["en", "English"],
                ["es", "Español"],
              ] as const
            ).map(([code, label]) => (
              <button
                key={code}
                type="button"
                onClick={() => onSwitchLocale(code)}
                aria-pressed={locale === code}
                className={`h-8 rounded-lg px-3 text-xs font-semibold transition ${
                  locale === code
                    ? "bg-sheet text-brand shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </SettingsRow>
      </div>
    </SettingsPanelShell>
  );
}
