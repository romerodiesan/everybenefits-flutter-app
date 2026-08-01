"use client";

import type { ComponentType } from "react";
import { Link } from "@/i18n/navigation";
import {
  AppSwitcher as SharedAppSwitcher,
  type AppSwitcherLinkProps,
} from "@pulse/ui";
import type { PulseAppId } from "@pulse/sso/client";
import type { UserRole } from "@pulse/shared";

export function AppSwitcher({
  current,
  role,
}: {
  current: PulseAppId;
  role?: UserRole;
}) {
  return (
    <SharedAppSwitcher
      current={current}
      role={role}
      linkComponent={Link as ComponentType<AppSwitcherLinkProps>}
    />
  );
}
