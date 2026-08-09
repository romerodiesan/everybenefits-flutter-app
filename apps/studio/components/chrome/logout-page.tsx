"use client";

import { LogoutCascadePage } from "@pulse/sso/react";
import { signOutUser } from "@/lib/firebase/auth";
import { clearCachedProfile } from "@/lib/profile-cache";
import { StudioShellSkeleton } from "@/components/chrome/studio-shell-skeleton";

export function LogoutPage() {
  return (
    <LogoutCascadePage
      LoadingUI={StudioShellSkeleton}
      signOutLocal={signOutUser}
      clearProfileCache={clearCachedProfile}
    />
  );
}
