"use client";

import { useCallback } from "react";
import { useLocale } from "next-intl";
import { AppSwitcher as SharedAppSwitcher } from "@pulse/chrome";
import type { PulseAppId, UserRole } from "@pulse/shared";
import { Link } from "@/i18n/navigation";
import { BrandMark } from "@/components/chrome/brand-mark";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { resolveSwitchUrl } from "@/lib/sso";

export function AppSwitcher({
  current,
  role,
}: {
  current: PulseAppId;
  role?: UserRole;
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
      role={role}
      resolveSwitchUrl={resolve}
      HomeLink={Link}
      renderTriggerIcon={(meta) =>
        meta.id === "studio" || meta.id === "pulse" ? (
          <BrandMark size={28} />
        ) : undefined
      }
    />
  );
}
