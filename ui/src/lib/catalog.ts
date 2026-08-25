import "server-only";

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

/** Read every row of a set, following @odata.nextLink to completion. */
async function readAll(set: string, filter: string): Promise<Row[]> {
  const out: Row[] = [];
  let url: string | null =
    `${API_BASE}/tdata/${set}?$filter=${encodeURIComponent(filter)}&$top=500`;
  let guard = 0;
  while (url && guard++ < 50) {
    const current: string = url;
    const res: Response = await fetch(current, { headers: headers(), cache: "no-store" });
    if (!res.ok) throw new Error(`Read ${set} failed ${res.status}`);
    const body = (await res.json()) as { value?: Row[]; "@odata.nextLink"?: string };
    out.push(...(body.value ?? []));
    const next = body["@odata.nextLink"];
    // nextLink is relative to the request URI (e.g. "DesignLanguages?…") —
    // resolve it the spec-correct way, not by prefixing the origin (which
    // drops /tdata and 404s on page 2).
    url = next ? new URL(next, current).toString() : null;
  }
  return out;
}

async function readOne(set: string, id: string): Promise<Row | null> {
  const res = await fetch(`${API_BASE}/tdata/${set}('${encodeURIComponent(id)}')`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) return null;
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
function truthy(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}
function isFeatured(r: Row): boolean {
  const f = r.fields ?? {};
  const b = r.booleans ?? {};
  return truthy(f.featured) || truthy(f.Featured) || truthy(b.featured) || truthy(b.Featured);
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

// The anonymous sample: featured entities first, then filled to a cap per kind
// (mirrors the website's signed-out teaser). Featured-first keeps it curated;
// the fill guarantees every kind has a usable sample even where nothing is
// featured yet (palettes and art styles currently have 0 featured).
const SAMPLE_CAP = 40;

/** Gate: which published rows may this tier see? */
async function visibleRows(kind: Kind, tier: Tier): Promise<Row[]> {
  const rows = (await readAll(SET[kind], PUBLISHED)).filter((r) => str(r.fields?.name));
  if (tier === "full") return rows;
  const featured = rows.filter(isFeatured);
  const rest = rows.filter((r) => !isFeatured(r));
  return [...featured, ...rest].slice(0, SAMPLE_CAP);
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
        ? "You are on the anonymous SAMPLE tier (featured designs only). Sign in with Google to unlock the full catalog — see whoami."
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

function matchName(rows: Row[], names: Map<string, string>, needle: string): Set<string> {
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
    const famIds = matchName(rows, taxNames, a.family);
    hits = hits.filter((r) => famIds.has(str(r.fields?.family_id)));
  }
  if (a.taxonomy) {
    const taxIds = matchName(rows, taxNames, a.taxonomy);
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
