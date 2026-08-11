import type { PulseAppId } from "@pulse/shared";
import { SsoClientError } from "./errors";
export type GetAppCheckToken = () => Promise<string | null | undefined>;
/**
 * Mint an opaque handoff code on this origin, then build the sibling consume URL.
 * Never puts the Firebase ID token in the query string.
 */
export declare function buildSsoHandoffUrl(consumeUrl: string, idToken: string, getAppCheckToken?: GetAppCheckToken): Promise<string>;
export declare function exchangeHandoffCode(code: string, getAppCheckToken?: GetAppCheckToken): Promise<string>;
/**
 * Resolve navigation URL when switching apps.
 * Signed-in users always use SSO handoff (throws on failure — no silent fallback).
 * Signed-out users get a plain destination URL.
 */
export declare function resolveSwitchUrl(opts: {
    target: PulseAppId;
    homePath: string;
    locale: string;
    getIdToken: () => Promise<string | null>;
    getAppCheckToken?: GetAppCheckToken;
}): Promise<string>;
/**
 * Read opaque handoff code from query. Stashes in sessionStorage for Strict Mode.
 * Strips legacy `ht` / hash idToken params without using them.
 *
 * Prefer a fresh `hc` query param over any stashed leftover — a failed exchange
 * must not block the next handoff URL.
 */
export declare function takeHandoffCode(): string | null;
export declare function clearHandoffCodeStash(): void;
export declare function readStashedCustomToken(): string | null;
export declare function stashCustomToken(token: string): void;
export declare function clearStashedCustomToken(): void;
export declare function markSsoAttempted(): void;
export declare function hasSsoAttempted(): boolean;
export declare function clearSsoAttempt(): void;
export declare function asSsoClientError(error: unknown): SsoClientError;
//# sourceMappingURL=client.d.ts.map