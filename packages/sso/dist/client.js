"use strict";
/**
 * Cross-origin SSO between Pulse, Studio, and Admin.
 *
 * Firebase Auth persistence is per-origin, so we hand off via:
 * 1) source POSTs its ID token to `/api/auth/create-sso-handoff` (never in URL)
 * 2) redirect to dest `/auth/sso?next=…&hc=<opaque-code>`
 * 3) dest exchanges the code for a custom token and signs in
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pulseWebUrl = pulseWebUrl;
exports.studioWebUrl = studioWebUrl;
exports.adminWebUrl = adminWebUrl;
exports.appBaseUrl = appBaseUrl;
exports.siblingApp = siblingApp;
exports.otherApps = otherApps;
exports.ssoConsumeUrl = ssoConsumeUrl;
exports.ssoBridgeUrl = ssoBridgeUrl;
exports.handoffUrlWithCode = handoffUrlWithCode;
exports.buildSsoHandoffUrl = buildSsoHandoffUrl;
exports.takeHandoffCode = takeHandoffCode;
exports.markSsoAttempted = markSsoAttempted;
exports.hasSsoAttempted = hasSsoAttempted;
exports.clearSsoAttempt = clearSsoAttempt;
exports.logoutCascadeUrl = logoutCascadeUrl;
exports.isAllowedLogoutNext = isAllowedLogoutNext;
const app_check_1 = require("firebase/app-check");
const firebase_client_1 = require("@pulse/firebase-client");
const ALL_APPS = ["pulse", "studio", "admin"];
const SSO_ATTEMPT_KEY = "pulse_sso_attempt";
const SSO_CODE_STASH_KEY = "pulse_sso_hc";
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
    return ALL_APPS.filter((app) => app !== current);
}
/** Absolute SSO consume URL on `app`, with optional post-login path. */
function ssoConsumeUrl(app, locale, nextPath = "/") {
    const next = encodeURIComponent(nextPath.startsWith("/") ? nextPath : `/${nextPath}`);
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
async function appCheckHeaders() {
    const headers = {
        "Content-Type": "application/json",
    };
    const appCheck = (0, firebase_client_1.getFirebaseAppCheck)();
    if (!appCheck)
        return headers;
    try {
        headers["x-firebase-appcheck"] = (await (0, app_check_1.getToken)(appCheck, false)).token;
    }
    catch {
        // Optional when App Check is not enforced locally.
    }
    return headers;
}
async function buildSsoHandoffUrl(consumeUrl, idToken) {
    const res = await fetch("/api/auth/create-sso-handoff", {
        method: "POST",
        headers: await appCheckHeaders(),
        body: JSON.stringify({ idToken }),
    });
    if (!res.ok) {
        const payload = (await res.json().catch(() => null));
        throw new Error(payload?.error ?? `handoff failed (${res.status})`);
    }
    const data = (await res.json());
    if (!data.code || data.code.length < 32) {
        throw new Error("handoff code missing");
    }
    return handoffUrlWithCode(consumeUrl, data.code);
}
function takeHandoffCode() {
    if (typeof window === "undefined")
        return null;
    try {
        const stashed = sessionStorage.getItem(SSO_CODE_STASH_KEY);
        if (stashed && stashed.length >= 32)
            return stashed;
    }
    catch {
        // ignore
    }
    const url = new URL(window.location.href);
    let dirty = false;
    if (url.searchParams.has("ht")) {
        url.searchParams.delete("ht");
        dirty = true;
    }
    const fromQuery = url.searchParams.get("hc");
    if (fromQuery && fromQuery.length >= 32) {
        try {
            sessionStorage.setItem(SSO_CODE_STASH_KEY, fromQuery);
        }
        catch {
            // ignore
        }
        url.searchParams.delete("hc");
        dirty = true;
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
        return fromQuery;
    }
    const hash = window.location.hash.replace(/^#/, "");
    if (hash.includes("idToken=")) {
        dirty = true;
        const { pathname, search } = window.location;
        window.history.replaceState(null, "", `${pathname}${search}`);
    }
    else if (dirty) {
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
    return null;
}
function markSsoAttempted() {
    try {
        sessionStorage.setItem(SSO_ATTEMPT_KEY, "1");
    }
    catch {
        // ignore
    }
}
function hasSsoAttempted() {
    try {
        return sessionStorage.getItem(SSO_ATTEMPT_KEY) === "1";
    }
    catch {
        return false;
    }
}
function clearSsoAttempt() {
    try {
        sessionStorage.removeItem(SSO_ATTEMPT_KEY);
        sessionStorage.removeItem(SSO_CODE_STASH_KEY);
        sessionStorage.removeItem("pulse_sso_ht");
    }
    catch {
        // ignore
    }
}
function logoutCascadeUrl(app, locale, nextUrl) {
    return `${appBaseUrl(app)}/${locale}/auth/logout?next=${encodeURIComponent(nextUrl)}`;
}
function isAllowedLogoutNext(url) {
    try {
        if (url.startsWith("/") && !url.startsWith("//"))
            return true;
        const parsed = new URL(url);
        const allowed = new Set([
            new URL(pulseWebUrl()).origin,
            new URL(studioWebUrl()).origin,
            new URL(adminWebUrl()).origin,
        ]);
        return allowed.has(parsed.origin);
    }
    catch {
        return false;
    }
}
