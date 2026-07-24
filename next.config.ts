import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript errors are enforced at build time
};

// Sentry integration (optional — only if DSN is configured)
let config = nextConfig;
try {
  const { withSentryConfig } = require("@sentry/nextjs");
  if (process.env.SENTRY_DSN) {
    config = withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
      hideSourceMaps: true,
      widenClientFileUpload: true,
      disableLogger: true,
    });
  }
} catch {
  // @sentry/nextjs not available or DSN not configured
}

export default config;
