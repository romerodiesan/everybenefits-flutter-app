import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import {
  buildContentSecurityPolicy,
  shouldIncludeEmulatorCsp,
} from "@pulse/shared";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const studioOrigin =
  process.env.NEXT_PUBLIC_STUDIO_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";

const emulatorHost =
  process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST?.trim() ||
  process.env.FIREBASE_EMULATOR_HOST?.trim() ||
  "127.0.0.1";

const useEmulators =
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

const contentSecurityPolicy = buildContentSecurityPolicy({
  includeEmulators: shouldIncludeEmulatorCsp({
    useFirebaseEmulators: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS,
    nodeEnv: process.env.NODE_ENV,
  }),
  emulatorHosts: emulatorHost,
  includeLottie: false,
  includeAnalytics: true,
  includeMaps: true,
  // Dev/HMR may need eval; production keeps it off.
  allowUnsafeEval: process.env.NODE_ENV !== "production",
});

const securityHeaders = [
  // origin-when-cross-origin keeps OAuth/Auth iframe relay working better than no-referrer.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Allow Google/Firebase auth popups to close themselves without COOP blocking.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const storageImagePatterns = [
  {
    protocol: "https" as const,
    hostname: "firebasestorage.googleapis.com",
  },
  {
    protocol: "https" as const,
    hostname: "*.firebasestorage.app",
  },
  {
    protocol: "https" as const,
    hostname: "*.appspot.com",
  },
  {
    protocol: "https" as const,
    hostname: "lh3.googleusercontent.com",
  },
];

const emulatorImagePatterns = useEmulators
  ? Array.from(
      new Set([emulatorHost, "127.0.0.1", "localhost", "10.0.0.77"]),
    ).map((hostname) => ({
      protocol: "http" as const,
      hostname,
      port: "9199",
      pathname: "/**" as const,
    }))
  : [];

const nextConfig: NextConfig = {
  // Keep Firebase out of the RSC/Turbopack CJS interop path (avoids
  // "require is not defined" when client modules are SSR'd).
  serverExternalPackages: ["firebase", "@firebase/app", "@firebase/auth"],
  transpilePackages: ["@pulse/shared", "@pulse/firebase-web", "@pulse/chrome", "@pulse/sso"],
  experimental: {
    optimizePackageImports: ["motion", "firebase", "@tanstack/react-query"],
    // Turbopack scope-hoisting TDZ with Zod 4 (z.string().datetime() →
    // "Cannot access 'h' before initialization"). Keep off until fixed upstream.
    // https://github.com/vercel/next.js/issues/82723
    turbopackScopeHoisting: false,
  },
  images: {
    // Emulator Storage serves http://<lan-ip>:9199/...; skip optimizer locally.
    unoptimized: useEmulators,
    remotePatterns: [...storageImagePatterns, ...emulatorImagePatterns],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:locale/studio",
        destination: `${studioOrigin}/:locale`,
        permanent: false,
      },
      {
        source: "/:locale/studio/paths/:pathId",
        destination: `${studioOrigin}/:locale/paths/:pathId`,
        permanent: false,
      },
      {
        source: "/:locale/studio/:courseId",
        destination: `${studioOrigin}/:locale/courses/:courseId`,
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
