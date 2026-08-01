"use client";

import type { ReactNode } from "react";
import type { User } from "firebase/auth";
import type { UserProfile } from "@/lib/types";
import { isUserApproved } from "@/lib/roles";
import { AccountGate } from "@/components/chrome/account-gate";
import { PendingApprovalGate } from "@/components/chrome/pending-approval-gate";
import { AppShellSkeleton } from "@/components/chrome/app-shell-skeleton";

export function AppShellGates({
  loading,
  user,
  profile,
  children,
}: {
  loading: boolean;
  user: User | null;
  profile: UserProfile | null;
  children: (profile: UserProfile) => ReactNode;
}) {
  if (loading || !user) {
    return <AppShellSkeleton />;
  }

  if (!profile) {
    return <AppShellSkeleton />;
  }

  if (
    profile.accountStatus === "deactivated" ||
    profile.accountStatus === "pendingDeletion"
  ) {
    return <AccountGate profile={profile} />;
  }

  if (!profile.isAnonymous && !isUserApproved(profile.approvalStatus)) {
    return <PendingApprovalGate />;
  }

  return <>{children(profile)}</>;
}
