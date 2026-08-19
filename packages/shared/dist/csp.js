"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildContentSecurityPolicy = buildContentSecurityPolicy;
exports.shouldIncludeEmulatorCsp = shouldIncludeEmulatorCsp;
const origins_1 = require("./origins");
function join(...parts) {
    return parts.filter(Boolean).join(" ");
}
function normalizeEmulatorHosts(extra) {
    const base = ["127.0.0.1", "localhost"];
    const more = (Array.isArray(extra) ? extra : extra ? [extra] : [])
        .map((h) => h.trim())
        .filter(Boolean);
    return Array.from(new Set([...base, ...more]));
}
function emulatorHttpHosts(hosts, ports) {
    const out = [];
    for (const host of hosts) {
        for (const port of ports) {
            out.push(`http://${host}:${port}`);
        }
    }
    return out;
}
function emulatorWsHosts(hosts, ports) {
    const out = [];
    for (const host of hosts) {
        for (const port of ports) {
            out.push(`ws://${host}:${port}`);
        }
    }
    return out;
}
/**
 * Builds a single Content-Security-Policy header value.
 */
function buildContentSecurityPolicy(options = {}) {
    const includeEmulators = options.includeEmulators ?? false;
    const includeLottie = options.includeLottie ?? true;
    const includeAnalytics = options.includeAnalytics ?? true;
    const includeMaps = options.includeMaps ?? false;
    const hosts = normalizeEmulatorHosts(options.emulatorHosts);
    // Auth 9099, Firestore 8080, RTDB 9000, Storage 9199, Functions 5001, Emulator UI 4000
    const emulatorConnect = includeEmulators
        ? join(...emulatorHttpHosts(hosts, [4000, 5001, 8080, 9099, 9000, 9199]), ...emulatorWsHosts(hosts, [8080, 9000]))
        : "";
    // RTDB .lp JSONP scripts + disconnect iframe (emulator).
    const emulatorRtdbScriptFrame = includeEmulators
        ? join(...emulatorHttpHosts(hosts, [9000]))
        : "";
    // Auth popup/iframe relay (emulator).
    const emulatorAuthFrame = includeEmulators
        ? join(...emulatorHttpHosts(hosts, [9099]))
        : "";
    // Storage download URLs in <img> / <video> against the emulator.
    const emulatorStorageMedia = includeEmulators
        ? join(...emulatorHttpHosts(hosts, [9199]))
        : "";
    const analyticsScript = includeAnalytics
        ? join("https://www.googletagmanager.com", "https://*.googletagmanager.com", "https://www.google-analytics.com", "https://ssl.google-analytics.com", "https://*.google-analytics.com")
        : "";
    const analyticsImg = includeAnalytics
        ? join("https://www.google-analytics.com", "https://www.googletagmanager.com", "https://*.google-analytics.com", "https://*.googletagmanager.com")
        : "";
    const analyticsConnect = includeAnalytics
        ? join("https://www.googletagmanager.com", "https://www.google-analytics.com", "https://analytics.google.com", "https://*.google-analytics.com", "https://*.analytics.google.com")
        : "";
    const lottieConnect = includeLottie
        ? join("https://lottie.host", "https://*.lottiefiles.com")
        : "";
    const mapsScript = includeMaps
        ? join("https://maps.googleapis.com", "https://maps.gstatic.com")
        : "";
    const mapsImg = includeMaps
        ? join("https://maps.gstatic.com", "https://maps.googleapis.com", "data:")
        : "";
    const mapsConnect = includeMaps
        ? join("https://maps.googleapis.com", "https://places.googleapis.com", "https://addressvalidation.googleapis.com")
        : "";
    const scriptSrc = join("script-src", "'self'", 
    // Next.js still injects inline bootstraps; prefer nonces when the host
    // framework supports them end-to-end (see buildContentSecurityPolicy opts).
    options.scriptNonce
        ? `'nonce-${options.scriptNonce}'`
        : "'unsafe-inline'", 
    // eval is required by some emulator / HMR tooling; omit in production
    // unless explicitly re-enabled.
    options.allowUnsafeEval === true ? "'unsafe-eval'" : null, "'wasm-unsafe-eval'", "blob:", 
    // Google Sign-In / Firebase helpers / reCAPTCHA
    "https://www.gstatic.com", "https://ssl.gstatic.com", "https://www.google.com", "https://www.recaptcha.net", "https://apis.google.com", "https://accounts.google.com", mapsScript, 
    // RTDB long-poll JSONP (production + emulator)
    "https://*.firebaseio.com", emulatorRtdbScriptFrame, analyticsScript);
    const styleSrc = join("style-src", "'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://www.gstatic.com");
    const imgSrc = join("img-src", "'self'", "data:", "blob:", "https://firebasestorage.googleapis.com", "https://lh3.googleusercontent.com", "https://www.gstatic.com", "https://ssl.gstatic.com", 
    // Auth / reCAPTCHA pixel (cleardot.gif)
    "https://www.google.com", "https://www.recaptcha.net", mapsImg, emulatorStorageMedia, analyticsImg);
    const fontSrc = join("font-src", "'self'", "data:", "https://fonts.gstatic.com", "https://www.gstatic.com");
    const mediaSrc = join("media-src", "'self'", "blob:", "https://firebasestorage.googleapis.com", emulatorStorageMedia);
    // FCM messaging SW importScripts from gstatic.
    const workerSrc = join("worker-src", "'self'", "blob:", "https://www.gstatic.com");
    const frameExtras = join("https://www.google.com", "https://www.recaptcha.net", "https://recaptcha.google.com", "https://accounts.google.com", "https://apis.google.com", "https://*.firebaseapp.com", "https://*.google.com", 
    // RTDB long-poll disconnect iframe
    "https://*.firebaseio.com", emulatorRtdbScriptFrame, emulatorAuthFrame);
    const childSrc = join("child-src", "'self'", "blob:", frameExtras);
    const frameSrc = join("frame-src", "'self'", frameExtras);
    const siblingOrigins = (0, origins_1.productionAppOriginsCsp)();
    const connectSrc = join("connect-src", "'self'", siblingOrigins, "https://*.googleapis.com", "https://*.firebaseio.com", "wss://*.firebaseio.com", "https://*.cloudfunctions.net", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://firebaseinstallations.googleapis.com", "https://content-firebaseappcheck.googleapis.com", "https://www.google.com", "https://accounts.google.com", "https://apis.google.com", "https://www.recaptcha.net", analyticsConnect, lottieConnect, mapsConnect, emulatorConnect);
    return [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self' https://accounts.google.com " + siblingOrigins,
        scriptSrc,
        styleSrc,
        imgSrc,
        fontSrc,
        mediaSrc,
        workerSrc,
        childSrc,
        frameSrc,
        connectSrc,
    ].join("; ");
}
/**
 * Whether Next configs should include emulator hosts in CSP.
 * Pass env explicitly so this package stays Node-types free.
 */
function shouldIncludeEmulatorCsp(env) {
    return (env.useFirebaseEmulators === "true" || env.nodeEnv !== "production");
}
