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
