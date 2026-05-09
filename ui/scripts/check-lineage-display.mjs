import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

import ts from "typescript";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
const moduleCache = new Map();

function loadTsModule(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  const absolutePath = path.join(root, normalized);
  if (moduleCache.has(absolutePath)) return moduleCache.get(absolutePath).exports;

  const source = fs.readFileSync(absolutePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: absolutePath,
  }).outputText;

  const mod = { exports: {} };
  moduleCache.set(absolutePath, mod);

  const localRequire = (specifier) => {
    if (specifier.startsWith("@/")) {
      return loadTsModule(path.join("src", specifier.slice(2)));
    }
    if (specifier.startsWith(".")) {
      return loadTsModule(path.join(path.dirname(normalized), specifier));
    }
    return require(specifier);
  };

  vm.runInNewContext(
    output,
    {
      exports: mod.exports,
      module: mod,
      process,
      require: localRequire,
    },
    { filename: absolutePath },
  );

  return mod.exports;
}

const {
  lineageMetadata,
  lineageNodesFromLanguages,
  normalizeDesignLanguageRow,
} = loadTsModule("src/lib/odata.ts");

const parent = normalizeDesignLanguageRow({
  "@odata.id": "http://localhost:3500/tdata/DesignLanguages('en-parent')",
  Id: "en-parent",
  Status: "Published",
  Name: "WhimsiCollage Storybook",
  LineageType: "original",
  GenerationNumber: 0,
  ParentIds: "[]",
  ForkCount: 1,
});

const child = normalizeDesignLanguageRow({
  "@odata.id": "http://localhost:3500/tdata/DesignLanguages('en-child')",
  Id: "en-child",
  Status: "Published",
  Name: "Jelly Dew Story UI",
  LineageType: "evolution",
  GenerationNumber: 1,
  ParentIds: '["en-parent"]',
});

const plain = (value) => JSON.parse(JSON.stringify(value));

assert.equal(child.fields.lineage_type, "evolution");
assert.equal(child.fields.generation_number, "1");
assert.equal(child.fields.parent_ids, '["en-parent"]');

assert.deepEqual(plain(lineageMetadata(child)), {
  lineageType: "evolution",
  generation: 1,
  parentIds: ["en-parent"],
});

const nodes = lineageNodesFromLanguages([child, parent]);
assert.deepEqual(plain(nodes.find((node) => node.id === "en-child")), {
  id: "en-child",
  name: "Jelly Dew Story UI",
  status: "Published",
  lineageType: "evolution",
  generation: 1,
  parentIds: ["en-parent"],
});

assert.equal(nodes.find((node) => node.id === "en-parent")?.generation, 0);
