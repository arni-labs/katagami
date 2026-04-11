const API_BASE = process.env.NEXT_PUBLIC_TEMPER_API_URL || "http://localhost:3467";
const TENANT = process.env.NEXT_PUBLIC_TEMPER_TENANT || "rita-agents";

interface ODataResponse<T> {
  value: T[];
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
}

const headers: Record<string, string> = {
  "Content-Type": "application/json",
  "X-Tenant-Id": TENANT,
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
    embodiment_file_id?: string;
    thumbnail_file_id?: string;
    parent_ids?: string;
    lineage_type?: string;
    generation_number?: string;
    taxonomy_ids?: string;
    tags?: string;
    curator_notes?: string;
    source_ids?: string;
    [key: string]: string | undefined;
  };
  counters: {
    version?: number;
    element_count?: number;
    composition_count?: number;
    fork_count?: number;
    usage_count?: number;
  };
  booleans: Record<string, boolean>;
}

export async function listDesignLanguages(
  filter?: string,
  orderby?: string,
): Promise<DesignLanguage[]> {
  const params = new URLSearchParams();
  if (filter) params.set("$filter", filter);
  if (orderby) params.set("$orderby", orderby);
  const q = params.toString();
  const resp = await odata<ODataResponse<DesignLanguage>>(
    `DesignLanguages${q ? `?${q}` : ""}`,
  );
  return resp.value;
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
  return `${API_BASE}/tdata/Files('${fileId}')/$value`;
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
