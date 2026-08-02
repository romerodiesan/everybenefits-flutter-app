"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/lib/providers/auth-provider";
import { ThemeProvider } from "@/lib/providers/theme-provider";

/** Applies Firestore appearance from the signed-in Pulse profile. */
export function ThemedApp({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  return (
    <ThemeProvider remoteAppearance={profile?.appearance ?? null}>
      {children}
    </ThemeProvider>
  );
}
