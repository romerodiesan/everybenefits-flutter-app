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
    const result = await exchangeSsoHandoffCode(
      request,
      String(body.code ?? ""),
    );
    return Response.json({ customToken: result.customToken });
  } catch (error) {
    if (error instanceof SsoHttpError) return error.toResponse();
    console.error("exchange-sso failed");
    return Response.json(
      { error: "Invalid or expired handoff" },
      { status: 401 },
    );
  }
}
