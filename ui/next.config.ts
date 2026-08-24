import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // transformers.js (taste embeddings) ships native/onnx assets that must
  // not be bundled — load it from node_modules at runtime.
  serverExternalPackages: ["@xenova/transformers"],
  // Vercel's file tracing misses the dlopen'd onnxruntime shared library, so
  // the embed routes died with "libonnxruntime.so.1.14.0: cannot open shared
  // object file" in production. Pin the linux-x64 binding into every function
  // that embeds a query in-process: the taste API routes, /api/search, AND the
  // pages whose Server Actions run meaning search (actions bundle into the
  // page's function, so the page route is the tracing key). Missing pins here
  // were the launch bug where meaning search returned nothing in every lane
  // while /api/taste/embed kept working.
  outputFileTracingIncludes: {
    "/api/taste/embed": ["node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**"],
    "/api/taste/vectors": ["node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**"],
    "/api/search": ["node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**"],
    "/": ["node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**"],
    "/palettes": ["node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**"],
    "/art-styles": ["node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**"],
  },
  images: {
    // Optimized variants are keyed by an immutable file-id source (the cache-bust
    // query is stripped before optimizing), so they never need re-optimizing.
    // Cache them long so the image-heavy art-styles gallery serves /_next/image
    // HITs instead of re-optimizing hundreds of images on every cold load.
    minimumCacheTTL: 2592000, // 30 days
    // Google account avatars (header chip, /account) — lh3/lh4/… subdomains.
    remotePatterns: [
      { protocol: "https", hostname: "*.googleusercontent.com" },
      // Gallery cards (language + art-style). Without these hosts next/image
      // refuses the URL and the card downloads the original 1024–1536px file.
      { protocol: "https", hostname: "assets.katagami.ai" },
      { protocol: "https", hostname: "temperpaw-assets.katagami.ai" },
    ],
  },
};

export default nextConfig;
