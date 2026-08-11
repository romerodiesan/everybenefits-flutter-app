import {
  exchangeSsoHandoffCode,
  SsoHttpError,
} from "@/lib/sso-server";

/**
 * Exchanges a one-time opaque handoff code for a Firebase custom token.
 * Body: { code: string } → { customToken: string }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: string };
    const code = String(body.code ?? "");
    const result = await exchangeSsoHandoffCode(request, code);
    return Response.json({ customToken: result.customToken });
  } catch (error) {
    if (error instanceof SsoHttpError) return error.toResponse();
    console.error("exchange-sso failed", {
      message: error instanceof Error ? error.message : String(error),
      firestoreEmulator: process.env.FIRESTORE_EMULATOR_HOST ?? null,
      authEmulator: process.env.FIREBASE_AUTH_EMULATOR_HOST ?? null,
      projectId: process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
      useEmulators: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS ?? null,
    });
    return Response.json(
      { error: "Invalid or expired handoff" },
      { status: 401 },
    );
  }
}
