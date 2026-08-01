/**
 * Server-side SSO helpers. Inject Firebase Admin accessors from the host app
 * (each Next app owns its Admin SDK bootstrap).
 */
import { createHash, randomBytes } from "node:crypto";
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";
import type { AppCheck } from "firebase-admin/app-check";

const HANDOFF_TTL_MS = 60_000;
const MAX_SSO_PER_MINUTE = 15;
const CODE_MIN_LEN = 32;

export type SsoAdminDeps = {
  adminAppCheck: () => AppCheck;
  adminAuth: () => Auth;
  adminDb: () => Firestore;
  usingEmulators: () => boolean;
};

export class SsoHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SsoHttpError";
  }

  toResponse(): Response {
    return Response.json(
      { error: this.message, code: this.code },
      { status: this.status },
    );
  }
}

function requireAppCheckEnabled(usingEmulators: () => boolean): boolean {
  if (usingEmulators()) return false;
  if (process.env.PULSE_SSO_REQUIRE_APP_CHECK === "false") return false;
  if (process.env.PULSE_SSO_REQUIRE_APP_CHECK === "true") return true;
  return (
    process.env.NODE_ENV === "production" &&
    Boolean(process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY?.trim())
  );
}

export function createSsoServer(deps: SsoAdminDeps) {
  const { adminAppCheck, adminAuth, adminDb, usingEmulators } = deps;

  async function verifySsoAppCheck(request: Request): Promise<void> {
    if (!requireAppCheckEnabled(usingEmulators)) return;
    const token = request.headers.get("x-firebase-appcheck");
    if (!token) {
      throw new SsoHttpError(401, "appcheck-missing", "App Check token missing.");
    }
    try {
      await adminAppCheck().verifyToken(token);
    } catch {
      throw new SsoHttpError(401, "appcheck-invalid", "App Check token rejected.");
    }
  }

  function clientIp(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
    return request.headers.get("x-real-ip")?.trim() || "unknown";
  }

  function rateKey(bucket: string, identity: string): string {
    const hash = createHash("sha256").update(identity).digest("hex").slice(0, 32);
    const minute = Math.floor(Date.now() / 60_000);
    return `${bucket}_${hash}_${minute}`;
  }

  async function consumeSsoRateLimit(
    bucket: string,
    identity: string,
  ): Promise<void> {
    const minute = Math.floor(Date.now() / 60_000);
    const id = rateKey(bucket, identity);
    const ref = adminDb().doc(`ssoRateLimit/${id}`);
    await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const count = Number(snap.data()?.count ?? 0);
      if (count >= MAX_SSO_PER_MINUTE) {
        throw new SsoHttpError(429, "rate-limited", "Too many SSO requests.");
      }
      tx.set(
        ref,
        {
          bucket,
          minute,
          count: count + 1,
          expiresAt: Timestamp.fromMillis((minute + 2) * 60_000),
        },
        { merge: true },
      );
    });
  }

  function ensureAuthEmulatorHost(): void {
    if (usingEmulators() && !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
    }
  }

  async function createSsoHandoffCode(
    request: Request,
    idToken: string,
  ): Promise<{ code: string; uid: string }> {
    await verifySsoAppCheck(request);
    await consumeSsoRateLimit("create_ip", clientIp(request));

    if (idToken.length < 100) {
      throw new SsoHttpError(400, "idToken-required", "idToken required");
    }

    ensureAuthEmulatorHost();
    let uid: string;
    try {
      const decoded = await adminAuth().verifyIdToken(
        idToken,
        !usingEmulators(),
      );
      uid = decoded.uid;
    } catch {
      throw new SsoHttpError(401, "invalid-token", "Invalid or expired ID token");
    }

    await consumeSsoRateLimit("create_uid", uid);

    const code = randomBytes(32).toString("base64url");
    const now = Date.now();
    await adminDb()
      .collection("ssoHandoffs")
      .doc(code)
      .set({
        uid,
        used: false,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(now + HANDOFF_TTL_MS),
      });

    return { code, uid };
  }

  async function exchangeSsoHandoffCode(
    request: Request,
    code: string,
  ): Promise<{ customToken: string; uid: string }> {
    await verifySsoAppCheck(request);
    await consumeSsoRateLimit("exchange_ip", clientIp(request));

    const trimmed = code.trim();
    if (trimmed.length < CODE_MIN_LEN) {
      throw new SsoHttpError(400, "code-required", "handoff code required");
    }

    ensureAuthEmulatorHost();

    const ref = adminDb().collection("ssoHandoffs").doc(trimmed);
    const uid = await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        throw new SsoHttpError(401, "invalid-code", "Invalid or expired handoff");
      }
      const data = snap.data() ?? {};
      if (data.used === true) {
        throw new SsoHttpError(401, "invalid-code", "Invalid or expired handoff");
      }
      const expiresAt = data.expiresAt as Timestamp | undefined;
      if (!expiresAt || expiresAt.toMillis() < Date.now()) {
        tx.delete(ref);
        throw new SsoHttpError(401, "invalid-code", "Invalid or expired handoff");
      }
      const handoffUid = String(data.uid ?? "");
      if (!handoffUid) {
        tx.delete(ref);
        throw new SsoHttpError(401, "invalid-code", "Invalid or expired handoff");
      }
      tx.update(ref, {
        used: true,
        usedAt: FieldValue.serverTimestamp(),
      });
      return handoffUid;
    });

    await consumeSsoRateLimit("exchange_uid", uid);

    const customToken = await adminAuth().createCustomToken(uid, { sso: true });
    void ref.delete().catch(() => undefined);
    return { customToken, uid };
  }

  function createHandoffPostHandler() {
    return async function POST(request: Request) {
      try {
        const body = (await request.json()) as { idToken?: string };
        const result = await createSsoHandoffCode(
          request,
          String(body.idToken ?? ""),
        );
        return Response.json({ code: result.code });
      } catch (error) {
        if (error instanceof SsoHttpError) return error.toResponse();
        console.error("create-sso-handoff failed", error);
        return Response.json({ error: "Handoff creation failed" }, { status: 500 });
      }
    };
  }

  function createExchangePostHandler() {
    return async function POST(request: Request) {
      try {
        const body = (await request.json()) as { code?: string };
        const result = await exchangeSsoHandoffCode(
          request,
          String(body.code ?? ""),
        );
        return Response.json({
          customToken: result.customToken,
          uid: result.uid,
        });
      } catch (error) {
        if (error instanceof SsoHttpError) return error.toResponse();
        console.error("exchange-sso failed", error);
        return Response.json({ error: "SSO exchange failed" }, { status: 500 });
      }
    };
  }

  return {
    createSsoHandoffCode,
    exchangeSsoHandoffCode,
    verifySsoAppCheck,
    createHandoffPostHandler,
    createExchangePostHandler,
  };
}
