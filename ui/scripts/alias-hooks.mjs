// Node does not read tsconfig's path aliases, so app modules that import "@/…"
// cannot be loaded by a test without help. This maps that prefix onto src/ the
// same way the bundler does, which is what lets a test run the real reader
// rather than a copy of it.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = new URL("../src/", import.meta.url);
const TRIED = ["", ".ts", ".tsx", ".mjs", ".js", "/index.ts", "/index.tsx"];

/** The bundler imports JSON without an attribute; Node requires one. */
function withJsonAttribute(resolved) {
  if (!resolved?.url?.endsWith(".json")) return resolved;
  return { ...resolved, format: "json", importAttributes: { type: "json" }, shortCircuit: true };
}

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const base = new URL(specifier.slice(2), SRC);
    for (const suffix of TRIED) {
      const candidate = new URL(base.href + suffix);
      if (existsSync(fileURLToPath(candidate))) {
        return withJsonAttribute(await next(pathToFileURL(fileURLToPath(candidate)).href, context));
      }
    }
  }
  try {
    return withJsonAttribute(await next(specifier, context));
  } catch (error) {
    // `next` ships no exports map, so a subpath like "next/cache" only
    // resolves with its extension spelled out. The bundler adds it; here we do.
    if (error?.code === "ERR_MODULE_NOT_FOUND" && /^[^./]/.test(specifier)) {
      for (const suffix of [".js", ".mjs", ".cjs"]) {
        try {
          return withJsonAttribute(await next(specifier + suffix, context));
        } catch {
          // try the next extension
        }
      }
    }
    throw error;
  }
}
