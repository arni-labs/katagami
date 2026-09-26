import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only. KATAGAMI_DEV_ORIGINS (comma-separated hosts) lets a phone on the same network load the dev
  // server's scripts, e.g. KATAGAMI_DEV_ORIGINS=10.1.32.238 to review on a real device.
  allowedDevOrigins: ["127.0.0.1", ...(process.env.KATAGAMI_DEV_ORIGINS ?? "").split(",").map((h) => h.trim()).filter(Boolean)],
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
    "/gallery": ["node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**"],
    "/palettes": ["node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**"],
    "/art-styles": ["node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**"],
    // The owner-only code styles are read from disk by their route, so ship the folder with it.
    "/code-styles/[...path]": ["code-styles/**"],
  },
  // The sheet at "/" is the library now. These index pages each showed a slice
  // of it and are no longer offered to anyone: the code stays in the tree (a
  // reader finds it where its route used to be) and the address keeps working
  // for old links and bookmarks by landing on the sheet. Temporary on purpose —
  // a 308 would be cached in browsers for years, and this is a product call
  // that may well be taken back. Only the bare index redirects: every detail
  // page under these prefixes (/palettes/<id>, /art-styles/<id>, /studio/BRIEF.md)
  // is untouched, because the sheet's own "Open" button points at them.
  async redirects() {
    return ["/gallery", "/ask", "/atlas", "/palettes", "/art-styles", "/studio"].map((source) => ({
      source,
      destination: "/",
      permanent: false,
    }));
  },
  // The read MCP has two doors on one server: /mcp requires a bearer (the 401 is
  // what lets a host draw its connect card) and /mcp/open never asks for one and
  // serves the visitor shelf. One route file, so the two cannot drift apart.
  async rewrites() {
    return [{ source: "/mcp/open", destination: "/mcp?door=open" }];
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
