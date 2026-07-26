import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const studioOrigin =
  process.env.NEXT_PUBLIC_STUDIO_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";

const nextConfig: NextConfig = {
  // Keep Firebase out of the RSC/Turbopack CJS interop path (avoids
  // "require is not defined" when client modules are SSR'd).
  serverExternalPackages: ["firebase", "@firebase/app", "@firebase/auth"],
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
