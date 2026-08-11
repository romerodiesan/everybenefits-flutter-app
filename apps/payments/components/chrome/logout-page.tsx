"use client";

import { LogoutCascadePage } from "@pulse/sso/react";
import { signOutUser } from "@/lib/firebase/auth";
import { clearCachedProfile } from "@/lib/profile-cache";
import { PaymentsShellSkeleton } from "@/components/chrome/payments-shell-skeleton";

export function LogoutPage() {
  return (
    <LogoutCascadePage
      LoadingUI={PaymentsShellSkeleton}
      signOutLocal={signOutUser}
      clearProfileCache={clearCachedProfile}
    />
  );
}
