"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, startTransition, useContext, useEffect, useMemo, useState, } from "react";
const ACCENTS = {
    green: "#1F6B4A",
    amber: "#F5A524",
    teal: "#0D9488",
    blue: "#2563EB",
    violet: "#7C3AED",
    rose: "#E11D48",
};
const ACCENT_IDS = new Set(Object.keys(ACCENTS));
const DEFAULT_THEME = "light";
const DEFAULT_ACCENT = "teal";
const DEFAULT_LOCALE = "inherit";
const ThemeContext = createContext(null);
function readStored(key, fallback) {
    if (typeof window === "undefined")
        return fallback;
    return window.localStorage.getItem(key) || fallback;
}
function isAccent(value) {
    return ACCENT_IDS.has(value);
}
function isTheme(value) {
    return value === "system" || value === "light" || value === "dark";
}
function isLocalePref(value) {
    return value === "inherit" || value === "en" || value === "es";
}
/**
 * Read-only appearance provider. Studio/Admin inherit from Pulse via
 * Firestore `users/{uid}.appearance` (edits live in Pulse).
 */
export function ThemeProvider({ children, remoteAppearance, }) {
    const [mode, setModeState] = useState(DEFAULT_THEME);
    const [accent, setAccentState] = useState(DEFAULT_ACCENT);
    const [localePreference, setLocalePreferenceState] = useState(DEFAULT_LOCALE);
    const [resolvedDark, setResolvedDark] = useState(false);
    useEffect(() => {
        startTransition(() => {
            const storedTheme = readStored("pulse-theme", DEFAULT_THEME);
            const storedAccent = readStored("pulse-accent", DEFAULT_ACCENT);
            const storedLocale = readStored("pulse-locale", DEFAULT_LOCALE);
            setModeState(isTheme(storedTheme) ? storedTheme : DEFAULT_THEME);
            setAccentState(isAccent(storedAccent) ? storedAccent : DEFAULT_ACCENT);
            setLocalePreferenceState(isLocalePref(storedLocale) ? storedLocale : DEFAULT_LOCALE);
        });
    }, []);
    useEffect(() => {
        if (!remoteAppearance)
            return;
        startTransition(() => {
            if (remoteAppearance.theme && isTheme(remoteAppearance.theme)) {
                setModeState(remoteAppearance.theme);
                window.localStorage.setItem("pulse-theme", remoteAppearance.theme);
            }
            if (remoteAppearance.accent && isAccent(remoteAppearance.accent)) {
                setAccentState(remoteAppearance.accent);
                window.localStorage.setItem("pulse-accent", remoteAppearance.accent);
            }
            if (remoteAppearance.locale && isLocalePref(remoteAppearance.locale)) {
                setLocalePreferenceState(remoteAppearance.locale);
                window.localStorage.setItem("pulse-locale", remoteAppearance.locale);
            }
        });
    }, [
        remoteAppearance?.theme,
        remoteAppearance?.accent,
        remoteAppearance?.locale,
    ]);
    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const apply = () => {
            const dark = mode === "dark" || (mode === "system" && media.matches);
            setResolvedDark(dark);
            document.documentElement.classList.toggle("dark", dark);
            document.documentElement.style.setProperty("--brand", ACCENTS[accent]);
        };
        apply();
        media.addEventListener("change", apply);
        return () => media.removeEventListener("change", apply);
    }, [mode, accent]);
    const setMode = (next) => {
        setModeState(next);
        window.localStorage.setItem("pulse-theme", next);
    };
    const setAccent = (next) => {
        setAccentState(next);
        window.localStorage.setItem("pulse-accent", next);
    };
    const setLocalePreference = (next) => {
        setLocalePreferenceState(next);
        window.localStorage.setItem("pulse-locale", next);
    };
    const value = useMemo(() => ({
        mode,
        accent,
        localePreference,
        setMode,
        setAccent,
        setLocalePreference,
        resolvedDark,
    }), [mode, accent, localePreference, resolvedDark]);
    return (_jsx(ThemeContext.Provider, { value: value, children: children }));
}
export function useThemeSettings() {
    const ctx = useContext(ThemeContext);
    if (!ctx)
        throw new Error("useThemeSettings requires ThemeProvider");
    return ctx;
}
export function resolveInheritedLocale() {
    if (typeof navigator === "undefined")
        return "en";
    const lang = (navigator.languages?.[0] ?? navigator.language ?? "en")
        .toLowerCase();
    return lang.startsWith("es") ? "es" : "en";
}
export { ACCENTS, DEFAULT_THEME, DEFAULT_ACCENT, DEFAULT_LOCALE };
