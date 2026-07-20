import "server-only";

const API_BASE = process.env.NEXT_PUBLIC_TEMPER_API_URL || "http://localhost:3500";
const TENANT = process.env.NEXT_PUBLIC_TEMPER_TENANT || "default";
const API_KEY = process.env.TEMPER_API_KEY || "";

const headers: Record<string, string> = {
  "Content-Type": "application/json",
  "X-Tenant-Id": TENANT,
  ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
};

// Per-user writes may carry the acting human's own token instead of the shared
// service key, so the kernel enforces per-user Cedar (RFC-0002, ARN-255).
// `bearer` overrides only the Authorization header; everything else is the
// service default. AS-internal and public/service writes omit it and stay on
// the shared key.
function authHeaders(bearer?: string): Record<string, string> {
  if (!bearer) return headers;
  return {
    "Content-Type": "application/json",
    "X-Tenant-Id": TENANT,
    Authorization: `Bearer ${bearer}`,
  };
}

export async function dispatchAction(
  entitySet: string,
  id: string,
  action: string,
  // Values may be arrays/objects: list-typed spec fields (e.g. corpus_file_ids)
  // must arrive as real JSON arrays for cross-entity guard resolution.
  params: Record<string, unknown>,
  opts?: { bearer?: string },
): Promise<void> {
  const reqHeaders = authHeaders(opts?.bearer);
  const namespaces = ["KatagamiCommons", "Katagami.Curation", "Katagami", "Temper"];
  let lastError = "";
  for (const namespace of namespaces) {
    const res = await fetch(
      `${API_BASE}/tdata/${entitySet}('${id}')/${namespace}.${action}`,
      {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify(params),
      },
    );
    if (res.ok) return;
    lastError = `Action ${namespace}.${action} failed ${res.status}: ${await res.text()}`;
    if (res.status !== 404) break;
  }
  throw new Error(lastError || `Action ${action} failed.`);
}

export async function createEntity(
  entitySet: string,
  fields: Record<string, string | number | boolean> = {},
  opts?: { bearer?: string },
): Promise<{ entity_id: string } & Record<string, unknown>> {
  const body = Object.keys(fields).length > 0 ? { fields } : {};
  const res = await fetch(`${API_BASE}/tdata/${entitySet}`, {
    method: "POST",
    headers: authHeaders(opts?.bearer),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Create ${entitySet} failed ${res.status}: ${await res.text()}`);
  }
  const created = (await res.json()) as { entity_id?: string } & Record<
    string,
    unknown
  >;
  if (!created.entity_id) {
    throw new Error(`Create ${entitySet} did not return an entity_id.`);
  }
  return created as { entity_id: string } & Record<string, unknown>;
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

/** Create a File entity, upload its content, and wait until it is readable.
 *  Returns the file id. Used by the voice intake to persist corpus samples. */
export async function uploadFile(
  name: string,
  path: string,
  mimeType: string,
  content: string,
): Promise<string> {
  const created = await createEntity("Files", {
    Name: name,
    Path: path,
    MimeType: mimeType,
  });
  const id = created.entity_id;
  const put = await fetch(`${API_BASE}/tdata/Files('${id}')/$value`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": mimeType },
    body: content,
  });
  if (!put.ok) throw new Error(`File upload failed ${put.status}`);
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${API_BASE}/tdata/Files('${id}')`, { headers, cache: "no-store" });
    if (res.ok) {
      const row = (await res.json()) as { status?: string };
      if (row.status === "Ready" || row.status === "Locked") return id;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`File ${id} never became Ready`);
}
