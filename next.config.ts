import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
    // Abstract files are uploaded through a Server Action (10 MB max per file).
    serverActions: { bodySizeLimit: "12mb" },
    // /admin requests pass through proxy.ts, which buffers the body.
    proxyClientMaxBodySize: "12mb",
  },
  // Parsers run on the server only; load them from node_modules as-is.
  serverExternalPackages: ["unpdf", "mammoth", "word-extractor"],
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
