const API_BASE = process.env.NEXT_PUBLIC_TEMPER_API_URL || "http://localhost:3500";
const TENANT = process.env.NEXT_PUBLIC_TEMPER_TENANT || "default";
const API_KEY = process.env.TEMPER_API_KEY || "";

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
  const res = await fetch(`${API_BASE}/tdata/${path}`, {
    ...init,
    headers: { ...headers, ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`OData ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// ── Design Languages ──

export interface DesignLanguage {
  entity_id: string;
  status: string;
  fields: {
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
] as const;

// Booleans / counters that may arrive flattened on a $select response.
// Booleans we care about for gallery sort/filter:
const FLAT_BOOLEAN_KEYS = new Set([
  "featured",
  "embodiment_verified",
  "has_embodiment",
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
  return {
    ...top,
    fields,
    booleans,
    counters,
  } as unknown as DesignLanguage;
}

export async function listDesignLanguages(
  filter?: string,
  orderby?: string,
  select?: readonly string[],
): Promise<DesignLanguage[]> {
  const params = new URLSearchParams();
  if (filter) params.set("$filter", filter);
  if (orderby) params.set("$orderby", orderby);
  if (select && select.length > 0) params.set("$select", select.join(","));
  const q = params.toString();
  const resp = await odata<ODataResponse<Record<string, unknown>>>(
    `DesignLanguages${q ? `?${q}` : ""}`,
  );
  return resp.value.map(normalizeDesignLanguageRow);
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
  const params = new URLSearchParams();
  if (filter) params.set("$filter", filter);
  const q = params.toString();
  const resp = await odata<ODataResponse<Taxonomy>>(
    `Taxonomies${q ? `?${q}` : ""}`,
  );
  return resp.value;
}

// ── Files (embodiment HTML) ──

export function getFileUrl(fileId: string): string {
  // Use the Next.js API proxy which adds the X-Tenant-Id header
  return `/api/file/${encodeURIComponent(fileId)}`;
}

// ── Mutations ──

export async function dispatchAction(
  entitySet: string,
  id: string,
  action: string,
  params: Record<string, string>,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/tdata/${entitySet}('${id}')/Temper.${action}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    },
  );
  if (!res.ok) {
    throw new Error(`Action ${action} failed ${res.status}: ${await res.text()}`);
  }
}

export async function deleteEntity(
  entitySet: string,
  id: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/tdata/${entitySet}('${id}')`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    throw new Error(`Delete failed ${res.status}: ${await res.text()}`);
  }
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
