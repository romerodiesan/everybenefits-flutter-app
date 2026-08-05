"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
const THEME_KEY = "pulse-theme";
const ACCENT_KEY = "pulse-accent";

type ThemeContextValue = {
  mode: ThemeMode;
  accent: AccentSeed;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentSeed) => void;
  resolvedDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

function isAccent(value: string | null | undefined): value is AccentSeed {
  return typeof value === "string" && ACCENT_IDS.has(value);
}

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const raw = window.localStorage.getItem(THEME_KEY);
  return isThemeMode(raw) ? raw : "dark";
}

function readStoredAccent(): AccentSeed {
  if (typeof window === "undefined") return "green";
  const raw = window.localStorage.getItem(ACCENT_KEY);
  return isAccent(raw) ? raw : "green";
}

function resolveDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Apply theme to <html> immediately (do not wait for React effects). */
export function applyDocumentTheme(mode: ThemeMode, accent: AccentSeed): boolean {
  if (typeof document === "undefined") return mode !== "light";
  const dark = resolveDark(mode);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.setProperty("--brand", ACCENTS[accent]);
  return dark;
}

/**
 * Inline boot script lives in `@/lib/theme-boot` (server-safe) so the root
 * layout can inject it without importing this client module.
 */
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
  const [mode, setModeState] = useState<ThemeMode>(() =>
    typeof window === "undefined" ? "dark" : readStoredMode(),
  );
  const [accent, setAccentState] = useState<AccentSeed>(() =>
    typeof window === "undefined" ? "green" : readStoredAccent(),
  );
  const [resolvedDark, setResolvedDark] = useState(() => resolveDark(mode));
  /** Ignore stale Firestore snapshots briefly after a local change. */
  const ignoreRemoteUntil = useRef(0);
  const modeRef = useRef(mode);
  const accentRef = useRef(accent);
  modeRef.current = mode;
  accentRef.current = accent;
  const remoteTheme = remoteAppearance?.theme;
  const remoteAccent = remoteAppearance?.accent;

  useEffect(() => {
    // Re-sync from storage once on mount (covers SSR → client).
    startTransition(() => {
      const nextMode = readStoredMode();
      const nextAccent = readStoredAccent();
      setModeState(nextMode);
      setAccentState(nextAccent);
      setResolvedDark(applyDocumentTheme(nextMode, nextAccent));
    });
  }, []);

  useEffect(() => {
    if (remoteTheme == null && remoteAccent == null) return;
    if (Date.now() < ignoreRemoteUntil.current) return;

    const currentMode = modeRef.current;
    const currentAccent = accentRef.current;
    let nextMode = currentMode;
    let nextAccent = currentAccent;
    let changed = false;

    if (isThemeMode(remoteTheme) && remoteTheme !== currentMode) {
      nextMode = remoteTheme;
      window.localStorage.setItem(THEME_KEY, remoteTheme);
      changed = true;
    }
    if (isAccent(remoteAccent) && remoteAccent !== currentAccent) {
      nextAccent = remoteAccent;
      window.localStorage.setItem(ACCENT_KEY, remoteAccent);
      changed = true;
    }
    if (!changed) return;

    startTransition(() => {
      setModeState(nextMode);
      setAccentState(nextAccent);
      setResolvedDark(applyDocumentTheme(nextMode, nextAccent));
    });
  }, [remoteTheme, remoteAccent]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (mode !== "system") return;
      setResolvedDark(applyDocumentTheme(mode, accent));
    };
    setResolvedDark(applyDocumentTheme(mode, accent));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode, accent]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      ignoreRemoteUntil.current = Date.now() + 2500;
      setModeState(next);
      window.localStorage.setItem(THEME_KEY, next);
      setResolvedDark(applyDocumentTheme(next, accent));
      void persistAppearance(next, accent);
    },
    [accent],
  );

  const setAccent = useCallback(
    (next: AccentSeed) => {
      ignoreRemoteUntil.current = Date.now() + 2500;
      setAccentState(next);
      window.localStorage.setItem(ACCENT_KEY, next);
      setResolvedDark(applyDocumentTheme(mode, next));
      void persistAppearance(mode, next);
    },
    [mode],
  );

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
