import "server-only";
import { unstable_cache } from "next/cache";
import { isShownToVisitorsRecord as isShownToVisitors } from "./featured.mjs";
import { rowMatchesIdOrSlug } from "./catalog-membership.mjs";
import { askJev, JEV_MODEL, JevUnavailableError, noul, score } from "./jev.mjs";
import {
  buildStyleDoc,
  centroid,
  matchScore,
  oddness,
  storedDna,
  topTraits,
  wantQuestions,
  dnaFromAnswers,
  STYLE_DNA_QUESTIONS,
  type StyleDna,
} from "./style-dna.mjs";
import { createHash } from "node:crypto";
import atlasFamilies from "@/data/atlas-families.json";
import styleInks from "@/data/style-inks.json";
import atlasHoles from "@/data/atlas-holes.json";
import { judgedChecks, judgedQuestions, MAX_JUDGED, measuredChecks, pageState, verdictOf } from "./language-lint.mjs";

// The ONE catalog gate (ARN-360). Both the website and the read MCP read the
// commons through this module, so "what an identity may see" is defined once.
//
// Tiering: anonymous → the visitor sample (shown_to_visitors); authenticated →
// the full catalog.
// The website resolves identity from its Google session cookie; the MCP from
// an OAuth bearer (ARN-151). Either way the decision — and the paginating,
// facet-aware reads — live here, never in a per-surface slice.
//
// Reads ALWAYS paginate (follow @odata.nextLink). The Temper backend caps an
// un-$top'd list at 100 and returns a nextLink for the rest (ARN-363); a bare
// read silently drops everything past 100, so this module never does one.

const API_BASE = process.env.NEXT_PUBLIC_TEMPER_API_URL || "http://localhost:3500";
const TENANT = process.env.NEXT_PUBLIC_TEMPER_TENANT || "default";
const API_KEY = process.env.TEMPER_API_KEY || "";
const GALLERY = process.env.KATAGAMI_PUBLIC_URL || "https://katagami.ai";

export type Tier = "full" | "sample";
export type Kind = "language" | "palette" | "art_style";

const SET: Record<Kind, string> = {
  language: "DesignLanguages",
  palette: "PaletteSystems",
  art_style: "ArtStyles",
};
const PATH: Record<Kind, string> = {
  language: "language",
  palette: "palettes",
  art_style: "art-styles",
};

type Row = {
  entity_id: string;
  status?: string;
  fields?: Record<string, unknown>;
  booleans?: Record<string, unknown>;
};

// --- Paginating reader (the anti-truncation core) ---------------------------

function headers(): Record<string, string> {
  return {
    "X-Tenant-Id": TENANT,
    ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
  };
}

// A short positive cache. The published catalog changes rarely, but an
// anonymous caller can fan out many tool calls at once; caching each
// (set, filter) read for a few seconds turns that storm into one backend pass
// instead of a fresh crawl per call.
const readCache = new Map<string, { rows: Row[]; at: number }>();
const READ_TTL_MS = 20_000;
// The repeated-nextLink guard below is the real loop protection; this ceiling
// is only a runaway backstop, set far above any real set so it never rejects
// valid pagination. Throw at it rather than silently return a partial set.
const MAX_PAGES = 100_000;

/** Read every row of a set, following @odata.nextLink to completion. */
async function readAll(set: string, filter: string): Promise<Row[]> {
  const cacheKey = `${set}::${filter}`;
  const hit = readCache.get(cacheKey);
  if (hit && Date.now() - hit.at < READ_TTL_MS) return hit.rows;

  const out: Row[] = [];
  const seen = new Set<string>();
  let url: string | null =
    `${API_BASE}/tdata/${set}?$filter=${encodeURIComponent(filter)}&$top=500`;
  let pages = 0;
  while (url) {
    if (pages++ >= MAX_PAGES) throw new Error(`Read ${set} exceeded ${MAX_PAGES} pages`);
    if (seen.has(url)) throw new Error(`Read ${set} looped on a repeated nextLink`);
    seen.add(url);
    const current: string = url;
    const res: Response = await fetch(current, {
      headers: headers(),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Read ${set} failed ${res.status}`);
    const body = (await res.json()) as { value?: Row[]; "@odata.nextLink"?: string };
    if (!Array.isArray(body.value)) throw new Error(`Read ${set} returned no value array`);
    out.push(...body.value);
    const next = body["@odata.nextLink"];
    // A present-but-non-string nextLink (e.g. 0) would otherwise end paging
    // early and silently truncate; treat it as a fault.
    if (next !== undefined && (typeof next !== "string" || next === "")) {
      throw new Error(`Read ${set} returned an invalid nextLink`);
    }
    // nextLink is relative to the request URI (e.g. "DesignLanguages?…") —
    // resolve it the spec-correct way, not by prefixing the origin (which
    // drops /tdata and 404s on page 2).
    url = next ? new URL(next, current).toString() : null;
  }
  readCache.set(cacheKey, { rows: out, at: Date.now() });
  return out;
}

async function readOne(set: string, id: string): Promise<Row | null> {
  const res = await fetch(`${API_BASE}/tdata/${set}('${encodeURIComponent(id)}')`, {
    headers: headers(),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 404) return null;
  // A genuine backend fault must surface as an error, never masquerade as a
  // clean not-found (which the caller would render as "sign in").
  if (!res.ok) throw new Error(`Read ${set}('${id}') failed ${res.status}`);
  return (await res.json()) as Row;
}

// --- Field + facet helpers --------------------------------------------------

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function jsonArr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string" && v.trim()) {
    try {
      const p: unknown = JSON.parse(v);
      return Array.isArray(p) ? p.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}
/** Compact, agent-facing shape for a catalog item. */
function summary(kind: Kind, r: Row) {
  const f = r.fields ?? {};
  return {
    kind,
    id: r.entity_id,
    slug: str(f.slug),
    name: str(f.name),
    tags: jsonArr(f.tags),
    ...(kind === "art_style" ? { medium: str(f.medium) } : {}),
    ...(kind === "language" ? { family_id: str(f.family_id) } : {}),
    taxonomy_ids: jsonArr(f.taxonomy_ids),
    // What a signed-out caller can actually see (the visitor allowlist), not
    // the signed-in-only `featured` highlight — so an agent on the sample tier
    // reads its own visibility.
    shown_to_visitors: isShownToVisitors(r),
    url: `${GALLERY}/${PATH[kind]}/${r.entity_id}`,
    ...(kind === "language"
      ? { design_md_url: `${GALLERY}/language/${r.entity_id}/DESIGN.md` }
      : {}),
  };
}

const PUBLISHED = "Status eq 'Published'";

const byEntityId = (a: Row, b: Row) =>
  a.entity_id < b.entity_id ? -1 : a.entity_id > b.entity_id ? 1 : 0;

// Development only: lay computed fields (style DNA, atlas places) over the rows
// read from the backend, from a JSON file of { entity_id: { field: value } }.
// A backfill's output can then be seen in the real pages, on real content,
// before anything is written to the backend it was computed for. Never active
// in a production build, whatever the environment says.
let devFields: Record<string, Record<string, unknown>> | null | undefined;
async function withDevFields(rows: Row[]): Promise<Row[]> {
  const file = process.env.KATAGAMI_DEV_FIELDS_FILE;
  if (process.env.NODE_ENV !== "development" || !file) return rows;
  if (devFields === undefined) {
    const { readFile } = await import("node:fs/promises");
    devFields = JSON.parse(await readFile(file, "utf8")) as Record<string, Record<string, unknown>>;
  }
  const extra = devFields;
  return extra ? rows.map((r) => (extra[r.entity_id] ? { ...r, fields: { ...r.fields, ...extra[r.entity_id] } } : r)) : rows;
}

/** Gate: which published rows may this tier see? */
async function visibleRows(kind: Kind, tier: Tier): Promise<Row[]> {
  const rows = (await withDevFields(await readAll(SET[kind], PUBLISHED))).filter((r) => str(r.fields?.name));
  if (tier === "full") return rows;
  // The anonymous portion is the owner-curated visitor shelf — the
  // `shown_to_visitors` set — for ALL three kinds, sorted by entity_id so it is
  // a fixed slice a patient caller can't page past. Uncapped: the shelf is
  // exactly what the owner selected, and byte-for-byte identical to every other
  // anonymous surface (they all filter by featuredIds()).
  return rows.filter(isShownToVisitors).sort(byEntityId);
}

/**
 * The ONE source of truth for the anonymous "portion" of a kind: the set of
 * published entity_ids a signed-out visitor may see — the owner-curated visitor
 * shelf (the `shown_to_visitors` set), for languages, art styles, AND palettes
 * alike. Every anonymous-facing surface — the website pages, its search/vectors
 * APIs, the studio/compare tools, and the MCP — filters by this set, so the
 * portion can never diverge between them. (Name kept for call-site stability;
 * the predicate is visitor-visibility, not the `featured` highlight.)
 */
export async function featuredIds(kind: Kind): Promise<Set<string>> {
  const rows = await readAll(SET[kind], PUBLISHED);
  // On the shelf = shown_to_visitors AND has a name — the same predicate
  // visibleRows uses, so a nameless-but-visible junk row can't make this set
  // diverge from what the MCP sample and the website shelves actually render.
  return new Set(
    rows.filter((r) => str(r.fields?.name) && isShownToVisitors(r)).map((r) => r.entity_id),
  );
}

/** May a signed-out visitor see this published id or slug? The visitor shelf
 *  (shown_to_visitors AND named) for ALL kinds — palettes included. featuredIds()
 *  stays id-keyed (list filters); this accepts a slug too so a by-id-or-slug door
 *  like BRIEF.md?palette=komawari-plates&art=cathode-ray isn't 404'd as a miss. */
export async function anonMaySee(kind: Kind, idOrSlug: string): Promise<boolean> {
  const rows = await readAll(SET[kind], PUBLISHED);
  return rows.some(
    (r) => str(r.fields?.name) && isShownToVisitors(r) && rowMatchesIdOrSlug(r, idOrSlug),
  );
}

// --- describe_catalog: the agent's map --------------------------------------

export async function describeCatalog(tier: Tier) {
  const [langs, palettes, arts, taxRows] = await Promise.all([
    visibleRows("language", tier),
    visibleRows("palette", tier),
    visibleRows("art_style", tier),
    readAll("Taxonomies", PUBLISHED),
  ]);

  const taxById = new Map(taxRows.map((t) => [t.entity_id, t.fields ?? {}]));
  const families = new Map<string, { name: string; languages: number }>();
  for (const t of taxRows) {
    const f = t.fields ?? {};
    if (!str(f.parent_id)) families.set(t.entity_id, { name: str(f.name), languages: 0 });
  }
  for (const l of langs) {
    const fam = str(l.fields?.family_id);
    if (fam && families.has(fam)) families.get(fam)!.languages++;
  }
  const familyList = [...families.values()]
    .filter((x) => x.languages > 0)
    .sort((a, b) => b.languages - a.languages);

  const mediums = new Map<string, number>();
  for (const a of arts) {
    const m = str(a.fields?.medium);
    if (m) mediums.set(m, (mediums.get(m) ?? 0) + 1);
  }
  const topTags = (rows: Row[]) => {
    const c = new Map<string, number>();
    for (const r of rows) for (const t of jsonArr(r.fields?.tags)) c.set(t, (c.get(t) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([tag, n]) => ({ tag, count: n }));
  };

  return {
    tier,
    note:
      tier === "sample"
        ? "You are on the anonymous SAMPLE tier (a curated portion of the catalog). Sign in with Google to unlock the full catalog — see whoami."
        : "Full catalog access.",
    kinds: {
      language: { count: langs.length, facets: ["family", "taxonomy", "tag", "query"] },
      palette: { count: palettes.length, facets: ["taxonomy", "tag", "query"] },
      art_style: { count: arts.length, facets: ["medium", "taxonomy", "tag", "query"] },
    },
    families: familyList.map((x) => ({ name: x.name, languages: x.languages })),
    art_style_mediums: [...mediums.entries()].map(([medium, count]) => ({ medium, count })),
    common_tags: {
      language: topTags(langs),
      palette: topTags(palettes),
      art_style: topTags(arts),
    },
    taxonomy_count: taxById.size,
    how_to_search:
      "Call search_design_languages / search_palettes / search_art_styles with any of the facets above, or free-text `query`. Every result carries its facets back so you can refine.",
  };
}

// --- search / list ----------------------------------------------------------

export type SearchArgs = {
  query?: string;
  family?: string;
  taxonomy?: string;
  medium?: string;
  tag?: string;
  limit?: number;
  cursor?: number;
};

function matchName(names: Map<string, string>, needle: string): Set<string> {
  // Resolve a family/taxonomy facet given by NAME to its id(s).
  const ids = new Set<string>();
  const n = needle.toLowerCase();
  for (const [id, nm] of names) if (nm.toLowerCase().includes(n)) ids.add(id);
  return ids;
}

export async function searchDesigns(kind: Kind, tier: Tier, a: SearchArgs) {
  const [rows, taxRows] = await Promise.all([
    visibleRows(kind, tier),
    a.family || a.taxonomy ? readAll("Taxonomies", PUBLISHED) : Promise.resolve([] as Row[]),
  ]);
  const taxNames = new Map(taxRows.map((t) => [t.entity_id, str(t.fields?.name)]));

  let hits = rows;
  if (a.query) {
    const q = a.query.toLowerCase();
    hits = hits.filter((r) => {
      const f = r.fields ?? {};
      return (
        str(f.name).toLowerCase().includes(q) ||
        str(f.slug).toLowerCase().includes(q) ||
        jsonArr(f.tags).some((t) => t.toLowerCase().includes(q))
      );
    });
  }
  if (a.tag) {
    const t = a.tag.toLowerCase();
    hits = hits.filter((r) => jsonArr(r.fields?.tags).some((x) => x.toLowerCase() === t || x.toLowerCase().includes(t)));
  }
  if (kind === "art_style" && a.medium) {
    const m = a.medium.toLowerCase();
    hits = hits.filter((r) => str(r.fields?.medium).toLowerCase() === m);
  }
  if (kind === "language" && a.family) {
    const famIds = matchName(taxNames, a.family);
    hits = hits.filter((r) => famIds.has(str(r.fields?.family_id)));
  }
  if (a.taxonomy) {
    const taxIds = matchName(taxNames, a.taxonomy);
    hits = hits.filter((r) => jsonArr(r.fields?.taxonomy_ids).some((t) => taxIds.has(t)));
  }

  const limit = Math.min(Math.max(a.limit ?? 20, 1), 100);
  const start = Math.max(a.cursor ?? 0, 0);
  const pageRows = hits.slice(start, start + limit);
  return {
    kind,
    tier,
    total_matching: hits.length,
    returned: pageRows.length,
    next_cursor: start + limit < hits.length ? start + limit : null,
    results: pageRows.map((r) => summary(kind, r)),
  };
}

// --- ask the library: judgment, not keywords ---------------------------------
//
// A product sentence is matched in two Jev calls, one after the other. The
// first asks the style-DNA questions of the sentence ("would the right design
// for this be dark? dense? playful?"); the stored DNA of every visible style is
// then compared in code, which costs nothing per style. The second call reads
// the shortlist's real descriptions and scores fit. "Strange" results are
// styles far from the library's average that Jev still scores as a fit — the
// ones a keyword or a nearest-vector search would never put in front of you.

export type AskArgs = {
  query: string;
  kind?: "language" | "art_style";
  limit?: number;
  /** "match" stops after the first Jev call: the DNA match, shown while the fit is judged. */
  stage?: "match";
  /** The sentence's reading from a "match" answer, so the fit stage does not pay for it twice. */
  want?: Record<string, number>;
};

const ASK_MAX_QUERY = 400;
const ASK_SHORTLIST = 24;
const ASK_OUTSIDERS = 12;
const FIT_LEVELS = ["wrong for it", "could work", "strong fit"];
// On a request path a slow Jev is a failed Jev: two calls must finish well
// inside the route's budget, so each gets one short try and one retry.
const ASK_JEV = { timeoutMs: 6_000, retries: 1 };

function askCard(kind: Kind, r: Row, dna: StyleDna) {
  const f = r.fields ?? {};
  return {
    ...summary(kind, r),
    thumbnail_url: str(f.landing_thumbnail_asset_url) || str(f.thumbnail_asset_url) || null,
    traits: topTraits(dna).map((t) => t.label),
  };
}

// What an answer needs of each style, and nothing else. A full read of the two
// sets is 9.6 MB — every row carries its tokens, taste vector and manifests —
// and on a cold server that read, not Jev, was most of the wait. The pool is a
// megabyte and is shared between server instances through the data cache. It
// is rebuilt every two minutes and aged from when it was built, not fetched:
// a style taken off the visitor shelf must leave anonymous answers promptly.
type PoolStyle = { kind: "language" | "art_style"; row: Row; dna: StyleDna; doc: string };
const POOL_FIELDS = [
  "name", "slug", "tags", "medium", "family_id", "taxonomy_ids", "shown_to_visitors", "Shown_to_visitors", "ShownToVisitors",
  "landing_thumbnail_asset_url", "thumbnail_asset_url",
];
const POOL_TTL_S = 120;

async function buildAskPool(): Promise<{ styles: PoolStyle[]; undescribed: number; builtAt: number }> {
  const kinds = ["language", "art_style"] as const;
  const sets = await Promise.all(kinds.map(async (k) => withDevFields(await readAll(SET[k], PUBLISHED))));
  const styles: PoolStyle[] = [];
  let undescribed = 0;
  kinds.forEach((kind, i) => {
    for (const full of sets[i]) {
      if (!str(full.fields?.name)) continue;
      const dna = storedDna(full.fields, JEV_MODEL);
      if (!dna) {
        undescribed++;
        continue;
      }
      const fields: Record<string, unknown> = {};
      for (const key of POOL_FIELDS) if (full.fields?.[key] !== undefined) fields[key] = full.fields[key];
      styles.push({ kind, row: { entity_id: full.entity_id, fields, booleans: full.booleans }, dna, doc: buildStyleDoc(kind, full.fields).slice(0, 700) });
    }
  });
  return { styles, undescribed, builtAt: Date.now() };
}

const sharedAskPool = unstable_cache(buildAskPool, ["ask-pool", JEV_MODEL], { revalidate: POOL_TTL_S });
let localAskPool: Awaited<ReturnType<typeof buildAskPool>> | null = null;

async function askPool() {
  const fresh = (pool: { builtAt: number }) => Date.now() - pool.builtAt < POOL_TTL_S * 1000;
  if (localAskPool && fresh(localAskPool)) return localAskPool;
  // The dev field overlay reads a local file; the shared cache would hide edits to it.
  let pool = process.env.KATAGAMI_DEV_FIELDS_FILE ? await buildAskPool() : await sharedAskPool();
  // The shared cache serves a stale entry while it revalidates; past its age, or
  // if a read came back empty, build here rather than answer from it.
  if (!fresh(pool) || pool.styles.length === 0) pool = await buildAskPool();
  if (pool.styles.length > 0) localAskPool = pool;
  return pool;
}

export async function askLibrary(tier: Tier, a: AskArgs) {
  const query = a.query.trim().slice(0, ASK_MAX_QUERY);
  const limit = Math.min(Math.max(a.limit ?? 8, 1), 20);
  const started = Date.now();
  const all = await askPool();
  const inView = all.styles.filter((p) => (!a.kind || p.kind === a.kind) && (tier === "full" || isShownToVisitors(p.row)));
  const pool = inView;
  // Styles with no DNA yet cannot be told apart by tier without the full rows;
  // the count is of the whole library and is reported only to the full tier.
  const unread = tier === "full" && !a.kind ? all.undescribed : 0;
  const readMs = Date.now() - started;
  if (pool.length === 0) {
    return { query, tier, model: null, considered: 0, unread, wants: [], avoids: [], results: [], strange: [], timings_ms: { read: readMs, want: 0, fit: 0 }, note: "No style in view has been described yet." };
  }

  const wantStarted = Date.now();
  // A reading handed back by the caller is used only if it is whole and in range.
  const given = a.want && STYLE_DNA_QUESTIONS.every((q) => typeof a.want?.[q.id] === "number" && a.want[q.id] >= 0 && a.want[q.id] <= 1) ? (a.want as StyleDna) : null;
  const want = given ?? dnaFromAnswers((await askJev(`Product: ${query}`, wantQuestions(), ASK_JEV)).answers);
  const wantMs = Date.now() - wantStarted;
  if (!want) throw new JevUnavailableError("Jev left a question about the product unanswered");

  const crowd = centroid(pool.map((p) => p.dna));
  const ranked = pool
    .map((p) => ({ ...p, match: matchScore(want, p.dna), odd: oddness(p.dna, crowd) }))
    .sort((x, y) => y.match - x.match);
  const shortlist = ranked.slice(0, ASK_SHORTLIST);
  const round = (n: number) => Math.round(n * 100) / 100;
  const leaning = STYLE_DNA_QUESTIONS.map((q) => ({ label: q.label, value: want[q.id] }));
  const wants = leaning.filter((l) => l.value >= 0.6).sort((x, y) => y.value - x.value).slice(0, 6).map((l) => l.label);
  const avoids = leaning.filter((l) => l.value <= 0.2).sort((x, y) => x.value - y.value).slice(0, 4).map((l) => l.label);
  const tierNote = tier === "sample" ? "Matched against the visitor shelf. Sign in with Google to ask the full library." : "Matched against the full library.";
  if (a.stage === "match") {
    const names = new Set<string>();
    const first = shortlist.filter((p) => {
      const name = str(p.row.fields?.name).toLowerCase();
      return names.has(name) ? false : Boolean(names.add(name));
    });
    return {
      query, tier, model: JEV_MODEL, considered: pool.length, unread, provisional: true, want,
      timings_ms: { read: readMs, want: wantMs, fit: 0 }, wants, avoids,
      results: first.slice(0, limit).map((p) => ({ ...askCard(p.kind, p.row, p.dna), fit: null, match: round(p.match) })),
      strange: [],
      note: tierNote,
    };
  }
  // Outsiders: the oddest styles in the next band down, so the second call can
  // find a fit the DNA match alone ranked too low to show.
  const outsiders = ranked
    .slice(ASK_SHORTLIST, ASK_SHORTLIST + 96)
    .sort((x, y) => y.odd - x.odd)
    .slice(0, ASK_OUTSIDERS);
  const judged = [...shortlist, ...outsiders];

  const fitStarted = Date.now();
  const fitRes = await askJev(
    `Product: ${query}`,
    Object.fromEntries(
      judged.map((p, i) => [
        `s${i}`,
        score(`How well would this style serve the product?\n${p.doc}`, FIT_LEVELS),
      ]),
    ),
    ASK_JEV,
  );
  const fitMs = Date.now() - fitStarted;
  const scored = judged.map((p, i) => {
    const fit = fitRes.answers[`s${i}`]?.score;
    // An unscored style must not pass as "a stretch": without every score the
    // ranking is the DNA match wearing the fit's label.
    if (typeof fit !== "number" || !Number.isFinite(fit)) {
      throw new JevUnavailableError("Jev left a style's fit unscored");
    }
    // Jev's score is the expected level index (0..2); normalise to 0..1.
    return { ...p, fit: Math.min(1, Math.max(0, fit / (FIT_LEVELS.length - 1))) };
  });

  // One card per name: the library holds a few same-named siblings.
  const seen = new Set<string>();
  const unique = scored
    .sort((x, y) => y.fit - x.fit || y.match - x.match)
    .filter((p) => {
      const name = str(p.row.fields?.name).toLowerCase();
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  const results = unique.slice(0, limit);
  const shown = new Set(results.map((p) => p.row.entity_id));
  const strange = unique
    .filter((p) => !shown.has(p.row.entity_id) && p.fit >= 0.4)
    .sort((x, y) => y.odd - x.odd)
    .slice(0, 3);

  const out = (p: (typeof unique)[number]) => ({ ...askCard(p.kind, p.row, p.dna), fit: round(p.fit), match: round(p.match) });
  return {
    query,
    tier,
    model: fitRes.model,
    considered: pool.length,
    unread,
    timings_ms: { read: readMs, want: wantMs, fit: fitMs },
    provisional: false,
    wants,
    avoids,
    results: results.map(out),
    strange: strange.map(out),
    note: tierNote,
  };
}

// --- get by id/slug ---------------------------------------------------------

async function resolve(kind: Kind, idOrSlug: string, tier: Tier): Promise<Row | null> {
  // The visible set already applies the tier gate (sample = the capped sample).
  const all = await visibleRows(kind, tier);
  const inSet = all.find((r) => r.entity_id === idOrSlug || str(r.fields?.slug) === idOrSlug);
  if (inSet) return inSet;
  // Full tier may also fetch a Published entity directly by id (covers any not
  // in the just-read page). Sample tier gets nothing outside its sample.
  if (tier === "full" && idOrSlug.startsWith("en-")) {
    const direct = await readOne(SET[kind], idOrSlug);
    if (direct && direct.status === "Published") return direct;
  }
  return null;
}

export const NEEDS_SIGN_IN = {
  error: "not_available_on_sample_tier",
  message:
    "This design isn't in the anonymous sample. Sign in with Google to unlock the full catalog (see whoami).",
};

export const NOT_FOUND = {
  error: "not_found",
  message: "No published design with that id or slug.",
};

export async function getDesign(kind: Kind, idOrSlug: string, tier: Tier) {
  const row = await resolve(kind, idOrSlug, tier);
  if (!row) return null;
  const f = row.fields ?? {};
  const parse = (k: string) => {
    const v = f[k];
    if (typeof v !== "string" || !v.trim()) return v ?? null;
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  };
  const base = {
    ...summary(kind, row),
    tokens: parse("tokens"),
    guidance: parse("guidance"),
  };
  if (kind === "language") {
    return {
      ...base,
      philosophy: parse("philosophy"),
      rules: parse("rules"),
      layout_principles: parse("layout_principles"),
      imagery_direction: parse("imagery_direction"),
    };
  }
  if (kind === "palette") {
    return { ...base, signature: parse("signature"), neutrals: parse("neutrals"), semantic: parse("semantic"), ramps: parse("ramps") };
  }
  return {
    ...base,
    medium: str(f.medium),
    prompt_template: str(f.prompt_template),
    slot_recipes: parse("slot_recipes"),
    negative_prompt: str(f.negative_prompt),
  };
}

export async function getDesignMd(idOrSlug: string, tier: Tier): Promise<{ url: string } | null> {
  const row = await resolve("language", idOrSlug, tier);
  if (!row) return null;
  return { url: `${GALLERY}/language/${row.entity_id}/DESIGN.md` };
}

export async function getEmbodiment(kind: Kind, idOrSlug: string, tier: Tier) {
  const row = await resolve(kind, idOrSlug, tier);
  if (!row) return null;
  return { url: `${GALLERY}/${PATH[kind]}/${row.entity_id}`, note: "Open in a browser to see the style rendered across canonical UI elements." };
}

// --- tokens (+ tailwind / css) ----------------------------------------------

export async function getTokens(kind: Kind, idOrSlug: string, tier: Tier, format: "json" | "tailwind" | "css") {
  const row = await resolve(kind, idOrSlug, tier);
  if (!row) return null;
  let tokens: Record<string, unknown> = {};
  const raw = row.fields?.tokens;
  if (typeof raw === "string" && raw.trim()) {
    try {
      tokens = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      tokens = {};
    }
  } else if (raw && typeof raw === "object") {
    tokens = raw as Record<string, unknown>;
  }
  if (format === "json") return { format, tokens };

  const colors = (tokens.colors ?? {}) as Record<string, string>;
  const radii = (tokens.radii ?? {}) as Record<string, string>;
  const typo = (tokens.typography ?? {}) as Record<string, string>;
  if (format === "css") {
    const lines = [
      ":root {",
      ...Object.entries(colors).map(([k, v]) => `  --color-${k}: ${v};`),
      ...Object.entries(radii).map(([k, v]) => `  --radius-${k}: ${v};`),
      typo.body_font ? `  --font-body: ${typo.body_font};` : "",
      typo.heading_font ? `  --font-heading: ${typo.heading_font};` : "",
      "}",
    ].filter(Boolean);
    return { format, css: lines.join("\n") };
  }
  // tailwind
  const config = {
    theme: {
      extend: {
        colors,
        borderRadius: radii,
        fontFamily: {
          ...(typo.heading_font ? { heading: [typo.heading_font] } : {}),
          ...(typo.body_font ? { body: [typo.body_font] } : {}),
          ...(typo.mono_font ? { mono: [typo.mono_font] } : {}),
        },
      },
    },
  };
  return { format, tailwind_config: config };
}

// --- ask the encyclopedia: directions, made or not ----------------------------
//
// The same sentence, put to the encyclopedia's art and design cells: which named
// directions would be a useful reference for this product — including the ones
// the library has made nothing for yet, which is where a new language could go.
// Every direction-naming cell is asked (no walk down the tree, so no early wrong
// turn hides one): about 870 cells in eight Jev calls made together, roughly a
// fifth of a cent. Roots and container headings are left out — they are true of
// everything under them.

/** Cut at a word, and say so: a description must not end mid-syllable. */
function clipWords(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 30)).replace(/[\s,;:.]+$/, "")}…`;
}

type Concept = { id: string; name: string; description: string; made: number };
const CONCEPT_TTL_S = 600;
const CONCEPT_BATCH = 120;
const CONTAINER_KIDS = 10;
// Below this a direction is a guess. A plain product (a ferry timetable) tops out
// near 0.5 where a pointed one (a punk zine) reaches 0.9, so the floor is low and
// the list is short rather than the other way round.
const CONCEPT_FLOOR = 0.4;

async function buildConceptPool(): Promise<{ concepts: Concept[]; builtAt: number }> {
  const rows = await readAll("EncyclopediaCells", "Status ne 'Archived'");
  type Doc = { name: string; description: string; maps: string[]; broader: string[]; made: number };
  const cells = new Map<string, Doc>();
  for (const row of rows) {
    let doc: unknown;
    try {
      doc = JSON.parse(str(row.fields?.document));
    } catch {
      continue;
    }
    if (!doc || typeof doc !== "object" || Array.isArray(doc)) continue;
    const d = doc as Record<string, unknown>;
    const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object") : []);
    const maps = list(d.maps).map((m) => str(m.map));
    if (!str(d.name) || !maps.some((m) => m === "art" || m === "design")) continue;
    cells.set(row.entity_id, {
      name: str(d.name),
      description: str(d.description),
      maps,
      broader: list(d.broader).map((b) => str(b.cellId)),
      made: list(d.manifestations).length,
    });
  }
  const kids = new Map<string, string[]>();
  for (const [id, c] of cells) for (const b of c.broader) if (cells.has(b)) kids.set(b, [...(kids.get(b) ?? []), id]);
  const depth = new Map<string, number>();
  const queue = [...cells.keys()].filter((id) => !cells.get(id)!.broader.some((b) => cells.has(b)));
  for (const root of queue) depth.set(root, 0);
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const kid of kids.get(id) ?? []) {
      if (!depth.has(kid)) {
        depth.set(kid, depth.get(id)! + 1);
        queue.push(kid);
      }
    }
  }
  const concepts: Concept[] = [];
  for (const [id, c] of cells) {
    const d = depth.get(id) ?? 0;
    const narrower = kids.get(id)?.length ?? 0;
    if (c.name.startsWith("<") || /\((hierarchy name|works)\)/.test(c.name) || narrower >= CONTAINER_KIDS) continue;
    if (d >= 2 || (d >= 1 && narrower === 0)) concepts.push({ id, name: c.name, description: clipWords(c.description, 170), made: c.made });
  }
  return { concepts, builtAt: Date.now() };
}

const sharedConceptPool = unstable_cache(buildConceptPool, ["ask-concepts"], { revalidate: CONCEPT_TTL_S });
let localConceptPool: Awaited<ReturnType<typeof buildConceptPool>> | null = null;

async function conceptPool() {
  const fresh = (pool: { builtAt: number }) => Date.now() - pool.builtAt < CONCEPT_TTL_S * 1000;
  if (localConceptPool && fresh(localConceptPool)) return localConceptPool;
  let pool = await sharedConceptPool();
  if (!fresh(pool) || pool.concepts.length === 0) pool = await buildConceptPool();
  if (pool.concepts.length > 0) localConceptPool = pool;
  return pool;
}

export async function askConcepts(queryIn: string, limit = 6) {
  const query = queryIn.trim().slice(0, ASK_MAX_QUERY);
  const started = Date.now();
  const { concepts } = await conceptPool();
  const readMs = Date.now() - started;
  const batches: Concept[][] = [];
  for (let at = 0; at < concepts.length; at += CONCEPT_BATCH) batches.push(concepts.slice(at, at + CONCEPT_BATCH));
  const judgeStarted = Date.now();
  // One slow batch must not cost the whole answer: whatever came back is
  // ranked, and only a fan-out that returned nothing at all is a failure.
  const settled = await Promise.allSettled(
    batches.map(async (batch) => {
      const res = await askJev(
        `Product: ${query}`,
        Object.fromEntries(
          batch.map((c, i) => [`c${i}`, noul(`A designer working on this product would reach for the following direction as a visual reference.\n${c.name}: ${c.description}`)]),
        ),
        ASK_JEV,
      );
      return batch.flatMap((c, i) => {
        const n = res.answers[`c${i}`]?.noul;
        return typeof n === "number" && Number.isFinite(n) ? [{ ...c, relevance: Math.round(n * 100) / 100 }] : [];
      });
    }),
  );
  const answered = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (answered.flat().length === 0) throw new JevUnavailableError("Jev answered none of the encyclopedia batches");
  const ranked = answered.flat().filter((c) => c.relevance >= CONCEPT_FLOOR).sort((x, y) => y.relevance - x.relevance);
  return {
    query,
    considered: answered.reduce((n, batch) => n + batch.length, 0),
    timings_ms: { read: readMs, judge: Date.now() - judgeStarted },
    // Two lists, because they are two different offers: a direction with work
    // to look at now, and a direction nobody has made anything for yet.
    made: ranked.filter((c) => c.made > 0).slice(0, limit),
    unmade: ranked.filter((c) => c.made === 0).slice(0, limit),
  };
}

// --- the library atlas ---------------------------------------------------------
//
// A map to browse instead of a list. Places come from scripts/library_atlas.py
// (Jev's pairwise "same visual idea?" over the whole library); this only reads
// them, through the same gate as everything else. A sample-tier caller gets the
// shelf's places and nothing that names an off-shelf style: neighbours are cut
// to the visible set and a family is labelled by a member the caller can see.

export type AtlasStyle = {
  id: string;
  kind: "language" | "art_style";
  name: string;
  href: string;
  thumbnail_url: string | null;
  x: number;
  y: number;
  family: string | null;
  neighbors: { id: string; similarity: number }[];
  /** Style-DNA question ids this style answers strongly (may be empty). */
  traits: string[];
  /** Hue bucket of a language's primary colour; art styles have none. */
  hue: string | null;
  /** The colour the thumbnail reads as from a distance (scripts/style-inks.mjs); null until that has been run for it. */
  ink: string | null;
};

export type AtlasHole = { id: string; name: string; description: string; x: number; y: number };

/** The picture a style is shown by on the atlas and the explore views. Many art-style thumbnails were made by
 *  forcing a square or tall reference into 600×400, which stretches it; the first reference image is the
 *  undistorted original, and the optimizer sizes it down just the same. */
function atlasPicture(kind: "language" | "art_style", f: Record<string, unknown>): string | null {
  if (kind === "art_style") {
    try {
      const ids: unknown = JSON.parse(str(f.reference_image_file_ids) || "[]");
      if (Array.isArray(ids) && typeof ids[0] === "string" && /^fl-[0-9a-f-]+$/.test(ids[0])) return `/api/file/${ids[0]}`;
    } catch {
      // fall through to the thumbnail
    }
  }
  return str(f.landing_thumbnail_asset_url) || str(f.thumbnail_asset_url) || null;
}

export async function libraryAtlas(tier: Tier) {
  const kinds = ["language", "art_style"] as const;
  const rowSets = await Promise.all(kinds.map((k) => visibleRows(k, tier)));
  const rows = kinds.flatMap((kind, i) => rowSets[i].map((row) => ({ kind, row })));

  // One run's places only: the version most rows carry.
  const versions = new Map<string, number>();
  for (const { row } of rows) {
    const v = str(row.fields?.atlas_version);
    if (v) versions.set(v, (versions.get(v) ?? 0) + 1);
  }
  const version = [...versions.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const placed = rows.filter(({ row }) => {
    const f = row.fields ?? {};
    return version !== null && str(f.atlas_version) === version && Number.isFinite(Number.parseFloat(str(f.atlas_x))) && Number.isFinite(Number.parseFloat(str(f.atlas_y)));
  });
  const visible = new Set(placed.map(({ row }) => row.entity_id));

  // A family is stored as its medoid's entity id, and the medoid is chosen over
  // the whole library — so to a shelf caller it may be an off-shelf id. The
  // client gets an opaque key instead.
  const familyKeys = new Map<string, string>();
  const familyKey = (medoid: string) => {
    if (!medoid) return null;
    if (!familyKeys.has(medoid)) familyKeys.set(medoid, `f${familyKeys.size + 1}`);
    return familyKeys.get(medoid) ?? null;
  };
  const medoidOf = new Map<string, string>();

  const styles: AtlasStyle[] = placed.map(({ kind, row }) => {
    const f = row.fields ?? {};
    let neighbors: { id: string; similarity: number }[] = [];
    try {
      const parsed: unknown = JSON.parse(str(f.atlas_neighbors) || "[]");
      if (Array.isArray(parsed)) {
        neighbors = parsed
          .filter((n): n is [string, number] => Array.isArray(n) && typeof n[0] === "string" && typeof n[1] === "number")
          .filter(([id]) => visible.has(id))
          .map(([id, similarity]) => ({ id, similarity }));
      }
    } catch {
      // a misshapen neighbour list costs that style its neighbours, not the map
    }
    return {
      id: row.entity_id,
      kind,
      name: str(f.name),
      href: `/${PATH[kind]}/${row.entity_id}`,
      thumbnail_url: atlasPicture(kind, f),
      x: Number.parseFloat(str(f.atlas_x)),
      y: Number.parseFloat(str(f.atlas_y)),
      traits: str(f.style_traits).trim().split(/\s+/).filter(Boolean),
      hue: str(f.hue_bucket) || null,
      ink: (styleInks.inks as Record<string, string>)[createHash("sha256").update(row.entity_id).digest("hex").slice(0, 12)] ?? null,
      family: (() => {
        const key = familyKey(str(f.atlas_family));
        if (key) medoidOf.set(key, str(f.atlas_family));
        return key;
      })(),
      neighbors,
    };
  });

  const byFamily = new Map<string, AtlasStyle[]>();
  for (const s of styles) if (s.family) byFamily.set(s.family, [...(byFamily.get(s.family) ?? []), s]);
  const families = [...byFamily.entries()]
    .filter(([, members]) => members.length >= 2)
    .map(([id, members]) => {
      // A family has a name of its own (data/atlas-families.json, written for
      // this run). Without one it borrows a member's the caller can see.
      const medoid = medoidOf.get(id) ?? "";
      const given = atlasFamilies.atlas_version === version ? (atlasFamilies.names as Record<string, string>)[createHash("sha256").update(medoid).digest("hex").slice(0, 12)] : undefined;
      const named = members.find((m) => m.id === medoid) ?? [...members].sort((a, b) => a.name.localeCompare(b.name))[0];
      const x = members.reduce((sum, m) => sum + m.x, 0) / members.length;
      const y = members.reduce((sum, m) => sum + m.y, 0) / members.length;
      return {
        id,
        label: given ?? named.name,
        lead: named.id,
        count: members.length,
        x,
        y,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Coming soon: directions the encyclopedia names that no style here was made
  // for, placed beside the made work nearest to them (scripts/atlas_holes.py).
  // They belong to one atlas run, so they are drawn only beside that run's places.
  const holes: AtlasHole[] = atlasHoles.atlas_version === version ? atlasHoles.holes.map((h) => ({ id: h.id, name: h.name, description: h.description, x: h.x, y: h.y })) : [];

  return { tier, version, styles, families, holes, unplaced: rows.length - placed.length };
}

// --- check a page against a language -----------------------------------------
//
// The scorecard an agent asks for after building with a language: what code can
// measure (colours, typefaces, radii against the tokens) and what needs a look
// (each rule, do and don't, as one Jev noul over the page source). One Jev call.
// It reports; it does not gate — a contributor's submission is still reviewed.

export async function checkAgainstLanguage(tier: Tier, idOrSlug: string, page: string) {
  const design = await getDesign("language", idOrSlug, tier);
  if (!design) return null;
  const state = pageState(page);
  const measured = measuredChecks(design, page);
  // Guidance first: a language's don'ts are its sharpest lines, so they are never the ones cut.
  const every = judgedChecks(design);
  const checks = [...every.filter((c) => c.kind !== "rule"), ...every.filter((c) => c.kind === "rule")].slice(0, MAX_JUDGED);
  let judged: { kind: string; name: string; rule: string; follows: number; verdict: string }[] = [];
  let model: string | null = null;
  if (checks.length > 0) {
    const res = await askJev(`A web page built with the design language "${design.name}". Its source:\n${state}`, judgedQuestions(checks), { timeoutMs: 12_000, retries: 1 });
    model = res.model;
    judged = checks.map((c, i) => {
      const noul = res.answers[`c${i}`]?.noul;
      if (typeof noul !== "number" || !Number.isFinite(noul)) throw new JevUnavailableError("Jev left a rule unjudged");
      return { kind: c.kind, name: c.name, rule: c.text, ...verdictOf(noul, c.expect) };
    });
  }
  const all = [...measured, ...judged];
  const count = (v: string) => all.filter((c) => c.verdict === v).length;
  return {
    language: { id: design.id, name: design.name, url: design.url },
    model,
    page_chars_read: state.length,
    page_truncated: state.length < page.trim().length && state.length >= 24_000,
    summary: { pass: count("pass"), unclear: count("unclear"), fail: count("fail") },
    checks_not_judged: every.length - checks.length,
    // Worst first: what to fix is the point of asking.
    measured,
    judged: judged.sort((a, b) => a.follows - b.follows),
    note: "Measured checks are exact. Judged checks are a fast model's reading of the page source, not a review: treat 'fail' as where to look first and 'unclear' as not decided.",
  };
}
