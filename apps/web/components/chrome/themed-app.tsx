"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/lib/providers/auth-provider";
import { ThemeProvider } from "@/lib/providers/theme-provider";

/**
 * Bridges Auth → Theme so ThemeProvider can live in the root layout
 * (outside `[locale]`) and survive language swaps without remounting.
 */
export function ThemedApp({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  return (
    <ThemeProvider remoteAppearance={profile?.appearance ?? null}>
      {children}
    </ThemeProvider>
  );
}
