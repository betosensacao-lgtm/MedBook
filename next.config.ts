import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript errors are enforced at build time

  // agent-core and its `jose` dependency ship ESM only. Listing them here also
  // tells next/jest to run them through the SWC transform, which Jest needs in
  // order to require them from a CommonJS test environment.
  transpilePackages: ["@betosensacao-lgtm/agent-core", "jose"],
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
