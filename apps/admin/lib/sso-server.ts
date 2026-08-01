import "server-only";

import { createSsoServer, SsoHttpError } from "@pulse/sso/server";
import {
  adminAppCheck,
  adminAuth,
  adminDb,
  usingEmulators,
} from "@/lib/firebase/admin";

const sso = createSsoServer({
  adminAppCheck,
  adminAuth,
  adminDb,
  usingEmulators,
});

export { SsoHttpError };
export const createSsoHandoffCode = sso.createSsoHandoffCode;
export const exchangeSsoHandoffCode = sso.exchangeSsoHandoffCode;
export const verifySsoAppCheck = sso.verifySsoAppCheck;
export const POST_createSsoHandoff = sso.createHandoffPostHandler();
export const POST_exchangeSso = sso.createExchangePostHandler();
