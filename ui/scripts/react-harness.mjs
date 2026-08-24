import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "sucrase";
import { Window } from "happy-dom";

const here = dirname(fileURLToPath(import.meta.url));
const uiRoot = resolve(here, "..");
const nodeRequire = createRequire(resolve(uiRoot, "package.json"));

function NextImageStub(props) {
  const React = nodeRequire("react");
  const { src, alt, className, onLoad, onError, loading, priority } = props;
  return React.createElement("img", {
    src,
    alt,
    className,
    onLoad,
    onError,
    loading: loading ?? (priority ? "eager" : "lazy"),
  });
}

const STUBS = {
  "next/cache": { unstable_cache: (fn) => fn },
  "next/image": NextImageStub,
  "@/lib/odata": {
    getFileUrl: (id) => `/api/file/${id}`,
  },
};

function resolveModule(specifier, fromFile) {
  if (specifier in STUBS) return { stub: STUBS[specifier] };

  let base;
  if (specifier.startsWith("@/")) base = resolve(uiRoot, "src", specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(dirname(fromFile), specifier);
  else return { external: nodeRequire(specifier) };

  for (const ext of ["", ".ts", ".tsx", ".json", "/index.ts"]) {
    const candidate = `${base}${ext}`;
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return { file: candidate };
    }
  }
  throw new Error(`cannot resolve ${specifier} from ${fromFile}`);
}

const moduleCache = new Map();

export function loadModule(file) {
  if (moduleCache.has(file)) return moduleCache.get(file);

  if (file.endsWith(".json")) {
    const json = JSON.parse(readFileSync(file, "utf8"));
    moduleCache.set(file, json);
    return json;
  }

  const { code } = transform(readFileSync(file, "utf8"), {
    transforms: ["typescript", "jsx", "imports"],
    jsxRuntime: "automatic",
    production: true,
    filePath: file,
  });
  const mod = { exports: {} };
  moduleCache.set(file, mod.exports);
  const req = (specifier) => {
    const resolved = resolveModule(specifier, file);
    if (resolved.stub) return resolved.stub;
    if (resolved.external) return resolved.external;
    return loadModule(resolved.file);
  };
  new Function("require", "module", "exports", code)(req, mod, mod.exports);
  return mod.exports;
}

export function loadUiModule(relPath) {
  return loadModule(resolve(uiRoot, relPath));
}

let domReady = false;

export function ensureDom() {
  if (domReady) return;
  const window = new Window({ url: "https://katagami.ai/" });
  const { document } = window;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.window = window;
  globalThis.document = document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.Element = window.Element;
  globalThis.Node = window.Node;
  globalThis.Image = window.Image;
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  domReady = true;
}

export function createFlush() {
  ensureDom();
  const React = nodeRequire("react");
  const { flushSync } = nodeRequire("react-dom");
  const { createRoot } = nodeRequire("react-dom/client");
  // Vercel prebuild sets NODE_ENV=production; React's production CJS
  // build does not export `act`. flushSync is the production flush.
  const reactAct = typeof React.act === "function" ? React.act : (fn) => fn();
  function flush(fn) {
    return reactAct(() => flushSync(fn));
  }
  return { React, createRoot, flush };
}
