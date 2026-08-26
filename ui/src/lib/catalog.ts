import "server-only";
import { isFeaturedRecord as isFeatured } from "./featured.mjs";
import { rowMatchesIdOrSlug } from "./catalog-membership.mjs";

// The ONE catalog gate (ARN-360). Both the website and the read MCP read the
// commons through this module, so "what an identity may see" is defined once.
//
// Tiering: anonymous → the featured sample; authenticated → the full catalog.
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
    featured: isFeatured(r),
    url: `${GALLERY}/${PATH[kind]}/${r.entity_id}`,
    ...(kind === "language"
      ? { design_md_url: `${GALLERY}/language/${r.entity_id}/DESIGN.md` }
      : {}),
  };
}

const PUBLISHED = "Status eq 'Published'";

const byEntityId = (a: Row, b: Row) =>
  a.entity_id < b.entity_id ? -1 : a.entity_id > b.entity_id ? 1 : 0;

/** Gate: which published rows may this tier see? */
async function visibleRows(kind: Kind, tier: Tier): Promise<Row[]> {
  const rows = (await readAll(SET[kind], PUBLISHED)).filter((r) => str(r.fields?.name));
  if (tier === "full") return rows;
  // The anonymous portion is the owner-curated visitor shelf — the `featured`
  // set — for ALL three kinds, sorted by entity_id so it is a fixed slice a
  // patient caller can't page past. Uncapped: the shelf is exactly what the
  // owner selected, and byte-for-byte identical to every other anonymous
  // surface (they all filter by featuredIds()).
  return rows.filter(isFeatured).sort(byEntityId);
}

/**
 * The ONE source of truth for the anonymous "portion" of a kind: the set of
 * published entity_ids a signed-out visitor may see — the owner-curated visitor
 * shelf (the `featured` set), for languages, art styles, AND palettes alike.
 * Every anonymous-facing surface — the website pages, its search/vectors APIs,
 * the studio/compare tools, and the MCP — filters by this set, so the portion
 * can never diverge between them.
 */
export async function featuredIds(kind: Kind): Promise<Set<string>> {
  const rows = await readAll(SET[kind], PUBLISHED);
  // On the shelf = featured AND has a name — the same predicate visibleRows
  // uses, so a nameless-but-featured junk row can't make this set diverge from
  // what the MCP sample and the website shelves actually render.
  return new Set(
    rows.filter((r) => str(r.fields?.name) && isFeatured(r)).map((r) => r.entity_id),
  );
}

/** May a signed-out visitor see this published id or slug? The visitor shelf
 *  (featured AND named) for ALL kinds — palettes included. featuredIds() stays
 *  id-keyed (list filters); this accepts a slug too so a by-id-or-slug door like
 *  BRIEF.md?palette=komawari-plates&art=cathode-ray isn't 404'd as a miss. */
export async function anonMaySee(kind: Kind, idOrSlug: string): Promise<boolean> {
  const rows = await readAll(SET[kind], PUBLISHED);
  return rows.some(
    (r) => str(r.fields?.name) && isFeatured(r) && rowMatchesIdOrSlug(r, idOrSlug),
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
