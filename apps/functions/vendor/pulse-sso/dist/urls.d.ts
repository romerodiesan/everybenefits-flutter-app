import type { PulseAppId } from "@pulse/shared";
export declare function pulseWebUrl(): string;
export declare function studioWebUrl(): string;
export declare function adminWebUrl(): string;
export declare function appBaseUrl(app: PulseAppId): string;
/** Prefer Pulse as the SSO hub for silent bridges. */
export declare function siblingApp(app: PulseAppId): PulseAppId;
export declare function otherApps(current: PulseAppId): PulseAppId[];
export declare function allAppOrigins(): Set<string>;
/** Absolute SSO consume URL on `app`, with optional post-login path. */
export declare function ssoConsumeUrl(app: PulseAppId, locale: string, nextPath?: string): string;
/** Absolute bridge URL: if this app has a session, hand off to `returnUrl`. */
export declare function ssoBridgeUrl(app: PulseAppId, locale: string, returnUrl: string): string;
export declare function handoffUrlWithCode(consumeUrl: string, code: string): string;
/** Absolute logout URL on `app`; after signing out, redirects to `nextUrl`. */
export declare function logoutCascadeUrl(app: PulseAppId, locale: string, nextUrl: string): string;
/**
 * Bridge `return` URLs must target a known Pulse-family origin and an
 * `/auth/sso` consume path (includes Admin).
 */
export declare function isAllowedSsoReturnUrl(url: string): boolean;
/** Logout `next` may be a safe relative path or any Pulse-family origin. */
export declare function isAllowedLogoutNext(url: string): boolean;
//# sourceMappingURL=urls.d.ts.map