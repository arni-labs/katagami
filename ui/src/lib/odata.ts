import {
  demoArtStyles,
  demoDesignLanguages,
  demoPaletteSystems,
  getDemoArtStyle,
  getDemoDesignLanguage,
  getDemoPaletteSystem,
} from "@/lib/demo-catalog";

function cleanEnv(value: string | undefined, fallback: string): string {
  const cleaned = (value ?? fallback).replace(/\\n/g, "").trim();
  return cleaned || fallback;
}

const API_BASE = cleanEnv(
  process.env.NEXT_PUBLIC_TEMPER_API_URL,
  "http://localhost:3500",
);
const TENANT = cleanEnv(process.env.NEXT_PUBLIC_TEMPER_TENANT, "default");
const API_KEY = cleanEnv(process.env.TEMPER_API_KEY, "");
const FILE_PROXY_CACHE_VERSION = "asset-cdn-v3";

interface ODataResponse<T> {
  value: T[];
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
}

const headers: Record<string, string> = {
  "Content-Type": "application/json",
  "X-Tenant-Id": TENANT,
  ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
};

// OData reads are GET-only (mutations live in odata-mutations.ts), so they're
// safe to cache. Every page re-fetched the whole catalog from Temper on each
// request with `no-store`, which made SSR slow (2.5–3.5s TTFB) and every reload
// re-do all of it. A short revalidate window serves cached data (fast) and stays
// fresh: UI mutations already revalidatePath the affected routes, and new
// pipeline-published content appears within the window.
const ODATA_REVALIDATE_SECONDS = 60;

async function odata<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(odataUrl(path), {
    ...init,
    headers: { ...headers, ...init?.headers },
    next: { revalidate: ODATA_REVALIDATE_SECONDS },
  });
  if (!res.ok) {
    throw new Error(`OData ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function odataUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    const url = new URL(path);
    if (url.origin !== new URL(API_BASE).origin) {
      throw new Error(`Refusing cross-origin OData nextLink: ${url.origin}`);
    }
    return url.toString();
  }
  const normalized = path.startsWith("/tdata/")
    ? path.slice("/tdata/".length)
    : path.replace(/^\/+/, "");
  return `${API_BASE}/tdata/${normalized}`;
}

async function collectODataPages<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  let next: string | undefined = path;
  let pageCount = 0;

  while (next) {
    pageCount += 1;
    if (pageCount > 100) {
      throw new Error(`OData pagination exceeded 100 pages for ${path}`);
    }

    const resp: ODataResponse<T> = await odata<ODataResponse<T>>(next);
    rows.push(...resp.value);
    next = resp["@odata.nextLink"];
  }

  return rows;
}

// ── Design Languages ──

export interface DesignLanguage {
  entity_id: string;
  status: string;
  sequence_nr?: number;
  total_event_count?: number;
  fields: {
    Id?: string;
    Status?: string;
    CreatedAt?: string;
    UpdatedAt?: string;
    PublishedAt?: string;
    created_at?: string;
    updated_at?: string;
    published_at?: string;
    name?: string;
    slug?: string;
    philosophy?: string;
    tokens?: string;
    rules?: string;
    layout_principles?: string;
    guidance?: string;
    imagery_direction?: string;
    generative_canvas?: string;
    design_md_file_id?: string;
    design_md_asset_url?: string;
    design_md_asset_id?: string;
    design_md_lint_result?: string;
    design_md_format_version?: string;
    shadcn_export_file_id?: string;
    shadcn_export_format_version?: string;
    shadcn_export_manifest?: string;
    shadcn_component_spec_file_id?: string;
    shadcn_component_spec_format_version?: string;
    shadcn_component_spec_manifest?: string;
    shadcn_preview_shots_file_id?: string;
    shadcn_preview_shots_format_version?: string;
    shadcn_preview_shots_manifest?: string;
    embodiment_file_id?: string;
    embodiment_asset_url?: string;
    embodiment_asset_id?: string;
    landing_file_id?: string;
    dashboard_file_id?: string;
    thumbnail_file_id?: string;
    thumbnail_asset_url?: string;
    thumbnail_asset_id?: string;
    landing_thumbnail_file_id?: string;
    landing_thumbnail_asset_url?: string;
    parent_ids?: string;
    lineage_type?: string;
    generation_number?: string;
    taxonomy_ids?: string;
    tags?: string;
    taste_vector?: string;
    taste_vector_model?: string;
    curator_notes?: string;
    source_ids?: string;
    element_count?: string;
    composition_count?: string;
    embodiment_format?: string;
    [key: string]: string | undefined;
  };
  counters: {
    version?: number;
    element_count?: number;
    composition_count?: number;
    fork_count?: number;
    usage_count?: number;
    display_order?: number;
  };
  booleans: Record<string, boolean> & { featured?: boolean };
}

// The full set of fields needed to render a gallery card:
// identifiers, status flags the badge/sort uses, embodiment pointers,
// taxonomy/tags for filters, and the two heavy JSON blobs the card
// actually reads (tokens for palette/typography, philosophy for the
// summary line). Heavier blobs (rules, layout_principles, guidance,
// generative_canvas, design_md_lint_result, curator_notes) are
// detail-page-only and skipped here.
export const DESIGN_LANGUAGE_GALLERY_FIELDS = [
  "Id",
  "Status",
  "slug",
  "name",
  "embodiment_file_id",
  "embodiment_asset_url",
  "embodiment_asset_id",
  "embodiment_format",
  "embodiment_verified",
  "has_embodiment",
  "landing_file_id",
  "thumbnail_file_id",
  "thumbnail_asset_url",
  "thumbnail_asset_id",
  // Static screenshot of the bespoke landing — the card's PREFERRED visual when
  // present (a stored image, not a live render); falls back to the embodiment
  // thumbnail otherwise.
  "landing_thumbnail_file_id",
  "landing_thumbnail_asset_url",
  "has_thumbnail",
  "thumbnail_verified",
  "taxonomy_ids",
  "tags",
  "tokens",
  "philosophy",
  "featured",
  "display_order",
  "fork_count",
  "version",
  "quality_review_passed",
  "review_status",
  "has_design_md",
  "has_valid_design_md",
  "design_md_verified",
  "has_published_assets",
  "has_shadcn_export",
  "shadcn_export_verified",
  "has_shadcn_component_spec",
  "shadcn_component_spec_verified",
  "has_shadcn_preview_shots",
  "shadcn_preview_shots_verified",
  "CreatedAt",
  "UpdatedAt",
  "PublishedAt",
  "sequence_nr",
  "total_event_count",
] as const;

// Booleans / counters that may arrive flattened on a $select response.
// Booleans we care about for gallery sort/filter:
const FLAT_BOOLEAN_KEYS = new Set([
  "featured",
  "embodiment_verified",
  "has_embodiment",
  "has_thumbnail",
  "thumbnail_verified",
  "has_design_md",
  "has_valid_design_md",
  "design_md_verified",
  "has_published_assets",
  "has_shadcn_export",
  "shadcn_export_verified",
  "has_shadcn_component_spec",
  "shadcn_component_spec_verified",
  "has_shadcn_preview_shots",
  "shadcn_preview_shots_verified",
  "quality_review_passed",
]);
// Counters used for sort/badge/usage:
const FLAT_COUNTER_KEYS = new Set([
  "display_order",
  "fork_count",
  "version",
  "element_count",
  "composition_count",
  "usage_count",
]);
// OData envelope keys (kept at top level when normalizing):
const ODATA_ENVELOPE_KEYS = new Set([
  "@odata.id",
  "@odata.context",
  "@odata.type",
  "entity_id",
  "entity_type",
  "status",
  "item_count",
  "fields",
  "booleans",
  "counters",
  "lists",
  "events",
  "sequence_nr",
  "total_event_count",
]);

// When a query goes through Temper's catalog-fast-read path with $select,
// the row is returned FLAT — top-level Id/Status/name/tokens/... — instead
// of the nested {entity_id, status, fields:{...}, booleans:{...}, counters:{...}}
// shape the rest of this codebase reads. Normalize so callers see the
// nested shape regardless of how OData chose to project.
function normalizeDesignLanguageRow(
  raw: Record<string, unknown>,
): DesignLanguage {
  if (raw && typeof raw.fields === "object" && raw.fields !== null) {
    const fields = raw.fields as Record<string, unknown>;
    const booleans = {
      ...((raw.booleans as Record<string, boolean> | undefined) ?? {}),
    };
    const counters = {
      ...((raw.counters as Record<string, number> | undefined) ?? {}),
    };
    for (const [key, value] of Object.entries(fields)) {
      if (FLAT_BOOLEAN_KEYS.has(key) && typeof value === "boolean") {
        booleans[key] = value;
      }
      if (FLAT_COUNTER_KEYS.has(key) && typeof value === "number") {
        counters[key] = value;
      }
    }
    return {
      ...raw,
      booleans,
      counters,
    } as unknown as DesignLanguage;
  }
  const fields: Record<string, unknown> = {};
  const booleans: Record<string, boolean> = {};
  const counters: Record<string, number> = {};
  const top: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (ODATA_ENVELOPE_KEYS.has(k)) {
      top[k] = v;
      continue;
    }
    if (k === "Id") {
      top.entity_id = v;
      fields.Id = v as string;
      continue;
    }
    if (k === "Status") {
      top.status = v;
      fields.Status = v as string;
      continue;
    }
    if (FLAT_BOOLEAN_KEYS.has(k) && typeof v === "boolean") {
      booleans[k] = v;
      continue;
    }
    if (FLAT_COUNTER_KEYS.has(k) && typeof v === "number") {
      counters[k] = v;
      continue;
    }
    fields[k] = v;
  }
  const canonicalId = parseODataEntityId(top["@odata.id"]);
  if (canonicalId) top.entity_id = canonicalId;
  return {
    ...top,
    fields,
    booleans,
    counters,
  } as unknown as DesignLanguage;
}

function parseODataEntityId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const match = value.match(/DesignLanguages\('([^']+)'\)/);
  return match?.[1];
}

function parseEntitySetId(
  value: unknown,
  entitySet: string,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const escaped = entitySet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = value.match(new RegExp(`${escaped}\\('([^']+)'\\)`));
  return match?.[1];
}

// OData defaults to a finite page when no $top is given. Ask for a large page
// and still follow @odata.nextLink so the gallery cannot silently drop rows as
// the catalog grows.
const DESIGN_LANGUAGE_PAGE_SIZE = 500;
const DESIGN_LANGUAGE_LIFECYCLE_STATUSES = [
  "Draft",
  "UnderReview",
  "Published",
  "Archived",
] as const;

export async function listDesignLanguages(
  filter?: string,
  orderby?: string,
  select?: readonly string[],
): Promise<DesignLanguage[]> {
  if (!filter) {
    let rowsByStatus: Record<string, unknown>[][];
    try {
      rowsByStatus = await Promise.all(
        DESIGN_LANGUAGE_LIFECYCLE_STATUSES.map((status) =>
          collectDesignLanguageRows(`Status eq '${status}'`, orderby, select),
        ),
      );
    } catch (err) {
      // Offline fallback: the local specimen catalog keeps the library
      // browsable when the Temper backend is unreachable.
      const demo = demoDesignLanguages();
      if (demo.length > 0) return demo;
      throw err;
    }
    const languages = new Map<string, DesignLanguage>();
    for (const rows of rowsByStatus) {
      for (const row of rows) {
        const language = normalizeDesignLanguageRow(row);
        languages.set(language.entity_id, language);
      }
    }
    for (const demo of demoDesignLanguages()) {
      if (!languages.has(demo.entity_id)) languages.set(demo.entity_id, demo);
    }
    return Array.from(languages.values());
  }

  const rows = (await collectDesignLanguageRows(filter, orderby, select)).map(
    normalizeDesignLanguageRow,
  );
  const statusMatch = filter.match(/^Status\s+eq\s+'([^']+)'$/i);
  if (!statusMatch) return rows;
  const demo = demoDesignLanguages().filter(
    (d) => d.status === statusMatch[1],
  );
  return demo.length > 0 ? [...rows, ...demo] : rows;
}

/** Cheap published count via OData `$count` — fetches no rows, so it can run
 *  at the page level without blocking on the full gallery payload. Matches the
 *  gallery's own count in production (the demo catalog is off there). */
export async function countDesignLanguages(
  filter = "Status eq 'Published'",
): Promise<number> {
  try {
    const params = new URLSearchParams();
    params.set("$filter", filter);
    params.set("$count", "true");
    params.set("$top", "0");
    const resp = await odata<ODataResponse<unknown>>(
      `DesignLanguages?${params.toString()}`,
    );
    const demoCount = demoDesignLanguages().filter(
      (d) => d.status === "Published",
    ).length;
    return (resp["@odata.count"] ?? 0) + demoCount;
  } catch {
    return 0;
  }
}

async function collectDesignLanguageRows(
  filter: string,
  orderby?: string,
  select?: readonly string[],
): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams();
  params.set("$filter", filter);
  if (orderby) params.set("$orderby", orderby);
  if (select && select.length > 0) params.set("$select", select.join(","));
  params.set("$top", String(DESIGN_LANGUAGE_PAGE_SIZE));
  const q = params.toString();
  return collectODataPages<Record<string, unknown>>(
    `DesignLanguages${q ? `?${q}` : ""}`,
  );
}

export async function getDesignLanguage(id: string): Promise<DesignLanguage> {
  const demo = getDemoDesignLanguage(id);
  if (demo) return demo;
  return normalizeDesignLanguageRow(
    await odata<Record<string, unknown>>(`DesignLanguages('${id}')`),
  );
}

// ── Taxonomy ──

export interface Taxonomy {
  entity_id: string;
  status: string;
  fields: {
    name?: string;
    parent_id?: string;
    description?: string;
    characteristics?: string;
    historical_context?: string;
    related_taxonomy_ids?: string;
    [key: string]: string | undefined;
  };
  counters: {
    language_count?: number;
  };
}

export async function listTaxonomies(
  filter?: string,
): Promise<Taxonomy[]> {
  // Temper's filtered taxonomy fast-read path can return stale projection rows
  // for lifecycle filters (for example old Draft "Untitled" test rows). Fetch
  // the canonical page and apply the small public filters locally.
  const params = new URLSearchParams();
  params.set("$top", "500");
  // Newly-created published nodes can sit past the first 500 rows (the library
  // accumulates hundreds of archived/draft taxonomies). Push an `eq` Status
  // filter to the server so those are returned; the client filter below stays
  // as a guard against stale projection rows.
  const serverMatch = filter?.match(/^Status\s+eq\s+'([^']+)'$/i);
  if (serverMatch) params.set("$filter", `Status eq '${serverMatch[1]}'`);
  const q = params.toString();
  let rows = await collectODataPages<Taxonomy>(
    `Taxonomies${q ? `?${q}` : ""}`,
  );
  if (filter) {
    const match = filter.match(/^Status\s+(eq|ne)\s+'([^']+)'$/i);
    if (match) {
      const [, op, expected] = match;
      rows = rows.filter((row) => {
        const status = row.status ?? row.fields.Status;
        return op.toLowerCase() === "eq"
          ? status === expected
          : status !== expected;
      });
    }
  }
  return rows.filter((row) => row.fields.name?.trim());
}

export interface TaxonomyParent {
  name: string;
  parentId: string;
}

let taxonomyIndexCache: { at: number; map: Map<string, TaxonomyParent> } | null =
  null;

/**
 * Taxonomy id → { name, parentId } for the WHOLE tree, so a leaf taxonomy can
 * be walked up to its root "family". The home gallery groups languages by root
 * family, which needs the full hierarchy (including unpublished interior nodes),
 * so this fetches every taxonomy once and memoizes for a few minutes — the tree
 * is effectively static between curation runs.
 */
export async function taxonomyFamilyIndex(): Promise<Map<string, TaxonomyParent>> {
  if (taxonomyIndexCache && Date.now() - taxonomyIndexCache.at < 5 * 60 * 1000) {
    return taxonomyIndexCache.map;
  }
  // The backend caps a page at 500 rows WITHOUT emitting an @odata.nextLink and
  // doesn't honor $skip (ARN-97), so a small $top silently truncates the tree
  // and breaks parent chains. A generous single-page $top pulls the whole tree.
  const rows = await collectODataPages<Record<string, unknown>>(
    "Taxonomies?$top=5000",
  );
  const map = new Map<string, TaxonomyParent>();
  for (const row of rows) {
    const id = typeof row.entity_id === "string" ? row.entity_id : "";
    if (!id) continue;
    let fields = (row.fields ?? {}) as Record<string, unknown>;
    // a handful of rows nest a second `fields` object
    if (fields.fields && typeof fields.fields === "object") {
      fields = fields.fields as Record<string, unknown>;
    }
    const name = String(
      fields.name ?? fields.Name ?? fields.display_name ?? "",
    ).trim();
    const parentId = String(fields.parent_id ?? fields.ParentId ?? "").trim();
    map.set(id, { name, parentId });
  }
  taxonomyIndexCache = { at: Date.now(), map };
  return map;
}

let languageTaxonomyCache: { at: number; map: Map<string, string[]> } | null =
  null;

/**
 * Published language id → its taxonomy leaf ids, read CANONICALLY. The gallery's
 * `$select` projection (DESIGN_LANGUAGE_GALLERY_FIELDS) silently drops list
 * fields like `taxonomy_ids` in the current kernel (ARN-97), so family grouping
 * can't rely on it — this reads the canonical rows and is memoized for a few
 * minutes so the lean card fetch stays the home's hot path.
 */
export async function languageTaxonomyMap(): Promise<Map<string, string[]>> {
  if (languageTaxonomyCache && Date.now() - languageTaxonomyCache.at < 5 * 60 * 1000) {
    return languageTaxonomyCache.map;
  }
  const rows = await collectDesignLanguageRows("Status eq 'Published'");
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const id = typeof row.entity_id === "string" ? row.entity_id : "";
    if (!id) continue;
    const fields = (row.fields ?? {}) as Record<string, unknown>;
    const ids = parseJson<string[]>(fields.taxonomy_ids as string) ?? [];
    map.set(id, Array.isArray(ids) ? ids.filter(Boolean) : []);
  }
  languageTaxonomyCache = { at: Date.now(), map };
  return map;
}

// ── Taste Rules ──

export interface CurationJob {
  entity_id: string;
  status: string;
  fields: {
    Id?: string;
    Status?: string;
    State?: string;
    CreatedAt?: string;
    UpdatedAt?: string;
    job_type?: string;
    JobType?: string;
    input?: string;
    Input?: string;
    output?: string;
    Output?: string;
    taste_rule_ids?: string;
    TasteRuleIds?: string;
    report_file_id?: string;
    ReportFileId?: string;
    error_message?: string;
    ErrorMessage?: string;
    [key: string]: string | undefined;
  };
}

export async function listCurationJobs(
  filter?: string,
  top = 100,
): Promise<CurationJob[]> {
  const params = new URLSearchParams();
  if (filter) params.set("$filter", filter);
  params.set("$top", String(top));
  const q = params.toString();
  const rows = await collectODataPages<Record<string, unknown>>(
    `CurationJobs${q ? `?${q}` : ""}`,
  );
  return rows.map(normalizeCurationJobRow);
}

function normalizeCurationJobRow(raw: Record<string, unknown>): CurationJob {
  if (raw && typeof raw.fields === "object" && raw.fields !== null) {
    const row = raw as unknown as CurationJob;
    const status = row.status ?? row.fields.State ?? row.fields.Status ?? "";
    return { ...row, status };
  }

  const fields: Record<string, string | undefined> = {};
  let entityId = "";
  let status = "";
  for (const [key, value] of Object.entries(raw)) {
    if (key === "@odata.id") {
      entityId = parseEntitySetId(value, "CurationJobs") ?? entityId;
      continue;
    }
    if (key === "@odata.context" || key === "@odata.type") {
      continue;
    }
    if (key === "entity_id" && typeof value === "string") {
      entityId = value;
      continue;
    }
    if (
      (key === "status" || key === "State" || key === "Status") &&
      typeof value === "string"
    ) {
      status = value;
      fields[key === "status" ? "State" : key] = value;
      continue;
    }
    if (typeof value === "string") {
      fields[key] = value;
    }
  }

  entityId = fields.Id ?? entityId;
  return {
    entity_id: entityId,
    status,
    fields,
  };
}

export type TasteRuleStatus =
  | "Proposed"
  | "Accepted"
  | "Rejected"
  | "Superseded"
  | string;

export interface TasteRule {
  entity_id: string;
  status: TasteRuleStatus;
  fields: {
    Id?: string;
    Status?: string;
    State?: string;
    CreatedAt?: string;
    UpdatedAt?: string;
    title?: string;
    Title?: string;
    polarity?: string;
    Polarity?: string;
    pattern_type?: string;
    PatternType?: string;
    rule_text?: string;
    RuleText?: string;
    rationale?: string;
    Rationale?: string;
    evidence_language_ids?: string;
    EvidenceLanguageIds?: string;
    comparator_language_ids?: string;
    ComparatorLanguageIds?: string;
    confidence?: string;
    Confidence?: string;
    source_job_id?: string;
    SourceJobId?: string;
    report_file_id?: string;
    ReportFileId?: string;
    evidence_fingerprint?: string;
    EvidenceFingerprint?: string;
    curator_notes?: string;
    CuratorNotes?: string;
    superseded_by_rule_id?: string;
    SupersededByRuleId?: string;
    [key: string]: string | undefined;
  };
}

const TASTE_RULE_PAGE_SIZE = 200;

export async function listTasteRules(
  filter?: string,
): Promise<TasteRule[]> {
  const params = new URLSearchParams();
  if (filter) params.set("$filter", filter);
  params.set("$top", String(TASTE_RULE_PAGE_SIZE));
  const q = params.toString();
  const rows = await collectODataPages<Record<string, unknown>>(
    `TasteRules${q ? `?${q}` : ""}`,
  );
  return rows.map(normalizeTasteRuleRow);
}

function normalizeTasteRuleRow(raw: Record<string, unknown>): TasteRule {
  if (raw && typeof raw.fields === "object" && raw.fields !== null) {
    const row = raw as unknown as TasteRule;
    const status = row.status ?? row.fields.State ?? row.fields.Status ?? "";
    return { ...row, status };
  }

  const fields: Record<string, string | undefined> = {};
  let entityId = "";
  let status = "";
  for (const [key, value] of Object.entries(raw)) {
    if (key === "@odata.id") {
      entityId = parseEntitySetId(value, "TasteRules") ?? entityId;
      continue;
    }
    if (key === "@odata.context" || key === "@odata.type") {
      continue;
    }
    if (key === "entity_id" && typeof value === "string") {
      entityId = value;
      continue;
    }
    if ((key === "status" || key === "State" || key === "Status") && typeof value === "string") {
      status = value;
      fields[key === "status" ? "State" : key] = value;
      continue;
    }
    if (typeof value === "string") {
      fields[key] = value;
    }
  }

  entityId = fields.Id ?? entityId;
  return {
    entity_id: entityId,
    status,
    fields,
  };
}

// ── Multi-lane remix: Palette Systems, Art Styles, Remixes ──

export interface LaneEntity {
  entity_id: string;
  status: string;
  fields: Record<string, string | undefined>;
}

// Field shapes are advisory — fields arrive as snake_case action params.
export type PaletteSystem = LaneEntity;
export type ArtStyle = LaneEntity;
export type Remix = LaneEntity;

const LANE_PAGE_SIZE = 200;

function snakeCaseFieldName(key: string): string {
  return key
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

function normalizeLaneFields(
  raw: Record<string, unknown>,
): Record<string, string | undefined> {
  const fields: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    // The backend returns JSON fields (reference_assets, reference_image_file_ids,
    // proof_shots, signature, tags, …) as NATIVE arrays/objects. Don't drop them —
    // stringify so downstream parseJson() can read them (the page got no reference
    // images and fell back to the thumbnail because they were silently dropped).
    let v: string | undefined;
    if (typeof value === "string") v = value;
    else if (value == null) v = undefined;
    else v = JSON.stringify(value);
    if (v === undefined) continue;
    fields[key] = v;
    const snake = snakeCaseFieldName(key);
    if (!fields[snake]) fields[snake] = v;
  }
  return fields;
}

function normalizeLaneRow(raw: Record<string, unknown>, set: string): LaneEntity {
  if (raw && typeof raw.fields === "object" && raw.fields !== null) {
    const row = raw as unknown as LaneEntity;
    const f = normalizeLaneFields(row.fields as Record<string, unknown>);
    const status = row.status ?? f.State ?? f.Status ?? f.state ?? f.status ?? "";
    return { entity_id: row.entity_id || f.Id || "", status, fields: f };
  }
  const rawFields: Record<string, unknown> = {};
  let entityId = "";
  let status = "";
  for (const [key, value] of Object.entries(raw)) {
    if (key === "@odata.id") {
      entityId = parseEntitySetId(value, set) ?? entityId;
      continue;
    }
    if (key === "@odata.context" || key === "@odata.type") continue;
    if (key === "entity_id" && typeof value === "string") {
      entityId = value;
      continue;
    }
    if ((key === "status" || key === "State" || key === "Status") && typeof value === "string") {
      status = value;
      rawFields[key === "status" ? "State" : key] = value;
      continue;
    }
    if (typeof value === "string") rawFields[key] = value;
  }
  const fields = normalizeLaneFields(rawFields);
  entityId = (fields.Id as string) ?? entityId;
  return { entity_id: entityId, status, fields };
}

async function listLane(set: string, filter?: string): Promise<LaneEntity[]> {
  const params = new URLSearchParams();
  if (filter) params.set("$filter", filter);
  params.set("$top", String(LANE_PAGE_SIZE));
  const q = params.toString();
  const rows = await collectODataPages<Record<string, unknown>>(
    `${set}${q ? `?${q}` : ""}`,
  );
  return rows.map((r) => normalizeLaneRow(r, set));
}

async function getLane(set: string, id: string): Promise<LaneEntity> {
  return normalizeLaneRow(
    await odata<Record<string, unknown>>(`${set}('${id}')`),
    set,
  );
}

async function listLaneWithDemo(
  set: "PaletteSystems" | "ArtStyles",
  filter: string,
  demoRows: LaneEntity[],
): Promise<LaneEntity[]> {
  let rows: LaneEntity[] = [];
  let remoteError: unknown;
  try {
    rows = await listLane(set, filter);
  } catch (err) {
    remoteError = err;
  }
  if (remoteError && demoRows.length === 0) throw remoteError;
  const seen = new Set(rows.map((r) => r.entity_id));
  return [...rows, ...demoRows.filter((d) => !seen.has(d.entity_id))];
}

export const listPaletteSystems = (filter = "Status eq 'Published'") =>
  listLaneWithDemo("PaletteSystems", filter, demoPaletteSystems());
export const getPaletteSystem = (id: string) =>
  getDemoPaletteSystem(id)
    ? Promise.resolve(getDemoPaletteSystem(id)!)
    : getLane("PaletteSystems", id);
export const listArtStyles = (filter = "Status eq 'Published'") =>
  listLaneWithDemo("ArtStyles", filter, demoArtStyles());
export const getArtStyle = (id: string) =>
  getDemoArtStyle(id)
    ? Promise.resolve(getDemoArtStyle(id)!)
    : getLane("ArtStyles", id);
export const listRemixes = (filter?: string) => listLane("Remixes", filter);
export const getRemix = (id: string) => getLane("Remixes", id);

// ── Directions (bake-off rounds) ──
// A Direction is a reimagine brief / bake-off round. Contributor submissions
// (DesignLanguage/ArtStyle/PaletteSystem) link to it via `direction_id`; the
// round is every entity with that direction_id. Fields arrive snake_case:
// is_bakeoff, title, brief, source_language_id, round_label, model_pool, tags.
export type Direction = LaneEntity;
export const listDirections = (filter?: string) => listLane("Directions", filter);
export const getDirection = (id: string) => getLane("Directions", id);

/** Flatten a PaletteSystem's structured fields (signature/neutrals/semantic)
 *  into the flat color set the embodiment + studio theme on. signature[0] is
 *  the primary accent (the star). */
export function paletteRoles(fields: Record<string, string | undefined>): Record<string, string> {
  const neutrals = parseJson<Record<string, string>>(fields.neutrals) ?? {};
  const semantic = parseJson<Record<string, string>>(fields.semantic) ?? {};
  const sig = parseJson<Array<{ hex?: string } | string>>(fields.signature) ?? [];
  const first = sig[0];
  const accent = typeof first === "string" ? first : (first?.hex ?? "");
  return { ...neutrals, ...(accent ? { accent } : {}), ...semantic };
}

export interface PaletteSwatch {
  hex: string;
  name?: string;
}
export interface PaletteCore {
  /** The palette's identity: 1–4 key colors. signature[0] is the primary accent. */
  signature: PaletteSwatch[];
  /** The ground most of the surface is built from. */
  neutrals: Record<string, string>;
  /** Small functional accessory — NOT the identity. */
  semantic: Record<string, string>;
  mood: { temperature?: string; key_hue?: string; summary?: string };
}

/** Structured view of a PaletteSystem that preserves the signature →
 *  neutrals → semantic hierarchy (signature is the star). */
export function paletteCore(fields: Record<string, string | undefined>): PaletteCore {
  const neutrals = parseJson<Record<string, string>>(fields.neutrals) ?? {};
  const semantic = parseJson<Record<string, string>>(fields.semantic) ?? {};
  // `signature` may arrive as an array, or (after the commons PaletteSystem
  // upgrade) as an object of named colors, or absent — coerce any shape to an
  // array so a non-array value never throws `.map is not a function`.
  const parsedSig = parseJson<unknown>(fields.signature);
  const rawSig: Array<{ hex?: string; name?: string } | string> = Array.isArray(parsedSig)
    ? (parsedSig as Array<{ hex?: string; name?: string } | string>)
    : parsedSig && typeof parsedSig === "object"
      ? (Object.values(parsedSig as Record<string, unknown>) as Array<{ hex?: string; name?: string } | string>)
      : [];
  const signature: PaletteSwatch[] = rawSig
    .map((s) => (typeof s === "string" ? { hex: s } : { hex: s?.hex ?? "", name: s?.name }))
    .filter((s) => typeof s.hex === "string" && /^#?[0-9a-f]{3,8}$/i.test(s.hex));
  const mood = parseJson<{ temperature?: string; key_hue?: string; summary?: string }>(fields.mood) ?? {};
  return { signature, neutrals, semantic, mood };
}

function titleFromSlug(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function paletteDisplayName(
  fields: Record<string, string | undefined>,
  core = paletteCore(fields),
): string {
  const explicit = [fields.name, fields.Name].find((value) => value?.trim());
  if (explicit) return explicit.trim();

  const slug = [fields.slug, fields.Slug].find((value) => value?.trim());
  if (slug) return titleFromSlug(slug.trim());

  const signatureNames = core.signature
    .map((swatch) => swatch.name?.trim())
    .filter((name): name is string => Boolean(name));
  if (signatureNames.length > 0) {
    return signatureNames.slice(0, 2).join(" + ");
  }

  if (core.mood.key_hue?.trim()) {
    return `${titleFromSlug(core.mood.key_hue.trim())} Palette`;
  }

  return "Untitled palette";
}

export function artStyleDisplayName(
  fields: Record<string, string | undefined>,
): string {
  const explicit = [fields.name, fields.Name].find((value) => value?.trim());
  if (explicit) return explicit.trim();

  const slug = [fields.slug, fields.Slug].find((value) => value?.trim());
  if (slug) return titleFromSlug(slug.trim());

  const prompt = [fields.prompt_template, fields.PromptTemplate].find((value) =>
    value?.trim(),
  );
  const promptLead = prompt?.split(",")[0]?.trim();
  if (promptLead && !promptLead.includes("{")) return titleFromSlug(promptLead);

  const medium = [fields.medium, fields.Medium].find((value) => value?.trim());
  if (medium) return `${titleFromSlug(medium.trim())} Art Style`;

  return "Untitled art style";
}

export function paletteRampStopHex(stop: unknown): string | undefined {
  if (typeof stop === "string") return stop;
  if (!stop || typeof stop !== "object") return undefined;
  const hex = (stop as { hex?: unknown }).hex;
  return typeof hex === "string" ? hex : undefined;
}

// ── Files (embodiment HTML) ──

export function getFileUrl(fileId: string): string {
  // Pass through absolute URLs and public paths (e.g. locally-served /art/*.svg
  // reference images) untouched; otherwise resolve through the file proxy.
  if (/^(https?:\/\/|\/)/.test(fileId)) return fileId;
  // Use the Next.js API proxy which adds the X-Tenant-Id header
  return `/api/file/${encodeURIComponent(fileId)}?v=${FILE_PROXY_CACHE_VERSION}`;
}

// ── Helpers ──

export function parseJson<T = unknown>(raw?: unknown): T | null {
  if (raw == null) return null;
  // The OData backend returns some JSON fields as native arrays/objects rather
  // than strings. JSON.parse on a non-string throws, so guard: if it's already
  // parsed (array/object), return it as-is; only JSON.parse actual strings.
  if (typeof raw !== "string") return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
