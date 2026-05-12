const API_BASE = process.env.NEXT_PUBLIC_TEMPER_API_URL || "http://localhost:3500";
const TENANT = process.env.NEXT_PUBLIC_TEMPER_TENANT || "default";
const API_KEY = process.env.TEMPER_API_KEY || "";
const FILE_PROXY_CACHE_VERSION = "asset-cdn-v2";

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

async function odata<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(odataUrl(path), {
    ...init,
    headers: { ...headers, ...init?.headers },
    cache: "no-store",
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
    embodiment_file_id?: string;
    embodiment_asset_url?: string;
    embodiment_asset_id?: string;
    thumbnail_file_id?: string;
    thumbnail_asset_url?: string;
    thumbnail_asset_id?: string;
    parent_ids?: string;
    lineage_type?: string;
    generation_number?: string;
    taxonomy_ids?: string;
    tags?: string;
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
  "thumbnail_file_id",
  "thumbnail_asset_url",
  "thumbnail_asset_id",
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
    return raw as unknown as DesignLanguage;
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

// OData defaults to a finite page when no $top is given. Ask for a large page
// and still follow @odata.nextLink so the gallery cannot silently drop rows as
// the catalog grows.
const DESIGN_LANGUAGE_PAGE_SIZE = 500;

export async function listDesignLanguages(
  filter?: string,
  orderby?: string,
  select?: readonly string[],
): Promise<DesignLanguage[]> {
  const params = new URLSearchParams();
  if (filter) params.set("$filter", filter);
  if (orderby) params.set("$orderby", orderby);
  if (select && select.length > 0) params.set("$select", select.join(","));
  params.set("$top", String(DESIGN_LANGUAGE_PAGE_SIZE));
  const q = params.toString();
  const rows = await collectODataPages<Record<string, unknown>>(
    `DesignLanguages${q ? `?${q}` : ""}`,
  );
  return rows.map(normalizeDesignLanguageRow);
}

export async function getDesignLanguage(id: string): Promise<DesignLanguage> {
  return odata<DesignLanguage>(`DesignLanguages('${id}')`);
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

// ── Files (embodiment HTML) ──

export function getFileUrl(fileId: string): string {
  // Use the Next.js API proxy which adds the X-Tenant-Id header
  return `/api/file/${encodeURIComponent(fileId)}?v=${FILE_PROXY_CACHE_VERSION}`;
}

// ── Helpers ──

export function parseJson<T = unknown>(raw?: string): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
