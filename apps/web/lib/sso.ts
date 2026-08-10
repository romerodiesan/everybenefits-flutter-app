/**
 * Cross-origin SSO between Pulse, Studio, and Admin.
 *
 * Thin adapter over `@pulse/sso` — wires Firebase App Check for this origin.
 */

import { getToken } from "firebase/app-check";
import type { PulseAppId } from "@pulse/shared";
import {
  buildSsoHandoffUrl as buildHandoff,
  resolveSwitchUrl as resolveSwitch,
} from "@pulse/sso/client";
import { getFirebaseAppCheck } from "@/lib/firebase/client";

export {
  buildLogoutCascadeUrl,
  clearSsoAttempt,
  isSafeInternalPath,
  markSsoAttempted,
  ssoConsumeUrl,
} from "@pulse/sso";

async function getAppCheckToken(): Promise<string | null> {
  const appCheck = getFirebaseAppCheck();
  if (!appCheck) return null;
  try {
    return (await getToken(appCheck, false)).token;
  } catch {
    return null;
  }
}

export async function buildSsoHandoffUrl(
  consumeUrl: string,
  idToken: string,
): Promise<string> {
  return buildHandoff(consumeUrl, idToken, getAppCheckToken);
}

export async function resolveSwitchUrl(opts: {
  target: PulseAppId;
  homePath: string;
  locale: string;
  getIdToken: () => Promise<string | null>;
}): Promise<string> {
  return resolveSwitch({
    ...opts,
    getAppCheckToken,
  });
}
