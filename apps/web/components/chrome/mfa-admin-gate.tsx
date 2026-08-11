"use client";

import { multiFactor } from "firebase/auth";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { useAuth, useAccess } from "@/lib/providers/auth-provider";
import { usingFirebaseEmulators } from "@/lib/firebase/auth";
import { canAccessAdmin } from "@/lib/roles";
import { Link } from "@/i18n/navigation";
import { Panel } from "@/components/ui/primitives";

/**
 * Managers/admins must enroll at least one MFA factor before using the shell.
 * Account → Security stays reachable so they can enroll.
 * Skipped on Auth emulator: TOTP is unsupported and SMS is awkward locally.
 *
 * Unauthenticated / still-booting visitors must reach AppShell so it can
 * redirect to login — never trap them on a permanent boot skeleton here.
 */
export function MfaAdminGate({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();
  const emulators = usingFirebaseEmulators();
  const access = useAccess();

  // AppShell owns boot UI + unauthenticated redirect.
  if (loading || !user || !profile) {
    return children;
  }

  const needsMfa =
    !emulators &&
    canAccessAdmin(access) &&
    !profile.isAnonymous &&
    multiFactor(user).enrolledFactors.length === 0;

  const onAccount =
    pathname === "/account" || pathname.startsWith("/account/");

  if (needsMfa && !onAccount) {
    return (
      <div className="mesh-bg flex min-h-[100svh] items-center justify-center px-4 py-10">
        <Panel className="w-full max-w-md space-y-4">
          <h1 className="font-display text-2xl font-bold">
            {t("mfaAdminRequiredTitle")}
          </h1>
          <p className="text-sm text-muted">{t("mfaAdminRequiredBody")}</p>
          <Link
            href="/account?section=security"
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand transition hover:brightness-110"
          >
            {t("mfaAdminRequiredCta")}
          </Link>
        </Panel>
      </div>
    );
  }

  return children;
}
