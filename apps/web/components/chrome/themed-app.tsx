"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/lib/providers/theme-provider";

/** Theme only — no Auth/Firebase. Used on public marketing routes. */
export function ThemedApp({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
