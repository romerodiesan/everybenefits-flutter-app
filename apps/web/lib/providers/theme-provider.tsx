"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@pulse/firebase-client";

export type ThemeMode = "system" | "light" | "dark";
export type AccentSeed =
  | "green"
  | "amber"
  | "teal"
  | "blue"
  | "violet"
  | "rose";
export type LocalePreference = "inherit" | "en" | "es";

const ACCENTS: Record<AccentSeed, string> = {
  green: "#1F6B4A",
  amber: "#F5A524",
  teal: "#0D9488",
  blue: "#2563EB",
  violet: "#7C3AED",
  rose: "#E11D48",
};

const ACCENT_IDS = new Set<string>(Object.keys(ACCENTS));
const DEFAULT_THEME: ThemeMode = "light";
const DEFAULT_ACCENT: AccentSeed = "teal";
const DEFAULT_LOCALE: LocalePreference = "inherit";

type ThemeContextValue = {
  mode: ThemeMode;
  accent: AccentSeed;
  localePreference: LocalePreference;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentSeed) => void;
  setLocalePreference: (locale: LocalePreference) => void;
  resolvedDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStored<T extends string>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return (window.localStorage.getItem(key) as T) || fallback;
}

function isAccent(value: string): value is AccentSeed {
  return ACCENT_IDS.has(value);
}

function isTheme(value: string): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

function isLocalePref(value: string): value is LocalePreference {
  return value === "inherit" || value === "en" || value === "es";
}

async function persistAppearance(
  mode: ThemeMode,
  accent: AccentSeed,
  locale: LocalePreference,
) {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return;
  try {
    await setDoc(
      doc(getFirebaseDb(), "users", uid),
      {
        appearance: {
          theme: mode,
          accent,
          locale,
          updatedAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch {
    // Offline / rules — localStorage still applies.
  }
}

export function ThemeProvider({
  children,
  remoteAppearance,
}: {
  children: ReactNode;
  /** When signed in, prefer Firestore appearance from the user profile. */
  remoteAppearance?: {
    theme?: string | null;
    accent?: string | null;
    locale?: string | null;
  } | null;
}) {
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_THEME);
  const [accent, setAccentState] = useState<AccentSeed>(DEFAULT_ACCENT);
  const [localePreference, setLocalePreferenceState] =
    useState<LocalePreference>(DEFAULT_LOCALE);
  const [resolvedDark, setResolvedDark] = useState(false);

  useEffect(() => {
    startTransition(() => {
      const storedTheme = readStored("pulse-theme", DEFAULT_THEME);
      const storedAccent = readStored("pulse-accent", DEFAULT_ACCENT);
      const storedLocale = readStored("pulse-locale", DEFAULT_LOCALE);
      setModeState(isTheme(storedTheme) ? storedTheme : DEFAULT_THEME);
      setAccentState(isAccent(storedAccent) ? storedAccent : DEFAULT_ACCENT);
      setLocalePreferenceState(
        isLocalePref(storedLocale) ? storedLocale : DEFAULT_LOCALE,
      );
    });
  }, []);

  useEffect(() => {
    if (!remoteAppearance) return;
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
      const dark =
        mode === "dark" || (mode === "system" && media.matches);
      setResolvedDark(dark);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.setProperty(
        "--brand",
        ACCENTS[accent],
      );
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [mode, accent]);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    window.localStorage.setItem("pulse-theme", next);
    void persistAppearance(next, accent, localePreference);
  };

  const setAccent = (next: AccentSeed) => {
    setAccentState(next);
    window.localStorage.setItem("pulse-accent", next);
    void persistAppearance(mode, next, localePreference);
  };

  const setLocalePreference = (next: LocalePreference) => {
    setLocalePreferenceState(next);
    window.localStorage.setItem("pulse-locale", next);
    void persistAppearance(mode, accent, next);
  };

  const value = useMemo(
    () => ({
      mode,
      accent,
      localePreference,
      setMode,
      setAccent,
      setLocalePreference,
      resolvedDark,
    }),
    [mode, accent, localePreference, resolvedDark],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeSettings() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeSettings requires ThemeProvider");
  return ctx;
}

export function resolveInheritedLocale(): "en" | "es" {
  if (typeof navigator === "undefined") return "en";
  const lang = (navigator.languages?.[0] ?? navigator.language ?? "en")
    .toLowerCase();
  return lang.startsWith("es") ? "es" : "en";
}

export { ACCENTS, DEFAULT_THEME, DEFAULT_ACCENT, DEFAULT_LOCALE };
