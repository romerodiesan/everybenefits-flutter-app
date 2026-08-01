"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/lib/providers/auth-provider";
import { ThemeProvider } from "@pulse/ui";

/** Admin inherits Pulse appearance from Firestore `users/{uid}.appearance`. */
export function ThemedApp({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  return (
    <ThemeProvider remoteAppearance={profile?.appearance ?? null}>
      {children}
    </ThemeProvider>
  );
}
