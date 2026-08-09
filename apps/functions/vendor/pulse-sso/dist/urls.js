"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pulseWebUrl = pulseWebUrl;
exports.studioWebUrl = studioWebUrl;
exports.adminWebUrl = adminWebUrl;
exports.appBaseUrl = appBaseUrl;
exports.siblingApp = siblingApp;
exports.otherApps = otherApps;
exports.allAppOrigins = allAppOrigins;
exports.ssoConsumeUrl = ssoConsumeUrl;
exports.ssoBridgeUrl = ssoBridgeUrl;
exports.handoffUrlWithCode = handoffUrlWithCode;
exports.logoutCascadeUrl = logoutCascadeUrl;
exports.isAllowedSsoReturnUrl = isAllowedSsoReturnUrl;
exports.isAllowedLogoutNext = isAllowedLogoutNext;
const paths_1 = require("./paths");
function pulseWebUrl() {
    return (process.env.NEXT_PUBLIC_PULSE_WEB_URL?.replace(/\/$/, "") ||
        "http://localhost:3000");
}
function studioWebUrl() {
    return (process.env.NEXT_PUBLIC_STUDIO_URL?.replace(/\/$/, "") ||
        "http://localhost:3001");
}
function adminWebUrl() {
    return (process.env.NEXT_PUBLIC_ADMIN_URL?.replace(/\/$/, "") ||
        "http://localhost:3002");
}
function appBaseUrl(app) {
    if (app === "studio")
        return studioWebUrl();
    if (app === "admin")
        return adminWebUrl();
    return pulseWebUrl();
}
/** Prefer Pulse as the SSO hub for silent bridges. */
function siblingApp(app) {
    if (app !== "pulse")
        return "pulse";
    return "studio";
}
function otherApps(current) {
    return ["pulse", "studio", "admin"].filter((app) => app !== current);
}
function allAppOrigins() {
    return new Set([
        new URL(pulseWebUrl()).origin,
        new URL(studioWebUrl()).origin,
        new URL(adminWebUrl()).origin,
    ]);
}
/** Absolute SSO consume URL on `app`, with optional post-login path. */
function ssoConsumeUrl(app, locale, nextPath = "/") {
    const next = encodeURIComponent((0, paths_1.safeInternalPath)(nextPath));
    return `${appBaseUrl(app)}/${locale}/auth/sso?next=${next}`;
}
/** Absolute bridge URL: if this app has a session, hand off to `returnUrl`. */
function ssoBridgeUrl(app, locale, returnUrl) {
    return `${appBaseUrl(app)}/${locale}/auth/bridge?return=${encodeURIComponent(returnUrl)}`;
}
function handoffUrlWithCode(consumeUrl, code) {
    const url = new URL(consumeUrl.split("#")[0]);
    url.searchParams.set("hc", code);
    return url.toString();
}
/** Absolute logout URL on `app`; after signing out, redirects to `nextUrl`. */
function logoutCascadeUrl(app, locale, nextUrl) {
    return `${appBaseUrl(app)}/${locale}/auth/logout?next=${encodeURIComponent(nextUrl)}`;
}
/**
 * Bridge `return` URLs must target a known Pulse-family origin and an
 * `/auth/sso` consume path (includes Admin).
 */
function isAllowedSsoReturnUrl(url) {
    try {
        const parsed = new URL(url);
        return (allAppOrigins().has(parsed.origin) &&
            parsed.pathname.includes("/auth/sso"));
    }
    catch {
        return false;
    }
}
/** Logout `next` may be a safe relative path or any Pulse-family origin. */
function isAllowedLogoutNext(url) {
    try {
        if ((0, paths_1.isSafeInternalPath)(url))
            return true;
        const parsed = new URL(url);
        return allAppOrigins().has(parsed.origin);
    }
    catch {
        return false;
    }
}
