const API_BASE = process.env.NEXT_PUBLIC_TEMPER_API_URL || "http://localhost:3500";
const TENANT = process.env.NEXT_PUBLIC_TEMPER_TENANT || "default";
const API_KEY = process.env.TEMPER_API_KEY || "";
const FILE_PROXY_CACHE_VERSION = "thumbnail-binary-2026-05-08";

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
    design_md_lint_result?: string;
    design_md_format_version?: string;
    embodiment_file_id?: string;
    thumbnail_file_id?: string;
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

export interface LineageMetadata {
  lineageType: string;
  generation: number;
  parentIds: string[];
}

export interface LineageNode extends LineageMetadata {
  id: string;
  name: string;
  status: string;
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
  "embodiment_format",
  "embodiment_verified",
  "has_embodiment",
  "thumbnail_file_id",
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

const FLAT_FIELD_ALIASES: Record<string, keyof DesignLanguage["fields"]> = {
  Name: "name",
  Slug: "slug",
  Philosophy: "philosophy",
  Tokens: "tokens",
  Rules: "rules",
  LayoutPrinciples: "layout_principles",
  Guidance: "guidance",
  ImageryDirection: "imagery_direction",
  GenerativeCanvas: "generative_canvas",
  DesignMdFileId: "design_md_file_id",
  DesignMdLintResult: "design_md_lint_result",
  DesignMdFormatVersion: "design_md_format_version",
  EmbodimentFileId: "embodiment_file_id",
  ThumbnailFileId: "thumbnail_file_id",
  ParentIds: "parent_ids",
  LineageType: "lineage_type",
  GenerationNumber: "generation_number",
  TaxonomyIds: "taxonomy_ids",
  Tags: "tags",
  CuratorNotes: "curator_notes",
  SourceIds: "source_ids",
  QualityScore: "quality_score",
  CreatedAt: "CreatedAt",
  UpdatedAt: "UpdatedAt",
  PublishedAt: "PublishedAt",
};

const FLAT_BOOLEAN_ALIASES: Record<string, string> = {
  Featured: "featured",
  EmbodimentVerified: "embodiment_verified",
  HasEmbodiment: "has_embodiment",
  HasThumbnail: "has_thumbnail",
  ThumbnailVerified: "thumbnail_verified",
  HasDesignMd: "has_design_md",
  HasValidDesignMd: "has_valid_design_md",
  DesignMdVerified: "design_md_verified",
  QualityReviewPassed: "quality_review_passed",
};

const FLAT_COUNTER_ALIASES: Record<string, string> = {
  DisplayOrder: "display_order",
  ForkCount: "fork_count",
  Version: "version",
  ElementCount: "element_count",
  CompositionCount: "composition_count",
  UsageCount: "usage_count",
};
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
export function normalizeDesignLanguageRow(
  raw: Record<string, unknown>,
): DesignLanguage {
  if (raw && typeof raw.fields === "object" && raw.fields !== null) {
    const normalized = raw as unknown as DesignLanguage;
    return {
      ...normalized,
      fields: normalizeFieldAliases(raw.fields as Record<string, unknown>),
      booleans: normalized.booleans ?? {},
      counters: normalized.counters ?? {},
      status:
        normalized.status ??
        valueAsString((raw.fields as Record<string, unknown>).Status) ??
        "",
    };
  }
  const fields: Record<string, string | undefined> = {};
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
      fields.Id = valueAsString(v);
      continue;
    }
    if (k === "Status") {
      top.status = v;
      fields.Status = valueAsString(v);
      continue;
    }
    const booleanKey = FLAT_BOOLEAN_ALIASES[k] ?? k;
    if (FLAT_BOOLEAN_KEYS.has(booleanKey) && typeof v === "boolean") {
      booleans[booleanKey] = v;
      continue;
    }
    const counterKey = FLAT_COUNTER_ALIASES[k] ?? k;
    if (FLAT_COUNTER_KEYS.has(counterKey) && typeof v === "number") {
      counters[counterKey] = v;
      continue;
    }
    const fieldKey = FLAT_FIELD_ALIASES[k] ?? k;
    fields[fieldKey] = valueAsString(v);
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

function normalizeFieldAliases(
  rawFields: Record<string, unknown>,
): DesignLanguage["fields"] {
  const fields = { ...rawFields } as Record<string, string | undefined>;
  for (const [k, v] of Object.entries(rawFields)) {
    const alias = FLAT_FIELD_ALIASES[k];
    if (alias && fields[alias] === undefined) {
      fields[alias] = valueAsString(v);
    }
  }
  return fields as DesignLanguage["fields"];
}

function valueAsString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

function parseODataEntityId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const match = value.match(/DesignLanguages\('([^']+)'\)/);
  return match?.[1];
}

function readDesignLanguageValue(
  lang: DesignLanguage,
  keys: string[],
): unknown {
  const bags: unknown[] = [lang.fields, lang.counters, lang.booleans, lang];
  for (const bag of bags) {
    if (!bag || typeof bag !== "object") continue;
    const record = bag as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
  }
  return undefined;
}

function readDesignLanguageString(
  lang: DesignLanguage,
  keys: string[],
): string | undefined {
  return valueAsString(readDesignLanguageValue(lang, keys));
}

function readDesignLanguageNumber(
  lang: DesignLanguage,
  keys: string[],
  fallback = 0,
): number {
  const value = readDesignLanguageValue(lang, keys);
  const parsed =
    typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseParentIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
  }
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      );
    }
  } catch {
    return trimmed
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }
  return [];
}

export function lineageMetadata(lang: DesignLanguage): LineageMetadata {
  return {
    lineageType:
      readDesignLanguageString(lang, [
        "lineage_type",
        "LineageType",
        "lineageType",
      ]) ?? "original",
    generation: readDesignLanguageNumber(
      lang,
      ["generation_number", "GenerationNumber", "generationNumber"],
      0,
    ),
    parentIds: parseParentIds(
      readDesignLanguageValue(lang, ["parent_ids", "ParentIds", "parentIds"]),
    ),
  };
}

export function lineageNodesFromLanguages(
  languages: DesignLanguage[],
): LineageNode[] {
  return languages.map((lang) => {
    const id =
      lang.entity_id ??
      readDesignLanguageString(lang, ["Id", "id"]) ??
      "unknown";
    return {
      id,
      name: readDesignLanguageString(lang, ["name", "Name"]) ?? id.slice(0, 12),
      status:
        lang.status ??
        readDesignLanguageString(lang, ["Status", "status"]) ??
        "Draft",
      ...lineageMetadata(lang),
    };
  });
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
  const row = await odata<Record<string, unknown>>(`DesignLanguages('${id}')`);
  return normalizeDesignLanguageRow(row);
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
