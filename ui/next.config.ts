import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // transformers.js (taste embeddings) ships native/onnx assets that must
  // not be bundled — load it from node_modules at runtime.
  serverExternalPackages: ["@xenova/transformers"],
  images: {
    // Optimized variants are keyed by an immutable file-id source (the cache-bust
    // query is stripped before optimizing), so they never need re-optimizing.
    // Cache them long so the image-heavy art-styles gallery serves /_next/image
    // HITs instead of re-optimizing hundreds of images on every cold load.
    minimumCacheTTL: 2592000, // 30 days
    // Google account avatars (header chip, /account) — lh3/lh4/… subdomains.
    remotePatterns: [
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
