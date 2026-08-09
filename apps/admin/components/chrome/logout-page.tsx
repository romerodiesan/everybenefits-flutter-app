"use client";

import { LogoutCascadePage } from "@pulse/sso/react";
import { signOutUser } from "@/lib/firebase/auth";
import { clearCachedProfile } from "@/lib/profile-cache";
import { AdminShellSkeleton } from "@/components/chrome/admin-shell-skeleton";

export function LogoutPage() {
  return (
    <LogoutCascadePage
      LoadingUI={AdminShellSkeleton}
      signOutLocal={signOutUser}
      clearProfileCache={clearCachedProfile}
    />
  );
}
