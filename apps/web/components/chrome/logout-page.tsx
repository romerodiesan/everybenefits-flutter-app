"use client";

import { LogoutCascadePage } from "@pulse/sso/react";
import { signOutUser } from "@/lib/firebase/auth";
import { clearCachedProfile } from "@/lib/profile-cache";
import { AppShellSkeleton } from "@/components/chrome/app-shell-skeleton";

export function LogoutPage() {
  return (
    <LogoutCascadePage
      LoadingUI={AppShellSkeleton}
      signOutLocal={signOutUser}
      clearProfileCache={clearCachedProfile}
    />
  );
}
