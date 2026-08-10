"use client";

import { useCallback } from "react";
import { useLocale } from "next-intl";
import { AppSwitcher as SharedAppSwitcher } from "@pulse/chrome";
import type { PulseAppId, RoleOrPermissions } from "@pulse/shared";
import { Link } from "@/i18n/navigation";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { resolveSwitchUrl } from "@/lib/sso";

/**
 * Host wrapper around the shared Pulse family app switcher.
 * Keep this file identical across web / studio / admin.
 */
export function AppSwitcher({
  current,
  permissions,
  role,
}: {
  current: PulseAppId;
  permissions?: RoleOrPermissions;
  /** @deprecated Prefer `permissions`. */
  role?: RoleOrPermissions;
}) {
  const locale = useLocale();

  const resolve = useCallback(
    async (target: PulseAppId, homePath: string) =>
      resolveSwitchUrl({
        target,
        homePath,
        locale,
        getIdToken: async () => {
          const user = getFirebaseAuth().currentUser;
          if (!user) return null;
          return user.getIdToken();
        },
      }),
    [locale],
  );

  return (
    <SharedAppSwitcher
      current={current}
      permissions={permissions ?? role}
      resolveSwitchUrl={resolve}
      HomeLink={Link}
    />
  );
}
