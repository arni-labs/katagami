// What Ask is worth, as numbers. The same thirteen questions put to the library
// every run, so a change to the prompts, the matching maths or the index moves a
// number instead of an opinion.
//
// Every answer here comes from POST /api/ask on a server you started yourself,
// so the prompts under test are the ones the site ships — nothing about the
// pipeline is reimplemented in this file. That server must be started with
// KATAGAMI_ASK_EVAL=1, which turns off the ten-minute answer memo (three
// identical asks have to be three real asks), turns off the per-address floor (a
// measurement run is not abuse), and lets an ask report which styles the fit
// judge was shown. That last one is the whole point: the shortlist band is
// invisible from outside, and it is what the headline number is about.
//
//   cd ui && KATAGAMI_ASK_EVAL=1 npx next dev -p 3920
//   cd ui && node --env-file=.env.local scripts/ask-eval.mjs --server=http://localhost:3920
//
// Sixteen model calls a query — fifteen through the route, one this script makes
// itself to re-score the answers blind — so 208 in a full run, half a minute.
// Read-only: it asks and it reads, it never writes anything back.
//
// Flags: --server=URL, --json (the whole result to stdout, nothing else),
// --write-baseline (record today's numbers), --only=id,id (a subset, for
// working on the harness without paying for the full run).
//
// Env: TYPESAFE_API_KEY, for this script's own blind re-score.
import { readFileSync, writeFileSync } from "node:fs";
import { askJev, score } from "../src/lib/jev.mjs";
import { STYLE_DNA_QUESTIONS } from "../src/lib/style-dna.mjs";

const args = process.argv.slice(2);
const has = (name) => args.includes(name);
const opt = (name, fallback) => args.find((a) => a.startsWith(`${name}=`))?.slice(name.length + 1) ?? fallback;
const SERVER = opt("--server", process.env.ASK_EVAL_SERVER || "http://localhost:3920").replace(/\/+$/, "");
const BASELINE = new URL("./ask-eval.baseline.json", import.meta.url);

/** How many results an ask returns here. Overlap between two asks is over these. */
const TOP = 8;
/** How many times each question is asked, to see whether the answer holds. */
const REPEATS = 3;
/** A change, then its opposite, then one more: direction, reversibility, and whether a
 *  change that moves the reading ever leaves the answer exactly as it was. */
const CHANGES = ["warmer", "colder", "quieter"];
/** Three changes that pull the same way, for saturation. A chain that undoes itself
 *  would flatter the number: what exhausts a reading is asking for more, and more. */
const PILE = ["warmer", "simpler", "more confident"];
/** Queries running at once. Jev is the bottleneck and it is shared with the route's own calls. */
const LANES = 4;

// Thirteen questions: things people actually make, moods with no product in them,
// and the awkward inputs — one word, a paragraph, and something the library has
// nothing for. The set is fixed; changing it makes the baseline meaningless, so
// add to it deliberately and re-record.
const QUERIES = [
  { id: "hospital-night", q: "a dashboard for a hospital night shift" },
  { id: "natural-wine", q: "a label and a shop for a small natural wine importer" },
  { id: "scary-bank", q: "a banking app for people who find banks frightening" },
  { id: "botanical", q: "a museum site for a collection of nineteenth-century botanical prints" },
  { id: "game-studio", q: "the landing page for a two-person indie game studio" },
  { id: "school-reports", q: "the tool a primary school uses to write and send end-of-year reports" },
  { id: "quiet-luxury", q: "quiet, expensive, almost nothing on the page" },
  { id: "loud", q: "loud, rude, and impossible to ignore" },
  { id: "bookshop", q: "a rainy Tuesday afternoon in a second-hand bookshop" },
  { id: "one-word", q: "brutalism" },
  { id: "one-word-dull", q: "logistics" },
  {
    id: "paragraph",
    q:
      "we are building an internal tool for the people who schedule freight trains, it has to show a hundred rows of " +
      "timetable at once on a big screen in a control room that is kept quite dark, it must be readable from two metres " +
      "away, it should feel calm and serious rather than exciting, and the same four people will look at it for eight " +
      "hours at a stretch",
  },
  { id: "not-a-design", q: "how do I fix a dripping radiator valve" },
];

// The blind re-score (measure 6). Worded differently from the pipeline's own fit
// question on purpose: if it repeated that wording it would only be asking the
// same judge the same thing twice.
const BLIND_LEVELS = ["put it aside as wrong for the product", "keep it as a possibility", "choose it and build the product in it"];
const BLIND_ASK = "A designer is choosing the look of this product and has this style in front of them. What would they do with it?\n";

const TRAITS = STYLE_DNA_QUESTIONS.map((q) => q.id);
const mean = (xs) => (xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const ids = (answer) => answer.results.map((r) => r.id);
const overlap = (a, b) => (Math.min(a.length, b.length) > 0 ? a.filter((x) => b.includes(x)).length / Math.min(a.length, b.length) : 0);
const drift = (before, after) => TRAITS.filter((id) => before[id] !== after[id]).length;
const pinned = (reading) => TRAITS.filter((id) => reading[id] === 0 || reading[id] === 1).length;

let modelCalls = 0;

async function ask(body) {
  // Two calls for an ask that reads the sentence itself, one for a stage that
  // was handed a reading. Jev's own retries are invisible from out here.
  modelCalls += (body.want ? 0 : 1) + (body.refine ? 1 : 0) + (body.stage === "match" ? 0 : 1);
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${SERVER}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    if (res.ok) return res.json();
    const said = (await res.text()).slice(0, 200);
    // 503 is a busy Jev and is worth another go; anything else is ours.
    if (res.status !== 503 || attempt >= 2) throw new Error(`POST /api/ask -> ${res.status}: ${said}`);
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
}

// The six styles are re-scored in one shuffled list so their order carries no
// hint of where the pipeline ranked them. Seeded by the query, so a rerun
// shuffles them the same way and the number is comparable.
function shuffled(items, seedText) {
  let h = 2166136261;
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const next = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507)) >>> 0) / 2 ** 32;
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function blindGap(query, judged) {
  const picks = shuffled(
    [...judged.slice(0, 3).map((j) => ({ ...j, rank: "top" })), ...judged.slice(-3).map((j) => ({ ...j, rank: "bottom" }))],
    query.id,
  );
  modelCalls++;
  const { answers } = await askJev(
    `Product: ${query.q}`,
    Object.fromEntries(picks.map((p, i) => [`c${i}`, score(BLIND_ASK + p.doc, BLIND_LEVELS)])),
    { timeoutMs: 20_000, retries: 2 },
  );
  const scored = picks.map((p, i) => {
    const s = answers[`c${i}`]?.score;
    if (typeof s !== "number" || !Number.isFinite(s)) throw new Error(`the blind re-score left ${p.name} unscored`);
    return { ...p, blind: s / (BLIND_LEVELS.length - 1) };
  });
  const band = (rank) => mean(scored.filter((s) => s.rank === rank).map((s) => s.blind));
  return { gap: band("top") - band("bottom"), top: band("top"), bottom: band("bottom") };
}

async function measure(query) {
  const runs = [];
  for (let i = 0; i < REPEATS; i++) runs.push(await ask({ q: query.q, k: TOP, debug: true }));
  const base = runs[0];
  if (!Array.isArray(base.judged)) {
    throw new Error(`${SERVER} answered without the judged band — start it with KATAGAMI_ASK_EVAL=1`);
  }
  if (base.results.length === 0) throw new Error(`no results for "${query.q}"`);

  // Steadiness: how much of the top eight two asks share, over all three pairs.
  const pairs = [[0, 1], [0, 2], [1, 2]].map(([a, b]) => overlap(ids(runs[a]), ids(runs[b])));
  // The band: the fit judge sees the DNA shortlist plus a handful of outsiders.
  // A top answer from outside the shortlist is an answer plain DNA matching
  // would have dropped — and for every one that got in by the outsider lottery
  // there are others the judge never saw at all.
  const outside = runs.map((run) => {
    const shortlist = new Set(run.judged.filter((j) => j.band === "dna").map((j) => j.id));
    return run.results.slice(0, 3).filter((r) => !shortlist.has(r.id)).length;
  });

  // Refine: a change, its opposite, then a third, each applied to what the last
  // one left. Traits are counted off the readings themselves — the route's own
  // `moved` list stops at eight because it is there to be shown to a person.
  const chain = [];
  let want = base.want;
  let changes = base.changes || undefined;
  let previous = base;
  for (const change of CHANGES) {
    const moved = await ask({ q: query.q, want, changes, refine: change, stage: "match" });
    const answer = await ask({ q: query.q, want: moved.want, changes: moved.changes, k: TOP });
    // How far back toward where it started this change puts the reading. A step
    // is a fraction of the way, not a whole one, so a trait almost never lands
    // back on its old value exactly — the honest question is how much of the
    // distance came back. 1 is all of it, 0 is none, below 0 is further away.
    const away = TRAITS.filter((id) => want[id] !== base.want[id]);
    const gone = (r) => away.reduce((sum, id) => sum + Math.abs(r[id] - base.want[id]), 0);
    chain.push({
      change,
      traits_moved: drift(want, moved.want),
      answer_kept: overlap(ids(answer), ids(previous)),
      answer_vs_original: overlap(ids(answer), ids(base)),
      distance_back: away.length > 0 ? 1 - gone(moved.want) / gone(want) : 0,
    });
    want = moved.want;
    changes = moved.changes;
    previous = answer;
  }

  // Saturation, on its own chain: three changes that all pull the same way,
  // asked of the reading only. A trait sitting on 0 or 1 is out of road — no
  // later refinement can move it any further that way.
  let piled = base.want;
  let pileChanges;
  for (const change of PILE) {
    const step = await ask({ q: query.q, want: piled, changes: pileChanges, refine: change, stage: "match" });
    piled = step.want;
    pileChanges = step.changes;
  }

  const fit = await blindGap(query, base.judged);
  return {
    id: query.id,
    query: query.q,
    model: base.model,
    considered: base.considered,
    steadiness: mean(pairs),
    top_answer_held: new Set(runs.map((r) => r.results[0].id)).size === 1,
    outside_band: mean(outside),
    judged: base.judged.length,
    // The first change is the one the direction claim rests on; the second is
    // its opposite and says how much of the original comes back.
    traits_moved: chain[0].traits_moved,
    answer_kept: chain[0].answer_kept,
    answer_returned: chain[1].answer_vs_original,
    distance_returned: chain[1].distance_back,
    pinned_before: pinned(base.want),
    pinned_after: pinned(piled),
    noop_changes: chain.filter((c) => c.traits_moved > 0 && c.answer_kept === 1).map((c) => c.change),
    fit_gap: fit.gap,
    fit_top: fit.top,
    fit_bottom: fit.bottom,
    changes: chain,
  };
}

async function runAll(queries) {
  // The first question runs alone: it warms the ask pool, and if the server is
  // not set up for a measurement it fails here instead of four times at once.
  const done = [await measure(queries[0])];
  const queue = queries.slice(1);
  await Promise.all(
    Array.from({ length: Math.min(LANES, queue.length) }, async () => {
      for (let q = queue.shift(); q; q = queue.shift()) done.push(await measure(q));
    }),
  );
  return queries.map((q) => done.find((d) => d.id === q.id)).filter(Boolean);
}

// Every number the run reports, with which way is better, so the report and the
// comparison against the baseline are the same list read twice.
const pct = (v) => `${Math.round(v * 100)}%`;
const METRICS = [
  { key: "steadiness", label: "same question, same top eight", better: "up", show: (v) => v.toFixed(2) },
  { key: "top_answer_held", label: "queries whose top answer never moved", better: "up", show: (v, s) => `${v} of ${s.queries}` },
  { key: "outside_band", label: "top-3 answers from outside the DNA shortlist", better: "down", show: (v) => `${v.toFixed(2)} of 3` },
  { key: "traits_moved", label: "traits one change moves", better: null, show: (v) => `${v.toFixed(1)} of 49` },
  { key: "answer_kept", label: "answer kept after that change", better: null, show: pct },
  { key: "answer_returned", label: "answer back after the opposite change", better: "up", show: pct },
  { key: "distance_returned", label: "reading back after the opposite change", better: "up", show: pct },
  { key: "pinned_before", label: "traits stuck at 0 or 1 to begin with", better: "down", show: (v) => `${v.toFixed(1)} of 49` },
  { key: "pinned_after", label: "traits stuck at 0 or 1 after three changes", better: "down", show: (v) => `${v.toFixed(1)} of 49` },
  { key: "noop_changes", label: "changes that moved traits but no results", better: "down", show: (v, s) => `${v} of ${s.changes_made}` },
  { key: "fit_gap", label: "blind fit gap, best three over worst three", better: "up", show: (v) => v.toFixed(2) },
  { key: "fit_gap_right_way", label: "queries whose gap runs the right way", better: "up", show: (v, s) => `${v} of ${s.queries}` },
];

function summarise(rows) {
  const avg = (key) => mean(rows.map((r) => r[key]));
  return {
    queries: rows.length,
    changes_made: rows.length * CHANGES.length,
    steadiness: avg("steadiness"),
    top_answer_held: rows.filter((r) => r.top_answer_held).length,
    outside_band: avg("outside_band"),
    traits_moved: avg("traits_moved"),
    answer_kept: avg("answer_kept"),
    answer_returned: avg("answer_returned"),
    distance_returned: avg("distance_returned"),
    pinned_before: avg("pinned_before"),
    pinned_after: avg("pinned_after"),
    noop_changes: rows.reduce((n, r) => n + r.noop_changes.length, 0),
    fit_gap: avg("fit_gap"),
    fit_gap_right_way: rows.filter((r) => r.fit_gap > 0).length,
  };
}

function report(result, baseline) {
  const s = result.summary;
  const out = [];
  out.push(
    `ask-eval  ${s.queries} queries · ${result.considered} styles in view · ${result.model} · ` +
      `${result.model_calls} model calls · ${Math.round(result.seconds)}s`,
  );
  out.push("");
  for (const m of METRICS) {
    const was = baseline?.summary?.[m.key];
    let move = "";
    if (typeof was === "number") {
      const delta = s[m.key] - was;
      // Jev wobbles a little between runs, so a small move is not news. Three
      // runs of this harness on an unchanged pipeline stayed inside a twentieth
      // of each number, or 0.05, whichever is larger; a count either moves by a
      // whole one or it has not moved.
      const band = Number.isInteger(was) && Number.isInteger(s[m.key]) ? 0.5 : Math.max(0.05 * Math.abs(was), 0.05);
      const held = Math.abs(delta) <= band;
      const wanted = m.better === "up" ? delta > 0 : delta < 0;
      move = `was ${m.show(was, baseline.summary).padEnd(11)} ${held ? "same" : !m.better ? (delta > 0 ? "up" : "down") : wanted ? "better" : "worse"}`;
    }
    out.push(`  ${m.label.padEnd(46)}${m.show(s[m.key], s).padEnd(11)}${move}`);
  }
  out.push("");
  out.push(`  ${"query".padEnd(16)}${"steady".padEnd(8)}${"outside".padEnd(9)}${"gap".padEnd(7)}${"moved".padEnd(7)}${"kept".padEnd(6)}${"back".padEnd(6)}pinned`);
  for (const r of result.queries) {
    out.push(
      `  ${r.id.padEnd(16)}${r.steadiness.toFixed(2).padEnd(8)}${`${r.outside_band.toFixed(2)}/3`.padEnd(9)}` +
        `${r.fit_gap.toFixed(2).padEnd(7)}${String(r.traits_moved).padEnd(7)}${pct(r.answer_kept).padEnd(6)}${pct(r.answer_returned).padEnd(6)}${r.pinned_after}`,
    );
  }
  out.push("");
  out.push("  outside: how many of the top three answers the DNA shortlist would have dropped.");
  out.push("  moved/kept: traits one change moves, and how much of the answer survives it. back: how");
  out.push("  much of the original answer the opposite change brings back. pinned: traits stuck at 0");
  out.push("  or 1 after three changes, which no later change can move any further that way.");
  out.push("");
  out.push("  The blind fit gap asks a second time, in different words and in shuffled order, how a");
  out.push("  designer would treat the best three answers and the worst three styles the judge saw.");
  out.push("  A wide gap says the ranking put better answers above worse ones — it does NOT say the");
  out.push("  best answer in the library was found, because both scores come from the same model");
  out.push("  reading the same descriptions, and neither ever saw the styles the shortlist dropped.");
  return out.join("\n");
}

async function main() {
  const only = opt("--only", "");
  const queries = only ? QUERIES.filter((q) => only.split(",").includes(q.id)) : QUERIES;
  if (queries.length === 0) throw new Error(`--only matched no query; ids are ${QUERIES.map((q) => q.id).join(", ")}`);
  if (!process.env.TYPESAFE_API_KEY) throw new Error("missing TYPESAFE_API_KEY — the blind re-score is this script's own model call");

  const started = Date.now();
  const rows = await runAll(queries);
  // The model and the library size come out of the answers: a run says what it
  // was measuring, rather than what it was configured to measure.
  const result = {
    recorded: new Date().toISOString().slice(0, 10),
    server: SERVER,
    model: rows[0].model,
    considered: rows[0].considered,
    model_calls: modelCalls,
    seconds: (Date.now() - started) / 1000,
    summary: summarise(rows),
    queries: rows,
  };

  let baseline = null;
  try {
    baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
  } catch {
    baseline = null;
  }
  if (has("--json")) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    console.log(report(result, baseline));
    if (!baseline) console.log("\n  no baseline recorded yet — run again with --write-baseline");
  }
  if (has("--write-baseline")) {
    // What a rerun is compared against, and nothing that changes without the
    // pipeline changing: no timings, no token counts, no server address.
    const recorded = { ...result, queries: result.queries.map((r) => ({ ...r, changes: undefined })) };
    delete recorded.seconds;
    delete recorded.server;
    writeFileSync(BASELINE, `${JSON.stringify(recorded, null, 2)}\n`);
    if (!has("--json")) console.log(`\n  baseline written to ${BASELINE.pathname.split("/").pop()}`);
  }
}

main().catch((err) => {
  console.error(String(err?.message ?? err));
  process.exit(1);
});
