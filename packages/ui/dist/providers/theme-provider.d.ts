import { type ReactNode } from "react";
export type ThemeMode = "system" | "light" | "dark";
export type AccentSeed = "green" | "amber" | "teal" | "blue" | "violet" | "rose";
export type LocalePreference = "inherit" | "en" | "es";
declare const ACCENTS: Record<AccentSeed, string>;
declare const DEFAULT_THEME: ThemeMode;
declare const DEFAULT_ACCENT: AccentSeed;
declare const DEFAULT_LOCALE: LocalePreference;
/**
 * Read-only appearance provider. Studio/Admin inherit from Pulse via
 * Firestore `users/{uid}.appearance` (edits live in Pulse).
 */
export declare function ThemeProvider({ children, remoteAppearance, }: {
    children: ReactNode;
    remoteAppearance?: {
        theme?: string | null;
        accent?: string | null;
        locale?: string | null;
    } | null;
}): any;
export declare function useThemeSettings(): any;
export declare function resolveInheritedLocale(): "en" | "es";
export { ACCENTS, DEFAULT_THEME, DEFAULT_ACCENT, DEFAULT_LOCALE };
