import "server-only";

import type { UserRole } from "@/lib/types";
import { parseRole } from "@/lib/roles";
import { aiConfig } from "./config";
import { adminAppCheck, adminAuth, adminDb, usingEmulators } from "./firebase-admin";

export type PulseViewer = {
  uid: string;
  role: UserRole;
  isAnonymous: boolean;
  displayName: string | null;
};

export class PulseHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PulseHttpError";
  }

  toResponse(): Response {
    return Response.json(
      { error: { code: this.code, message: this.message } },
      { status: this.status },
    );
  }
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

async function verifyAppCheck(request: Request) {
  if (!aiConfig.requireAppCheck || usingEmulators()) return;
  const token = request.headers.get("x-firebase-appcheck");
  if (!token) {
    throw new PulseHttpError(401, "appcheck-missing", "App Check token missing.");
  }
  try {
    await adminAppCheck().verifyToken(token);
  } catch {
    throw new PulseHttpError(401, "appcheck-invalid", "App Check token rejected.");
  }
}

/**
 * Authenticates a Pulse AI request end to end: App Check, Firebase ID token,
 * and the *server-side* role from `users/{uid}` — never a client-supplied one.
 */
export async function authenticate(request: Request): Promise<PulseViewer> {
  await verifyAppCheck(request);

  const idToken = bearerToken(request);
  if (!idToken) {
    throw new PulseHttpError(401, "unauthenticated", "Sign in to use Pulse AI.");
  }

  let uid: string;
  let signInProvider: string | undefined;
  try {
    // Revocation checks hit production Auth; skip them against the emulator.
    const decoded = await adminAuth().verifyIdToken(
      idToken,
      !usingEmulators(),
    );
    uid = decoded.uid;
    signInProvider = decoded.firebase?.sign_in_provider;
  } catch {
    throw new PulseHttpError(401, "unauthenticated", "Session expired. Sign in again.");
  }

  const snapshot = await adminDb().collection("users").doc(uid).get();
  const data = snapshot.data() ?? {};
  const role = parseRole(data.role);
  const isAnonymous =
    data.isAnonymous === true || signInProvider === "anonymous";

  if (!aiConfig.allowAnonymous && (isAnonymous || role === "guest")) {
    throw new PulseHttpError(
      403,
      "account-required",
      "Pulse AI is available to members with a complete account.",
    );
  }

  return {
    uid,
    role,
    isAnonymous,
    displayName:
      typeof data.displayName === "string" && data.displayName.trim()
        ? data.displayName.trim()
        : null,
  };
}

/** Guards maintenance endpoints: an admin user or the cron shared secret. */
export async function authenticateAdminTask(request: Request): Promise<PulseViewer | null> {
  const provided =
    request.headers.get("x-pulse-admin-key") ??
    bearerToken(request) ??
    "";
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
  const secrets = [aiConfig.adminTaskKey, process.env.CRON_SECRET].filter(
    (secret): secret is string => Boolean(secret),
  );
  if (provided && secrets.includes(provided)) {
    return null;
  }

  const viewer = await authenticate(request);
  if (viewer.role !== "admin") {
    throw new PulseHttpError(403, "forbidden", "Admin access required.");
  }
  return viewer;
}
