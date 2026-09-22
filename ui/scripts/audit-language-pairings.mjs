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
// Exits non-zero for unresolved/unpublished pairs or inconsistent explicit IDs.
// Slug lookup is case-insensitive for backlog discovery; the ID binding must
// still match the named slug exactly. Duplicate slugs require an explicit ID.
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
    if (url && new URL(url).origin !== new URL(API).origin) throw new Error(`${set} returned a cross-origin nextLink`);
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
const byId = new Map(artStyles.map(row => [row.entity_id, row]));
const slugKey = (value) => text(value).trim().toLowerCase();
const bySlug = new Map();
for (const art of artStyles) {
  const key = slugKey(art.fields?.slug);
  if (!key) continue;
  if (!bySlug.has(key)) bySlug.set(key, []);
  bySlug.get(key).push(art);
}

const published = languages.filter((l) => l.status === "Published");
const unpaired = [];
const dangling = [];
const inconsistentIds = [];
const duplicates = [];
const notPublished = new Map();
const violations = new Set();
let sound = 0;
let ambiguous = 0;

for (const [index, lang] of published.entries()) {
  const name = text(lang.fields?.name);
  const languageKey = lang.entity_id || index;
  const pairsWith = text(parsed(lang.fields?.imagery_direction)?.pairs_with).trim();
  const id = text(lang.fields?.default_art_style_id);
  const explicit = byId.get(id);
  const idProblem = !id ? "missing default_art_style_id"
    : !explicit ? `default_art_style_id ${id} names no entity`
    : text(explicit.fields?.slug) !== pairsWith
      ? `default_art_style_id ${id} names ${text(explicit.fields?.slug)}, not ${pairsWith || "an explicit pair"}`
      : null;
  if (idProblem) {
    inconsistentIds.push({ language: name, pairsWith, reason: idProblem, shelf: onShelf(lang) });
    violations.add(languageKey);
  }
  if (!pairsWith) {
    unpaired.push(name);
    violations.add(languageKey);
    continue;
  }
  const candidates = bySlug.get(slugKey(pairsWith)) || [];
  if (!candidates.length) {
    dangling.push({ language: name, pairsWith, shelf: onShelf(lang) });
    violations.add(languageKey);
    continue;
  }
  // An exact explicit binding resolves duplicate slugs. Otherwise preserve all
  // candidate IDs instead of choosing whichever entity the API returned first.
  const art = !idProblem ? explicit : candidates.length === 1 ? candidates[0] : null;
  if (candidates.length > 1) {
    duplicates.push({ language: name, pairsWith, candidates, resolved: art?.entity_id });
  }
  if (!art) {
    ambiguous++;
    violations.add(languageKey);
    continue;
  }
  if (art.status === "Published") {
    sound++;
    continue;
  }
  violations.add(languageKey);
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
console.log(`  pair ambiguous:        ${ambiguous}`);
console.log(`  default ID inconsistent: ${inconsistentIds.length}`);
console.log("Slug publication categories and default-ID errors are independent; the failure total counts each language once.");

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

if (duplicates.length > 0) {
  console.log("\nduplicate slug candidates (all IDs; unresolved candidates are not included in publication totals):");
  for (const d of duplicates) {
    console.log(`  ${d.language} -> ${d.pairsWith}: ${d.candidates.map(art => `${art.entity_id} (${art.status})`).join(", ")}; ${d.resolved ? `resolved by default ID ${d.resolved}` : "ambiguous, no exact default ID binding"}`);
  }
}
if (inconsistentIds.length > 0) {
  console.log("\ndefault art-style ID inconsistencies:");
  for (const d of inconsistentIds) console.log(`  ${d.language}${d.shelf ? " [shelf]" : ""} -> ${d.pairsWith || "(unnamed)"}: ${d.reason}`);
}

const broken = violations.size;
if (broken > 0) {
  console.error(`\nFAIL: ${broken} Published languages have an unpublished, missing, unnamed, or ambiguous art-style pair, or an inconsistent default ID.`);
  process.exit(1);
}
console.log("\nok: every Published language binds a Published art style.");
