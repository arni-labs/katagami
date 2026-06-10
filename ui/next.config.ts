import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // transformers.js (taste embeddings) ships native/onnx assets that must
  // not be bundled — load it from node_modules at runtime.
  serverExternalPackages: ["@xenova/transformers"],
};

export default nextConfig;
