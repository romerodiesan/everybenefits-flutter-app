import { POST_createSsoHandoff } from "@/lib/sso-server";

/** Creates a short-lived opaque SSO handoff code from a Firebase ID token. */
export const POST = POST_createSsoHandoff;
