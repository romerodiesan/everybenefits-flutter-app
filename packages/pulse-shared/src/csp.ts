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

function join(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function normalizeEmulatorHosts(extra?: string | string[]): string[] {
  const base = ["127.0.0.1", "localhost"];
  const more = (Array.isArray(extra) ? extra : extra ? [extra] : [])
    .map((h) => h.trim())
    .filter(Boolean);
  return Array.from(new Set([...base, ...more]));
}

function emulatorHttpHosts(hosts: string[], ports: number[]): string[] {
  const out: string[] = [];
  for (const host of hosts) {
    for (const port of ports) {
      out.push(`http://${host}:${port}`);
    }
  }
  return out;
}

function emulatorWsHosts(hosts: string[], ports: number[]): string[] {
  const out: string[] = [];
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
export function buildContentSecurityPolicy(
  options: CspBuildOptions = {},
): string {
  const includeEmulators = options.includeEmulators ?? false;
  const includeLottie = options.includeLottie ?? true;
  const includeAnalytics = options.includeAnalytics ?? true;
  const hosts = normalizeEmulatorHosts(options.emulatorHosts);

  // Auth 9099, Firestore 8080, RTDB 9000, Storage 9199, Functions 5001, Emulator UI 4000
  const emulatorConnect = includeEmulators
    ? join(
        ...emulatorHttpHosts(hosts, [4000, 5001, 8080, 9099, 9000, 9199]),
        ...emulatorWsHosts(hosts, [8080, 9000]),
      )
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
    ? join(
        "https://www.googletagmanager.com",
        "https://*.googletagmanager.com",
        "https://www.google-analytics.com",
        "https://ssl.google-analytics.com",
        "https://*.google-analytics.com",
      )
    : "";

  const analyticsImg = includeAnalytics
    ? join(
        "https://www.google-analytics.com",
        "https://www.googletagmanager.com",
        "https://*.google-analytics.com",
        "https://*.googletagmanager.com",
      )
    : "";

  const analyticsConnect = includeAnalytics
    ? join(
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com",
        "https://analytics.google.com",
        "https://*.google-analytics.com",
        "https://*.analytics.google.com",
      )
    : "";

  const lottieConnect = includeLottie
    ? join("https://lottie.host", "https://*.lottiefiles.com")
    : "";

  const scriptSrc = join(
    "script-src",
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "'wasm-unsafe-eval'",
    "blob:",
    // Google Sign-In / Firebase helpers / reCAPTCHA
    "https://www.gstatic.com",
    "https://ssl.gstatic.com",
    "https://www.google.com",
    "https://www.recaptcha.net",
    "https://apis.google.com",
    "https://accounts.google.com",
    // RTDB long-poll JSONP (production + emulator)
    "https://*.firebaseio.com",
    emulatorRtdbScriptFrame,
    analyticsScript,
  );

  const styleSrc = join(
    "style-src",
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
    "https://www.gstatic.com",
  );

  const imgSrc = join(
    "img-src",
    "'self'",
    "data:",
    "blob:",
    "https://firebasestorage.googleapis.com",
    "https://lh3.googleusercontent.com",
    "https://www.gstatic.com",
    "https://ssl.gstatic.com",
    // Auth / reCAPTCHA pixel (cleardot.gif)
    "https://www.google.com",
    "https://www.recaptcha.net",
    emulatorStorageMedia,
    analyticsImg,
  );

  const fontSrc = join(
    "font-src",
    "'self'",
    "data:",
    "https://fonts.gstatic.com",
    "https://www.gstatic.com",
  );

  const mediaSrc = join(
    "media-src",
    "'self'",
    "blob:",
    "https://firebasestorage.googleapis.com",
    emulatorStorageMedia,
  );

  // FCM messaging SW importScripts from gstatic.
  const workerSrc = join(
    "worker-src",
    "'self'",
    "blob:",
    "https://www.gstatic.com",
  );

  const frameExtras = join(
    "https://www.google.com",
    "https://www.recaptcha.net",
    "https://recaptcha.google.com",
    "https://accounts.google.com",
    "https://apis.google.com",
    "https://*.firebaseapp.com",
    "https://*.google.com",
    // RTDB long-poll disconnect iframe
    "https://*.firebaseio.com",
    emulatorRtdbScriptFrame,
    emulatorAuthFrame,
  );

  const childSrc = join("child-src", "'self'", "blob:", frameExtras);
  const frameSrc = join("frame-src", "'self'", frameExtras);

  const connectSrc = join(
    "connect-src",
    "'self'",
    "https://*.googleapis.com",
    "https://*.firebaseio.com",
    "wss://*.firebaseio.com",
    "https://*.cloudfunctions.net",
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://firebaseinstallations.googleapis.com",
    "https://content-firebaseappcheck.googleapis.com",
    "https://www.google.com",
    "https://accounts.google.com",
    "https://apis.google.com",
    "https://www.recaptcha.net",
    analyticsConnect,
    lottieConnect,
    emulatorConnect,
  );

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' https://accounts.google.com",
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
export function shouldIncludeEmulatorCsp(env: {
  useFirebaseEmulators?: string;
  nodeEnv?: string;
}): boolean {
  return (
    env.useFirebaseEmulators === "true" || env.nodeEnv !== "production"
  );
}
