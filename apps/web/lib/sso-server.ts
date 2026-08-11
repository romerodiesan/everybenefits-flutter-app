import "server-only";

import {
  contextFromRequest,
  createSsoServer,
  SsoHttpError,
} from "@pulse/sso/server";
import {
  adminAppCheck,
  adminAuth,
  adminDb,
  usingEmulators,
} from "@/lib/firebase-admin";

const server = createSsoServer({
  auth: adminAuth,
  db: adminDb,
  appCheck: adminAppCheck,
  usingEmulators,
});

export { SsoHttpError };

export async function createSsoHandoffCode(
  request: Request,
  idToken: string,
): Promise<{ code: string; uid: string }> {
  return server.createSsoHandoffCode(contextFromRequest(request), idToken);
}

export async function exchangeSsoHandoffCode(
  request: Request,
  code: string,
): Promise<{ customToken: string; uid: string }> {
  return server.exchangeSsoHandoffCode(contextFromRequest(request), code);
}
