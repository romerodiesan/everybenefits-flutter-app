/**
 * Shared Content-Security-Policy allowlist for Pulse web + Studio.
 *
 * RTDB long-poll JSONP (BrowserPollConnection) injects <script src="{host}/.lp?…">
 * and uses an iframe for disconnect — those hosts MUST be in script-src / frame-src,
 * not only connect-src. Emulator: http://localhost:9000 (and 127.0.0.1).
 * Production: https://*.firebaseio.com.
 */
export type CspBuildOptions = {
    /** Include Firebase emulator hosts (Auth/Firestore/RTDB/Storage/Functions). */
    includeEmulators?: boolean;
    /**
     * Extra emulator hostname(s) besides 127.0.0.1 / localhost — e.g. LAN IP
     * used by Flutter (`NEXT_PUBLIC_FIREBASE_EMULATOR_HOST=10.0.0.77`).
     */
    emulatorHosts?: string | string[];
    /** DotLottie / lottie CDN connect-src (Pulse landing). Default true. */
    includeLottie?: boolean;
    /** GA4 / GTM script+connect+img (consent-gated Analytics). Default true. */
    includeAnalytics?: boolean;
};
/**
 * Builds a single Content-Security-Policy header value.
 */
export declare function buildContentSecurityPolicy(options?: CspBuildOptions): string;
/**
 * Whether Next configs should include emulator hosts in CSP.
 * Pass env explicitly so this package stays Node-types free.
 */
export declare function shouldIncludeEmulatorCsp(env: {
    useFirebaseEmulators?: string;
    nodeEnv?: string;
}): boolean;
