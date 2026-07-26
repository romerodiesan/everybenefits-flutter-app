import { NextResponse } from "next/server";
import { adminAuth, usingEmulators } from "@/lib/ai/firebase-admin";

/**
 * Same-origin SSO exchange (avoids Functions emulator CORS).
 * Body: { idToken: string } → { customToken: string }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { idToken?: string };
    const idToken = String(body.idToken ?? "");
    if (idToken.length < 100) {
      return NextResponse.json({ error: "idToken required" }, { status: 400 });
    }

    // Against the Auth emulator, verifyIdToken needs the emulator host set.
    if (
      usingEmulators() &&
      !process.env.FIREBASE_AUTH_EMULATOR_HOST
    ) {
      process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
    }

    const decoded = await adminAuth().verifyIdToken(idToken);
    const customToken = await adminAuth().createCustomToken(decoded.uid, {
      sso: true,
    });
    return NextResponse.json({ customToken, uid: decoded.uid });
  } catch (error) {
    console.error("exchange-sso failed", error);
    return NextResponse.json(
      { error: "Invalid or expired ID token" },
      { status: 401 },
    );
  }
}
