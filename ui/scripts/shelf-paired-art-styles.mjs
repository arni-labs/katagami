// Put every visitor-shelf design language's PAIRED art style on the shelf too.
//
// Why this exists: the shelf was curated one kind at a time, so a language and
// the art style its DESIGN.md binds were never checked against each other. On
// 2026-09-21, 52 of the 61 shelf languages paired with an art style that was
// NOT on the shelf: the MCP refused the recipe, the style's page was blank for
// a signed-out visitor, and the language's own DESIGN.md printed that recipe in
// full to anyone. A visitor could read the language and not make its imagery.
//
// The fix is curation, not code: a language on the shelf brings its pair.
// Re-run this whenever a language joins the shelf.
//
// DRY-RUN by default; pass --apply. Idempotent: a pair already on the shelf is
// left alone, and `visitor_order` is never written, so nothing is reordered.
//
// Env: TEMPER_API_URL, TEMPER_API_KEY, TEMPER_TENANT (default "default").

const API = requiredEnv("TEMPER_API_URL").replace(/\/+$/, "");
const KEY = requiredEnv("TEMPER_API_KEY");
const TENANT = process.env.TEMPER_TENANT || "default";
const APPLY = process.argv.includes("--apply");
const H = { "X-Tenant-Id": TENANT, Authorization: `Bearer ${KEY}` };
const NAMESPACES = ["KatagamiCommons", "Katagami.Curation", "Katagami", "Temper"];

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`missing env ${name}`);
    process.exit(2);
  }
  return v;
}

/** Every row of a set, following @odata.nextLink — a bare read stops at 100. */
async function readAll(set) {
  const out = [];
  let url = `${API}/tdata/${set}?$filter=${encodeURIComponent("Status eq 'Published'")}&$top=500`;
  const seen = new Set();
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
/** The shelf flag as the spec and the gallery both read it. */
const onShelf = (row) =>
  [row.fields?.shown_to_visitors, row.booleans?.shown_to_visitors, row.fields?.ShownToVisitors]
    .some((v) => v === true || v === "true");

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

async function showToVisitors(id) {
  let last = "";
  for (const ns of NAMESPACES) {
    const res = await fetch(`${API}/tdata/ArtStyles('${encodeURIComponent(id)}')/${ns}.SetVisitorVisibility`, {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json" },
      // shown_to_visitors ONLY: writing visitor_order here would reshuffle a
      // shelf someone arranged by hand.
      body: JSON.stringify({ shown_to_visitors: true }),
    });
    if (res.ok) return;
    last = `${ns}.SetVisitorVisibility -> ${res.status}: ${(await res.text()).slice(0, 200)}`;
    if (res.status !== 404) break;
  }
  throw new Error(last);
}

const [languages, artStyles] = await Promise.all([readAll("DesignLanguages"), readAll("ArtStyles")]);

const bySlug = new Map();
for (const row of artStyles) {
  const slug = text(row.fields?.slug).toLowerCase();
  if (slug) bySlug.set(slug, [...(bySlug.get(slug) ?? []), row]);
}

const wanted = new Map();
const unpaired = [];
const missing = [];
const unsure = [];
for (const lang of languages.filter(onShelf)) {
  const name = text(lang.fields?.name);
  // The linked id first: slugs repeat (eleven art styles are "overprint"), so a
  // slug alone can name the wrong one.
  const pairedId = text(lang.fields?.default_art_style_id);
  const pairsWith = text(parsed(lang.fields?.imagery_direction)?.pairs_with).trim();
  if (!pairedId && !pairsWith) {
    unpaired.push(name);
    continue;
  }
  // A pairing naming no published art style is a broken language, not our job
  // to invent; report it. So is a linked id that disagrees with the slug, or a
  // slug several styles share: putting a guess on the shelf would show imagery
  // from a style that is not the language's pair.
  let art;
  if (pairedId) {
    art = artStyles.find((row) => row.entity_id === pairedId);
    if (!art) {
      missing.push(`${name} -> ${pairedId} (the linked id names no published art style)`);
      continue;
    }
    if (pairsWith && text(art.fields?.slug).toLowerCase() !== pairsWith.toLowerCase()) {
      unsure.push(`${name}: linked ${text(art.fields?.slug)}, pairs_with ${pairsWith}`);
      continue;
    }
  } else {
    const hits = bySlug.get(pairsWith.toLowerCase()) ?? [];
    if (hits.length !== 1) {
      (hits.length ? unsure : missing).push(hits.length ? `${name}: ${hits.length} art styles are ${pairsWith}; link one by id` : `${name} -> ${pairsWith}`);
      continue;
    }
    art = hits[0];
  }
  if (!onShelf(art) && !wanted.has(art.entity_id)) {
    wanted.set(art.entity_id, { art, forLanguages: [name] });
  } else if (wanted.has(art.entity_id)) {
    wanted.get(art.entity_id).forLanguages.push(name);
  }
}

const shelfLangs = languages.filter(onShelf).length;
console.log(`${shelfLangs} languages on the shelf, ${artStyles.filter(onShelf).length} art styles already on it.`);
console.log(`${wanted.size} paired art styles to add${APPLY ? "" : " (dry run — pass --apply)"}.`);
for (const { art, forLanguages } of wanted.values()) {
  console.log(`  ${text(art.fields?.slug) || art.entity_id} — ${text(art.fields?.name)}  (pairs with ${forLanguages.join(", ")})`);
}
if (unpaired.length) console.log(`\n${unpaired.length} shelf language(s) name no pair: ${unpaired.join(", ")}`);
if (missing.length) console.log(`\n${missing.length} pairing(s) name no published art style:\n  ${missing.join("\n  ")}`);
if (unsure.length) console.log(`\n${unsure.length} pairing(s) left alone until someone says which style:\n  ${unsure.join("\n  ")}`);

if (!APPLY) process.exit(0);

let done = 0;
const failed = [];
for (const { art } of wanted.values()) {
  try {
    await showToVisitors(art.entity_id);
    done++;
  } catch (err) {
    failed.push(`${text(art.fields?.slug) || art.entity_id}: ${err.message}`);
  }
}
console.log(`\nput on the shelf: ${done}/${wanted.size}`);
if (failed.length) {
  console.error(`failed:\n  ${failed.join("\n  ")}`);
  process.exit(1);
}
