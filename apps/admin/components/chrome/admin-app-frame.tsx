"use client";

import { usePathname } from "@/i18n/navigation";
import { AdminShell } from "@/components/chrome/admin-shell";
import type { ReactNode } from "react";

const BARE_PREFIXES = ["/login", "/auth", "/no-access"];

/**
 * Keeps Admin chrome mounted across app navigations.
 * Auth / gate routes render without the shell.
 */
export function AdminAppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bare = BARE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (bare) return children;
  return <AdminShell>{children}</AdminShell>;
}
