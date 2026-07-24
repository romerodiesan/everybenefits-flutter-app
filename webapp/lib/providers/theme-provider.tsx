"use client";

import {
  createContext,
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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [accent, setAccentState] = useState<AccentSeed>("green");
  const [resolvedDark, setResolvedDark] = useState(true);

  useEffect(() => {
    setModeState(readStored("pulse-theme", "dark"));
    setAccentState(readStored("pulse-accent", "green"));
  }, []);

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
  };

  const setAccent = (next: AccentSeed) => {
    setAccentState(next);
    window.localStorage.setItem("pulse-accent", next);
  };

  const value = useMemo(
    () => ({ mode, accent, setMode, setAccent, resolvedDark }),
    [mode, accent, resolvedDark],
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
