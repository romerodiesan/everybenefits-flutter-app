"use client";

import { useCallback } from "react";
import { SsoBridgePage as SharedSsoBridgePage } from "@pulse/sso/react";
import { useAuth } from "@/lib/providers/auth-provider";
import { buildSsoHandoffUrl } from "@/lib/sso";

export function SsoBridgePage({
  loginPath = "/login",
}: {
  loginPath?: string;
}) {
  const buildHandoffUrl = useCallback(
    (returnUrl: string, idToken: string) =>
      buildSsoHandoffUrl(returnUrl, idToken),
    [],
  );

  return (
    <SharedSsoBridgePage
      loginPath={loginPath}
      loadingMessageKey="loading"
      buildHandoffUrl={buildHandoffUrl}
      useAuthState={useAuth}
    />
  );
}
