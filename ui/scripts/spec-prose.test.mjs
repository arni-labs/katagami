// Spec fields (philosophy, tokens, rules, layout_principles, guidance,
// imagery_direction, generative_canvas) hold EITHER structured JSON or prose,
// and most contributor-authored languages store prose. Every consumer used to
// read parseJson()'s null as "field absent", which blanked the spec panels and
// silently dropped whole sections from the published KATAGAMI.MD / DESIGN.md.
// These vectors pin both halves: the parser and what the panel/exports emit.
//
// Run: node ui/scripts/spec-prose.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { transform } from "sucrase";

const here = path.dirname(fileURLToPath(import.meta.url));
const uiRoot = path.join(here, "..");
const nodeRequire = createRequire(path.join(uiRoot, "package.json"));

// spec-panel.tsx is a server component: load the real modules through sucrase
// and stub only the leaves that need a browser or a Next.js request context.
const STUBS = {
  "next/cache": { unstable_cache: (fn) => fn },
  "./spec-actions": { SpecActions: () => null },
  "lucide-react": new Proxy({}, { get: () => () => null }),
};

function resolveModule(specifier, fromFile) {
  if (specifier in STUBS) return { stub: STUBS[specifier] };

  let base;
  if (specifier.startsWith("@/")) base = path.join(uiRoot, "src", specifier.slice(2));
  else if (specifier.startsWith(".")) base = path.resolve(path.dirname(fromFile), specifier);
  else return { external: nodeRequire(specifier) };

  for (const ext of ["", ".ts", ".tsx", ".json", "/index.ts"]) {
    const candidate = `${base}${ext}`;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return { file: candidate };
    }
  }
  throw new Error(`cannot resolve ${specifier} from ${fromFile}`);
}

const moduleCache = new Map();

function loadModule(file) {
  if (moduleCache.has(file)) return moduleCache.get(file);

  if (file.endsWith(".json")) {
    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    moduleCache.set(file, json);
    return json;
  }

  const { code } = transform(fs.readFileSync(file, "utf8"), {
    transforms: ["typescript", "jsx", "imports"],
    jsxRuntime: "automatic",
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

const { parseSpecField } = loadModule(path.join(uiRoot, "src/lib/odata.ts"));
const { SpecPanel, katagamiSpecToMarkdown, designMdToMarkdown } = loadModule(
  path.join(uiRoot, "src/components/spec-panel.tsx"),
);
const { renderToStaticMarkup } = nodeRequire("react-dom/server");

let fails = 0;
const check = (name, fn) => {
  try {
    fn();
  } catch (err) {
    fails += 1;
    console.error(`FAIL ${name}: ${err.message}`);
  }
};

// ── parseSpecField ────────────────────────────────────────────────

check("structured object → data", () => {
  const field = parseSpecField('{"summary":"Quiet."}');
  assert.deepEqual(field.data, { summary: "Quiet." });
  assert.equal(field.prose, null);
});

check("already-parsed object → data", () => {
  const field = parseSpecField({ summary: "Quiet." });
  assert.deepEqual(field.data, { summary: "Quiet." });
  assert.equal(field.prose, null);
});

check("array → prose, never data", () => {
  // Every section view reads named keys off `data` (summary, values, do/dont),
  // so returning an array here satisfied the structured branch and then
  // rendered nothing. Arrays are real content: flatten them to readable prose.
  const field = parseSpecField('["a","b"]');
  assert.equal(field.data, null);
  assert.equal(field.prose, "a, b");
});

check("primitives → prose, never dropped", () => {
  assert.equal(parseSpecField("42").prose, "42");
  assert.equal(parseSpecField("true").prose, "true");
  assert.equal(parseSpecField(42).prose, "42");
  assert.equal(parseSpecField(true).prose, "true");
});

check("prose → trimmed prose", () => {
  const field = parseSpecField("  Restraint over ornament.\n");
  assert.equal(field.data, null);
  assert.equal(field.prose, "Restraint over ornament.");
});

check("JSON-quoted prose → decoded prose", () => {
  const field = parseSpecField('"Restraint over ornament."');
  assert.equal(field.data, null);
  assert.equal(field.prose, "Restraint over ornament.");
});

check("JSON primitive → prose, never blank", () => {
  assert.deepEqual(parseSpecField("42"), { data: null, prose: "42" });
  assert.deepEqual(parseSpecField("true"), { data: null, prose: "true" });
});

check("absent / empty → neither", () => {
  for (const raw of [undefined, null, "", "   ", "\n"]) {
    assert.deepEqual(
      parseSpecField(raw),
      { data: null, prose: null },
      `raw ${JSON.stringify(raw)}`,
    );
  }
});

// ── Panel rendering ───────────────────────────────────────────────

const PROSE_PROPS = {
  languageId: "en-test",
  name: "Prosaic",
  slug: "prosaic",
  philosophy: "Restraint over ornament; the page should feel unhurried.",
  tokens: "Ink black on bone white, one vermilion accent, 8px rhythm.",
  rules: "Never centre body copy. Never stack more than two weights.",
  layout: "A twelve-column grid with a wide outer margin.",
  guidance: "Lead with the artefact, then the explanation.",
  imageryDirection: "Photographs are documentary, never staged.",
  generativeCanvas: "Grain and ink bleed, no gradients.",
};

check("prose panel renders every field, no empty state", () => {
  const html = renderToStaticMarkup(
    SpecPanel({ ...PROSE_PROPS, showActions: false }),
  );
  for (const [field, text] of Object.entries(PROSE_PROPS)) {
    if (["languageId", "name", "slug"].includes(field)) continue;
    assert.ok(html.includes(text), `${field} prose missing from panel`);
  }
  assert.ok(!html.includes("not set"), "prose panel must not show the empty state");
});

check("absent fields still render the empty state", () => {
  const html = renderToStaticMarkup(
    SpecPanel({ languageId: "en-test", name: "Bare", showActions: false }),
  );
  assert.ok(html.includes("not set"), "missing fields must still read as not set");
});

check("structured philosophy renders visual character", () => {
  const html = renderToStaticMarkup(
    SpecPanel({
      languageId: "en-test",
      name: "Structured",
      philosophy: JSON.stringify({
        summary: "Quiet.",
        values: ["restraint"],
        anti_values: ["clutter"],
        visual_character: ["papery", "hand-set"],
        lineage: "Swiss school",
      }),
      showActions: false,
    }),
  );
  assert.ok(html.includes("visual character"), "visual character section missing");
  assert.ok(html.includes("papery"), "visual character values missing");
  assert.ok(html.includes("hand-set"), "visual character values missing");
});

// ── Markdown exports ──────────────────────────────────────────────

check("KATAGAMI.MD keeps prose sections", () => {
  const md = katagamiSpecToMarkdown(PROSE_PROPS);
  for (const heading of [
    "## Philosophy",
    "## Tokens",
    "## Rules",
    "## Layout",
    "## Guidance",
    "## Imagery Direction",
    "## Generative Canvas",
  ]) {
    assert.ok(md.includes(heading), `${heading} missing`);
  }
  for (const text of [
    PROSE_PROPS.philosophy,
    PROSE_PROPS.tokens,
    PROSE_PROPS.rules,
    PROSE_PROPS.layout,
    PROSE_PROPS.guidance,
    PROSE_PROPS.imageryDirection,
    PROSE_PROPS.generativeCanvas,
  ]) {
    assert.ok(md.includes(text), `prose body missing: ${text}`);
  }
});

check("DESIGN.md keeps prose sections", () => {
  const md = designMdToMarkdown(PROSE_PROPS);
  for (const heading of [
    "## Overview",
    "## Tokens",
    "## Layout",
    "## Components",
    "## Guidance",
    "## Imagery Direction",
    "## Generative Canvas",
  ]) {
    assert.ok(md.includes(heading), `${heading} missing`);
  }
  for (const text of [
    PROSE_PROPS.philosophy,
    PROSE_PROPS.tokens,
    PROSE_PROPS.rules,
    PROSE_PROPS.layout,
    PROSE_PROPS.guidance,
    PROSE_PROPS.imageryDirection,
    PROSE_PROPS.generativeCanvas,
  ]) {
    assert.ok(md.includes(text), `prose body missing: ${text}`);
  }
});

check("structured exports keep their shape", () => {
  const structured = {
    languageId: "en-test",
    name: "Structured",
    philosophy: JSON.stringify({
      summary: "Quiet.",
      values: ["restraint"],
      anti_values: ["clutter"],
      visual_character: ["papery"],
      lineage: "Swiss school",
    }),
    tokens: JSON.stringify({
      colors: { primary: "#111111", surface: "#ffffff", text: "#111111" },
      typography: { heading_font: "Inter", body_font: "Inter", base_size: "17px" },
    }),
    rules: JSON.stringify({ do: ["keep it quiet"], dont: ["shout"] }),
    layout: JSON.stringify({ grid: "12 columns" }),
    guidance: JSON.stringify({ do: ["lead with the artefact"] }),
  };

  const katagami = katagamiSpecToMarkdown(structured);
  assert.ok(katagami.includes("### Values"), "values list missing");
  assert.ok(katagami.includes("### Visual Character"), "visual character missing");
  assert.ok(katagami.includes("| primary | `#111111` |"), "colors table missing");
  assert.ok(katagami.includes("### Lineage"), "lineage missing");
  assert.ok(!katagami.includes("[object Object]"), "structured data leaked as [object Object]");

  const designMd = designMdToMarkdown(structured);
  assert.ok(designMd.includes("## Overview"), "overview missing");
  assert.ok(designMd.includes("| primary | `#111111` |"), "colors table missing");
  assert.ok(designMd.includes("## Do's and Don'ts"), "guidance list missing");
  assert.ok(!designMd.includes("## Tokens"), "structured tokens must stay in front matter");
});

check("prose philosophy replaces the boilerplate overview line", () => {
  const md = designMdToMarkdown({ name: "Prosaic", philosophy: PROSE_PROPS.philosophy });
  assert.ok(md.includes(PROSE_PROPS.philosophy), "philosophy prose missing");
  assert.ok(
    !md.includes("is an agent-curated design language from Katagami."),
    "boilerplate must not replace real prose",
  );
});

// ── search summaries ────────────────────────────────────────────────────────
// summarize() in search.ts is the other consumer of parseSpecField, and it
// shipped untested because search.ts is `server-only` and loads the embedding
// model. The pure half lives in spec-summary.ts so these vectors can run.
const { specSummary, oneLine, MAX_SUMMARY_CHARS } = loadModule(
  path.join(uiRoot, "src/lib/spec-summary.ts"),
);

check("search summary uses a structured summary field", () => {
  const out = specSummary(JSON.stringify({ summary: "Quiet, papery, precise." }));
  assert.equal(out, "Quiet, papery, precise.");
});

check("search summary falls back to prose", () => {
  const out = specSummary(PROSE_PROPS.philosophy);
  assert.ok(out, "prose philosophy produced no summary");
  assert.ok(typeof out === "string" && out.length > 0);
});

check("search summary never throws on a non-string summary", () => {
  // A contributor-authored {"summary": 42} used to reach 42.trim() and take
  // down /api/search for that query instead of falling through.
  for (const bad of [42, true, null, ["a"], { nested: 1 }]) {
    const out = specSummary(JSON.stringify({ summary: bad }));
    assert.ok(
      out === null || typeof out === "string",
      `threw or leaked on ${JSON.stringify(bad)}`,
    );
  }
});

check("search summary clamps a long prose philosophy to one line", () => {
  const long = "Considered restraint in every measure and margin ".repeat(80);
  const out = specSummary(long);
  assert.ok(out.length <= MAX_SUMMARY_CHARS + 1, `summary was ${out.length} chars`);
  assert.ok(!out.includes("\n"), "summary leaked a newline");
});

check("search summary keeps a short first sentence intact", () => {
  assert.equal(oneLine("Quiet. Then louder."), "Quiet.");
  assert.equal(oneLine("   "), null);
});

check("array and primitive spec fields become prose, not blanks", () => {
  // typeof [] === "object", so an array used to satisfy the structured branch
  // and then render nothing — the blank panel this whole file exists to stop.
  assert.equal(specSummary(JSON.stringify(["Quiet", "Restrained"])), "Quiet, Restrained");
  assert.equal(specSummary(JSON.stringify(42)), "42");
  const { data, prose } = parseSpecField(JSON.stringify(["Quiet", "Restrained"]));
  assert.equal(data, null, "an array must not be handed back as record data");
  assert.equal(prose, "Quiet, Restrained");
});

if (fails) {
  console.error(`\n${fails} test(s) FAILED`);
  process.exit(1);
}
console.log("spec prose: all vectors pass");
