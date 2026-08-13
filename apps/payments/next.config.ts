import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import {
  buildContentSecurityPolicy,
  shouldIncludeEmulatorCsp,
} from "@pulse/shared";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

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
  // Admin has no DotLottie / GA runtime, but keep Analytics hosts for parity
  // with shared Firebase project tooling and avoid drift with Pulse CSP.
  includeLottie: false,
  includeAnalytics: true,
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

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "firebase",
    "firebase-admin",
    "@firebase/app",
    "@firebase/auth",
  ],
  transpilePackages: ["@pulse/shared", "@pulse/firebase-web", "@pulse/chrome", "@pulse/sso"],
  experimental: {
    optimizePackageImports: ["motion", "firebase", "@tanstack/react-query"],
    // Turbopack scope-hoisting TDZ with Zod 4 (z.string().datetime() →
    // "Cannot access 'h' before initialization"). Keep off until fixed upstream.
    // https://github.com/vercel/next.js/issues/82723
    turbopackScopeHoisting: false,
  },
  images: {
    unoptimized: useEmulators,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "*.firebasestorage.app",
      },
      {
        protocol: "https",
        hostname: "*.appspot.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      ...(useEmulators
        ? [
            {
              protocol: "http" as const,
              hostname: emulatorHost,
              port: "9199",
              pathname: "/**" as const,
            },
            {
              protocol: "http" as const,
              hostname: "127.0.0.1",
              port: "9199",
              pathname: "/**" as const,
            },
            {
              protocol: "http" as const,
              hostname: "localhost",
              port: "9199",
              pathname: "/**" as const,
            },
          ]
        : []),
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
