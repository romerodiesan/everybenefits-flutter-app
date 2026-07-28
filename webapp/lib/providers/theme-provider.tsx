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
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/client";

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

async function persistAppearance(mode: ThemeMode, accent: AccentSeed) {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return;
  try {
    await setDoc(
      doc(getFirebaseDb(), "users", uid),
      {
        appearance: { theme: mode, accent, updatedAt: serverTimestamp() },
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
  } | null;
}) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [accent, setAccentState] = useState<AccentSeed>("green");
  const [resolvedDark, setResolvedDark] = useState(true);

  useEffect(() => {
    startTransition(() => {
      setModeState(readStored("pulse-theme", "dark"));
      setAccentState(readStored("pulse-accent", "green"));
    });
  }, []);

  useEffect(() => {
    if (!remoteAppearance) return;
    const theme = remoteAppearance.theme;
    const nextAccent = remoteAppearance.accent;
    startTransition(() => {
      if (theme === "system" || theme === "light" || theme === "dark") {
        setModeState(theme);
        window.localStorage.setItem("pulse-theme", theme);
      }
      if (nextAccent && isAccent(nextAccent)) {
        setAccentState(nextAccent);
        window.localStorage.setItem("pulse-accent", nextAccent);
      }
    });
  }, [remoteAppearance?.theme, remoteAppearance?.accent]);

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
    void persistAppearance(next, accent);
  };

  const setAccent = (next: AccentSeed) => {
    setAccentState(next);
    window.localStorage.setItem("pulse-accent", next);
    void persistAppearance(mode, next);
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
