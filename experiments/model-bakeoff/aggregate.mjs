#!/usr/bin/env node
// Aggregate the blind judge panel into the rubric scorecard.
//
//   node aggregate.mjs
//
// Reads judges/<judge-slug>.json (each scores entries A/B/C blind on the five
// rubric dimensions), maps A/B/C -> model via the stable blind order, DROPS each
// judge's score for its own entry (cross-model, self-excluded), and writes
// results.json for compare.html.

import { readFileSync, existsSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const RUNS = join(ROOT, "runs");
const JUDGES = join(ROOT, "judges");
const LABELS = ["A", "B", "C", "D", "E"];
const DIMS = [
  { id: "sourcing", name: "Sourcing & grounding" },
  { id: "synthesis", name: "Synthesis & POV" },
  { id: "coherence", name: "Coherence" },
  { id: "craft", name: "Craft" },
  { id: "distinctiveness", name: "Distinctiveness" },
];
const ARTIFACTS = ["embodiment", "landing", "dashboard"];

const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : null);

// same stable, non-alphabetical blind order used by compare.html
function blindOrder(slugs) {
  const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  return [...slugs].sort((a, b) => hash(a + "stargazing") - hash(b + "stargazing"));
}

const slugs = existsSync(RUNS)
  ? readdirSync(RUNS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
  : [];

const order = blindOrder(slugs);                 // index 0->A, 1->B ...
const labelOf = {}; order.forEach((s, i) => (labelOf[s] = LABELS[i]));
const slugOfLabel = {}; order.forEach((s, i) => (slugOfLabel[LABELS[i]] = s));

// entries + which artifacts exist
const entries = {};
for (const slug of slugs) {
  const dir = join(RUNS, slug);
  let meta = {}; try { meta = JSON.parse(read(join(dir, "meta.json")) || "{}"); } catch {}
  const artifacts = {};
  for (const a of ARTIFACTS) artifacts[a] = existsSync(join(dir, `${a}.html`));
  artifacts.design = existsSync(join(dir, "DESIGN.md"));
  const present = ARTIFACTS.some((a) => artifacts[a]);
  entries[slug] = { slug, label: labelOf[slug], present, meta, artifacts, dims: {}, overall: null };
}

// load judges (filename = authoritative judge slug)
const judgeFiles = existsSync(JUDGES)
  ? readdirSync(JUDGES).filter((f) => f.endsWith(".json"))
  : [];
const judges = [];
for (const f of judgeFiles) {
  try {
    const data = JSON.parse(read(join(JUDGES, f)));
    judges.push({ slug: basename(f, ".json"), scores: data.scores || {} });
  } catch (e) { console.error(`skipping ${f}: ${e.message}`); }
}

// aggregate per entry per dimension, excluding self-scores
for (const slug of slugs) {
  const e = entries[slug];
  const label = e.label;
  const dimMeans = [];
  for (const d of DIMS) {
    const got = [];
    for (const j of judges) {
      if (j.slug === slug) continue;                  // self-exclude
      const cell = j.scores?.[label]?.[d.id];
      if (cell && typeof cell.score === "number") got.push({ judge: j.slug, score: cell.score, reason: cell.reason || "" });
    }
    const mean = got.length ? got.reduce((a, b) => a + b.score, 0) / got.length : null;
    e.dims[d.id] = { mean, n: got.length, scores: got };
    if (mean != null) dimMeans.push(mean);
  }
  e.overall = dimMeans.length ? +(dimMeans.reduce((a, b) => a + b, 0) / dimMeans.length).toFixed(2) : null;
}

const out = {
  generatedAt: new Date().toISOString(),
  concept: "stargazing",
  dimensions: DIMS,
  blindOrder: order,
  judges: judges.map((j) => j.slug),
  entries,
};
writeFileSync(join(ROOT, "results.json"), JSON.stringify(out, null, 2));

// console summary
console.log(`\nRubric scorecard — concept: ${out.concept}`);
console.log(`judges: ${judges.length ? judges.map((j) => j.slug).join(", ") : "none yet"}\n`);
const pad = (s, n) => String(s).padEnd(n);
process.stdout.write(pad("entry", 14));
for (const d of DIMS) process.stdout.write(pad(d.id.slice(0, 8), 10));
console.log(pad("OVERALL", 9));
for (const slug of order) {
  const e = entries[slug];
  process.stdout.write(pad(slug + (e.present ? "" : "*"), 14));
  for (const d of DIMS) {
    const m = e.dims[d.id]?.mean;
    process.stdout.write(pad(m == null ? "—" : m.toFixed(1), 10));
  }
  console.log(pad(e.overall == null ? "—" : e.overall.toFixed(2), 9));
}
console.log(`\nblind order  A=${order[0]||"—"}  B=${order[1]||"—"}  C=${order[2]||"—"}`);
console.log(`(* = no artifacts yet)   wrote results.json\n`);
