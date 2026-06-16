import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "*.fbcdn.net",
      },
      {
        protocol: "https",
        hostname: "*.backblazeb2.com",
      },
    ],
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // For Better Stack, we don't need/want sourcemaps uploaded to Sentry's servers
  sourcemaps: {
    disable: true,
  },
  // Suppress Sentry analyzer warnings
  silent: true,
});
