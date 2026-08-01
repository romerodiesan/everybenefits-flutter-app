"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  ACCENTS,
  resolveInheritedLocale,
  useThemeSettings,
  type AccentSeed,
  type LocalePreference,
  type ThemeMode,
} from "@/lib/providers/theme-provider";
import {
  SettingsPanelShell,
  SettingsRow,
} from "@/components/profile/settings-nav";

export function AppearancePanel() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const {
    mode,
    accent,
    localePreference,
    setMode,
    setAccent,
    setLocalePreference,
  } = useThemeSettings();

  const switchLocale = (pref: LocalePreference) => {
    setLocalePreference(pref);
    const code = pref === "inherit" ? resolveInheritedLocale() : pref;
    if (code === locale) return;
    const hash =
      typeof window !== "undefined" ? window.location.hash : "#appearance";
    router.replace(pathname, { locale: code });
    queueMicrotask(() => {
      const target = hash || "#appearance";
      if (window.location.hash !== target) {
        window.history.replaceState(null, "", target);
      }
    });
  };

  return (
    <SettingsPanelShell
      title={t("profileAppearance")}
      subtitle={t("profileAppearanceHint")}
    >
      <div className="divide-y divide-glass-border">
        <SettingsRow label={t("profileTheme")}>
          <div className="flex max-w-full flex-wrap rounded-xl bg-ink/[0.04] p-1 dark:bg-white/[0.05]">
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
                className={`h-8 shrink-0 rounded-lg px-2.5 text-xs font-semibold transition sm:px-3 ${
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
          <div className="flex flex-wrap rounded-xl bg-ink/[0.04] p-1 dark:bg-white/[0.05]">
            {(
              [
                ["inherit", t("profileLanguageInherit")],
                ["en", "English"],
                ["es", "Español"],
              ] as [LocalePreference, string][]
            ).map(([code, label]) => (
              <button
                key={code}
                type="button"
                onClick={() => switchLocale(code)}
                aria-pressed={localePreference === code}
                className={`h-8 rounded-lg px-3 text-xs font-semibold transition ${
                  localePreference === code
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
