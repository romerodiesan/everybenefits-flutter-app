"use client";

import { useEffect, type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/lib/providers/auth-provider";
import { useThemeSettings } from "@/lib/providers/theme-provider";

/** Pushes signed-in profile appearance into the root ThemeProvider. */
function ThemeAppearanceSync() {
  const { profile } = useAuth();
  const { applyRemoteAppearance } = useThemeSettings();

  useEffect(() => {
    applyRemoteAppearance(profile?.appearance ?? null);
  }, [
    applyRemoteAppearance,
    profile?.appearance?.theme,
    profile?.appearance?.accent,
  ]);

  return null;
}

/** Auth for app shell and auth forms (theme lives on the root ThemedApp). */
export function AuthenticatedTree({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeAppearanceSync />
      {children}
    </AuthProvider>
  );
}
