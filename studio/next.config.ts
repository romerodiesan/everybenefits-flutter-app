import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import {
  buildContentSecurityPolicy,
  shouldIncludeEmulatorCsp,
} from "@pulse/shared";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const contentSecurityPolicy = buildContentSecurityPolicy({
  includeEmulators: shouldIncludeEmulatorCsp({
    useFirebaseEmulators: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS,
    nodeEnv: process.env.NODE_ENV,
  }),
  // Studio has no DotLottie / GA runtime, but keep Analytics hosts for parity
  // with shared Firebase project tooling and avoid drift with Pulse CSP.
  includeLottie: false,
  includeAnalytics: true,
});

const securityHeaders = [
  // origin-when-cross-origin keeps OAuth/Auth iframe relay working better than no-referrer.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
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
  serverExternalPackages: ["firebase", "@firebase/app", "@firebase/auth"],
  transpilePackages: ["@pulse/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
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
