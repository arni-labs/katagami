// Every Published design language must bind a Published art style.
//
// A language's DESIGN.md names its paired art style at
// `imagery_direction.pairs_with` and tells the reader to generate real imagery
// from that recipe. If the pair is not Published, the promise is broken in both
// directions: the reader cannot fetch the recipe through the gallery or the read
// MCP, while the language's own DESIGN.md prints it anyway — which is how
// unreviewed work became publicly readable (2026-09-21).
//
// This reports; it does not repair. An art style reaches Published only through
// the contribution contract — independent source/rights review, independent
// prompt review, cross-model portability evidence, quality review, published
// assets — and those flags are the record that the work was actually reviewed.
// Setting them to satisfy this check would be inventing a review, so a
// violation here is a curation job, never a patch.
//
// Exits non-zero when any Published language's pair is not Published.
// Env: TEMPER_API_URL, TEMPER_API_KEY, TEMPER_TENANT (default "default").

const API = requiredEnv("TEMPER_API_URL").replace(/\/+$/, "");
const H = { "X-Tenant-Id": process.env.TEMPER_TENANT || "default", Authorization: `Bearer ${requiredEnv("TEMPER_API_KEY")}` };
const VERBOSE = process.argv.includes("--verbose");

/** The flags the art-style Publish guard requires; each is a record that a review happened. */
const PUBLISH_GUARDS = [
  "has_medium", "has_prompt_template", "has_slot_recipes", "has_proof_shots", "has_thumbnail",
  "has_credits", "has_model_provenance", "has_source_basis_review", "has_prompt_review",
  "has_portability_evidence", "quality_review_passed", "has_published_assets",
];

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`missing env ${name}`);
    process.exit(2);
  }
  return v;
}

async function readAll(set) {
  const out = [];
  const seen = new Set();
  let url = `${API}/tdata/${set}?$top=500`;
  while (url) {
    if (seen.has(url)) throw new Error(`${set} looped on a repeated nextLink`);
    seen.add(url);
    const res = await fetch(url, { headers: H });
    if (!res.ok) throw new Error(`read ${set} failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const body = await res.json();
    if (!Array.isArray(body.value)) throw new Error(`read ${set} returned no value array`);
    out.push(...body.value);
    const next = body["@odata.nextLink"];
    url = typeof next === "string" && next ? new URL(next, url).toString() : null;
  }
  return out;
}

const text = (v) => (typeof v === "string" ? v : v == null ? "" : String(v));
const flag = (row, key) => [row.fields?.[key], row.booleans?.[key]].some((v) => v === true || v === "true");
const onShelf = (row) => flag(row, "shown_to_visitors") || flag(row, "ShownToVisitors");
function parsed(v) {
  if (v && typeof v === "object") return v;
  if (typeof v === "string" && v.trim()) {
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }
  return null;
}

const [languages, artStyles] = await Promise.all([readAll("DesignLanguages"), readAll("ArtStyles")]);
const bySlug = new Map();
for (const row of artStyles) {
  const slug = text(row.fields?.slug).toLowerCase();
  if (slug && !bySlug.has(slug)) bySlug.set(slug, row);
}

const published = languages.filter((l) => l.status === "Published");
const unpaired = [];
const dangling = [];
const notPublished = new Map();
let sound = 0;

for (const lang of published) {
  const name = text(lang.fields?.name);
  const pairsWith = text(parsed(lang.fields?.imagery_direction)?.pairs_with).trim();
  if (!pairsWith) {
    unpaired.push(name);
    continue;
  }
  const art = bySlug.get(pairsWith.toLowerCase());
  if (!art) {
    dangling.push({ language: name, pairsWith, shelf: onShelf(lang) });
    continue;
  }
  if (art.status === "Published") {
    sound++;
    continue;
  }
  if (!notPublished.has(art.entity_id)) notPublished.set(art.entity_id, { art, languages: [], shelf: false });
  const entry = notPublished.get(art.entity_id);
  entry.languages.push(name);
  if (onShelf(lang)) entry.shelf = true;
}

const shelfHit = [...notPublished.values()].filter((e) => e.shelf).length;
console.log(`${published.length} Published design languages.`);
console.log(`  pair Published:        ${sound}`);
console.log(`  pair NOT Published:    ${[...notPublished.values()].reduce((n, e) => n + e.languages.length, 0)} languages, ${notPublished.size} distinct art styles`);
console.log(`  pair names no entity:  ${dangling.length}`);
console.log(`  no pair named:         ${unpaired.length}`);

if (notPublished.size > 0) {
  const byStatus = {};
  for (const { art } of notPublished.values()) byStatus[art.status] = (byStatus[art.status] ?? 0) + 1;
  console.log(`\nunpublished pairs by state: ${Object.entries(byStatus).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  console.log(`${shelfHit} of them are bound by a language on the visitor shelf, so their recipe is public through DESIGN.md today.`);
  const blocking = new Map();
  for (const { art } of notPublished.values()) {
    for (const g of PUBLISH_GUARDS) if (!flag(art, g)) blocking.set(g, (blocking.get(g) ?? 0) + 1);
  }
  console.log("\nwhat stands between them and Publish (count of styles missing each):");
  for (const [g, n] of [...blocking].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${g}`);
  console.log("\nEach of these is the record of a review that has not happened. Run the art-style");
  console.log("pipeline for them, or re-pair the languages; do not set the flags.");
  if (VERBOSE) {
    console.log("\nevery unpublished pair:");
    for (const { art, languages: ls, shelf } of notPublished.values()) {
      console.log(`  ${art.status.padEnd(11)} ${text(art.fields?.slug).padEnd(40)} ${shelf ? "[shelf]" : "       "} ${ls.join(", ")}`);
    }
  }
}
if (dangling.length > 0) {
  console.log("\npairings naming an art style no entity has:");
  for (const d of dangling) console.log(`  ${d.language}${d.shelf ? " [shelf]" : ""} -> ${d.pairsWith}`);
}
if (unpaired.length > 0) console.log(`\nPublished languages naming no pair: ${unpaired.join(", ")}`);

const broken = notPublished.size + dangling.length;
if (broken > 0) {
  console.error(`\nFAIL: ${broken} Published languages bind an art style that is not Published.`);
  process.exit(1);
}
console.log("\nok: every Published language binds a Published art style.");
