/**
 * Cross-origin SSO between Pulse, Studio, and Admin.
 *
 * Firebase Auth persistence is per-origin, so we hand off via:
 * 1) source POSTs its ID token to `/api/auth/create-sso-handoff` (never in URL)
 * 2) redirect to dest `/auth/sso?next=…&hc=<opaque-code>`
 * 3) dest exchanges the code for a custom token and signs in
 */
export type PulseAppId = "pulse" | "studio" | "admin";
export declare function pulseWebUrl(): any;
export declare function studioWebUrl(): any;
export declare function adminWebUrl(): any;
export declare function appBaseUrl(app: PulseAppId): any;
/** Prefer Pulse as the SSO hub for silent bridges. */
export declare function siblingApp(app: PulseAppId): PulseAppId;
export declare function otherApps(current: PulseAppId): PulseAppId[];
/** Absolute SSO consume URL on `app`, with optional post-login path. */
export declare function ssoConsumeUrl(app: PulseAppId, locale: string, nextPath?: string): string;
/** Absolute bridge URL: if this app has a session, hand off to `returnUrl`. */
export declare function ssoBridgeUrl(app: PulseAppId, locale: string, returnUrl: string): string;
export declare function handoffUrlWithCode(consumeUrl: string, code: string): string;
export declare function buildSsoHandoffUrl(consumeUrl: string, idToken: string): Promise<string>;
export declare function takeHandoffCode(): string | null;
export declare function markSsoAttempted(): void;
export declare function hasSsoAttempted(): boolean;
export declare function clearSsoAttempt(): void;
export declare function logoutCascadeUrl(app: PulseAppId, locale: string, nextUrl: string): string;
export declare function isAllowedLogoutNext(url: string): boolean;
