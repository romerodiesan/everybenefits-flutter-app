"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "system" | "light" | "dark";
export type AccentSeed =
  | "green"
  | "amber"
  | "teal"
  | "blue"
  | "violet"
  | "rose";

const ACCENTS: Record<AccentSeed, string> = {
  green: "#1F6B4A",
  amber: "#F5A524",
  teal: "#0D9488",
  blue: "#2563EB",
  violet: "#7C3AED",
  rose: "#E11D48",
};

const ACCENT_IDS = new Set<string>(Object.keys(ACCENTS));

type ThemeContextValue = {
  mode: ThemeMode;
  accent: AccentSeed;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentSeed) => void;
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

/** Studio inherits appearance from Pulse via Firestore `users/{uid}.appearance`. */
export function ThemeProvider({
  children,
  remoteAppearance,
}: {
  children: ReactNode;
  remoteAppearance?: {
    theme?: string | null;
    accent?: string | null;
  } | null;
}) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [accent, setAccentState] = useState<AccentSeed>("green");
  const [resolvedDark, setResolvedDark] = useState(true);
  const remoteTheme = remoteAppearance?.theme;
  const remoteAccent = remoteAppearance?.accent;

  useEffect(() => {
    startTransition(() => {
      setModeState(readStored("pulse-theme", "dark"));
      setAccentState(readStored("pulse-accent", "green"));
    });
  }, []);

  useEffect(() => {
    if (remoteTheme == null && remoteAccent == null) return;
    startTransition(() => {
      if (
        remoteTheme === "system" ||
        remoteTheme === "light" ||
        remoteTheme === "dark"
      ) {
        setModeState(remoteTheme);
        window.localStorage.setItem("pulse-theme", remoteTheme);
      }
      if (remoteAccent && isAccent(remoteAccent)) {
        setAccentState(remoteAccent);
        window.localStorage.setItem("pulse-accent", remoteAccent);
      }
    });
  }, [remoteTheme, remoteAccent]);

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

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    window.localStorage.setItem("pulse-theme", next);
  }, []);

  const setAccent = useCallback((next: AccentSeed) => {
    setAccentState(next);
    window.localStorage.setItem("pulse-accent", next);
  }, []);

  const value = useMemo(
    () => ({ mode, accent, setMode, setAccent, resolvedDark }),
    [mode, accent, setMode, setAccent, resolvedDark],
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

export { ACCENTS };
