#!/usr/bin/env node
// snapshot.mjs — freeze the bake-off manifest (every round + model: tokens, cost,
// harness, image model) into a durable JSON record. ADDITIVE: it merges into the
// existing record, so re-running after a new round appends without losing old ones.
// Run after collecting each round:  node snapshot.mjs
//
// Why: the token/cost numbers are measured from logs that drift as sessions continue.
// The manifest values are already frozen at collection time; this captures them to a
// queryable, accumulating JSON so later session-work never loses them.

import fs from "node:fs";
import path from "node:path";

const ROOT = "/Users/seshendranalla/Development/katagami-worktrees/claude-model-bakeoff";
const COMP = path.join(ROOT, "ui/src/app/(site)/lab/comparisons.ts");
const OUT = path.join(ROOT, "experiments/model-bakeoff/bakeoff-results.json");

const src = fs.readFileSync(COMP, "utf8");
const m = src.match(/export const COMPARISONS[^=]*=\s*(\[[\s\S]*?\n\];)/);
if (!m) {
  console.error("could not locate COMPARISONS array in comparisons.ts");
  process.exit(1);
}
// the array literal is plain JS (typed only at the declaration) — evaluate it
const COMPARISONS = new Function("return (" + m[1].replace(/;\s*$/, "") + ")")();

const stamp = new Date().toISOString();
const rounds = {};
for (const c of COMPARISONS) {
  rounds[c.slug] = {
    tag: c.tag,
    title: c.title,
    capturedAt: stamp,
    models: c.blindOrder.map((k) => {
      const mo = c.models[k];
      return {
        key: k,
        name: mo.name,
        dir: mo.dir,
        harness: mo.harness ?? null,
        imageModel: mo.imageModel ?? null,
        tokens: mo.tokens ?? null, // thinking tokens, display string
        cost: mo.cost ?? null, // billed cost, display string
        wall: mo.wall ?? null, // wall-clock run time, display string
      };
    }),
  };
  // a comparison can carry a per-model `variant` (e.g. "no rules") — capture it too
  if (c.variant) {
    rounds[c.variant.slug] = {
      tag: `${c.tag}·${c.variant.label}`,
      title: `${c.title} — ${c.variant.label}`,
      capturedAt: stamp,
      models: c.blindOrder
        .filter((k) => c.variant.models[k])
        .map((k) => {
          const mo = c.variant.models[k];
          return {
            key: k,
            name: mo.name,
            dir: mo.dir,
            harness: mo.harness ?? null,
            imageModel: mo.imageModel ?? null,
            tokens: mo.tokens ?? null,
            cost: mo.cost ?? null,
            wall: mo.wall ?? null,
          };
        }),
    };
  }
}

// additive merge — preserve any prior rounds not in the current manifest
let prev = {};
try {
  prev = JSON.parse(fs.readFileSync(OUT, "utf8")).rounds || {};
} catch {}
const merged = { ...prev, ...rounds };

fs.writeFileSync(OUT, JSON.stringify({ snapshotAt: stamp, rounds: merged }, null, 2));
const n = Object.keys(merged).length;
const mc = Object.values(merged).reduce((a, r) => a + r.models.length, 0);
console.log(`snapshot -> ${OUT}`);
console.log(`  ${n} rounds, ${mc} model entries, at ${stamp}`);
