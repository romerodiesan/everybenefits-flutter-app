import {
  createSsoHandoffCode,
  SsoHttpError,
} from "@/lib/sso-server";

/**
 * Creates a short-lived opaque SSO handoff code from a Firebase ID token.
 * Body: { idToken: string } → { code: string }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { idToken?: string };
    const result = await createSsoHandoffCode(
      request,
      String(body.idToken ?? ""),
    );
    return Response.json({ code: result.code });
  } catch (error) {
    if (error instanceof SsoHttpError) return error.toResponse();
    console.error("create-sso-handoff failed");
    return Response.json({ error: "Handoff creation failed" }, { status: 500 });
  }
}
