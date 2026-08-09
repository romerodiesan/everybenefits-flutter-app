"use client";

import { useCallback } from "react";
import { getToken } from "firebase/app-check";
import { SsoConsumePage as SharedSsoConsumePage } from "@pulse/sso/react";
import { signInWithCustomAuthToken } from "@/lib/firebase/auth";
import {
  getFirebaseAppCheck,
  getFirebaseAuth,
  initFirebaseClient,
} from "@/lib/firebase/client";
import { AppShellSkeleton } from "@/components/chrome/app-shell-skeleton";

export function SsoConsumePage({ homePath = "/home" }: { homePath?: string }) {
  const getAppCheckToken = useCallback(async () => {
    const appCheck = getFirebaseAppCheck();
    if (!appCheck) return null;
    try {
      return (await getToken(appCheck, false)).token;
    } catch {
      return null;
    }
  }, []);

  return (
    <SharedSsoConsumePage
      homePath={homePath}
      rootRedirectPath="/home"
      LoadingUI={AppShellSkeleton}
      signInWithCustomToken={signInWithCustomAuthToken}
      getAuth={getFirebaseAuth}
      initFirebase={initFirebaseClient}
      getAppCheckToken={getAppCheckToken}
    />
  );
}
