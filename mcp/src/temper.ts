// Temper backend client. Every call is made AS the contributor. With
// forwardCallerToken on, the caller's own access token goes through and the
// kernel verifies it against the registered TrustedIssuer — the contributor
// boundary is enforced by the kernel, not by headers this adapter stamps
// (RFC-0002 step 2). The legacy branch swaps to the shared TEMPER_API_KEY
// plus self-asserted principal headers, and is retired with the header path.

import { config } from "./config.js";

export type Identity = {
  sub: string;
  email: string;
  clientId: string;
  grantId: string;
  /** The caller's raw access token (ES256 JWT from the katagami.ai AS). */
  token: string;
};

export type EntityRow = {
  entity_id: string;
  status?: string;
  fields?: Record<string, unknown>;
};

export function principalId(id: Identity): string {
  return `contrib:${id.sub}:${id.clientId.slice(0, 11)}`;
}

function headers(id: Identity): Record<string, string> {
  if (config.forwardCallerToken && id.token) {
    // The kernel resolves identity (human sub, acting agent, agent_type)
    // from the verified token itself; no self-asserted principal headers.
    return {
      "Content-Type": "application/json",
      "X-Tenant-Id": config.temperTenant,
      Authorization: `Bearer ${id.token}`,
    };
  }
  return {
    "Content-Type": "application/json",
    "X-Tenant-Id": config.temperTenant,
    Authorization: `Bearer ${config.temperApiKey}`,
    "x-temper-principal-kind": "agent",
    "x-temper-principal-id": principalId(id),
    "x-temper-agent-type": "contributor",
  };
}

export class TemperError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function check(res: Response, what: string): Promise<Response> {
  if (!res.ok) {
    const body = await res.text();
    throw new TemperError(`${what} failed (${res.status}): ${body.slice(0, 500)}`, res.status);
  }
  return res;
}

export async function getEntity(id: Identity, set: string, entityId: string): Promise<EntityRow | null> {
  const res = await fetch(`${config.temperUrl}/tdata/${set}('${encodeURIComponent(entityId)}')`, {
    headers: headers(id),
  });
  if (res.status === 404) return null;
  await check(res, `Read ${set}('${entityId}')`);
  return (await res.json()) as EntityRow;
}

export async function listEntities(id: Identity, set: string, filter?: string): Promise<EntityRow[]> {
  const q = filter ? `?$filter=${encodeURIComponent(filter)}` : "";
  const res = await check(
    await fetch(`${config.temperUrl}/tdata/${set}${q}`, { headers: headers(id) }),
    `List ${set}`,
  );
  const body = (await res.json()) as { value?: EntityRow[] };
  return body.value ?? [];
}

export async function createEntity(id: Identity, set: string): Promise<string> {
  const res = await check(
    await fetch(`${config.temperUrl}/tdata/${set}`, {
      method: "POST",
      headers: headers(id),
      body: JSON.stringify({}),
    }),
    `Create ${set}`,
  );
  const created = (await res.json()) as { entity_id?: string };
  if (!created.entity_id) throw new TemperError(`Create ${set} returned no entity_id`, 500);
  return created.entity_id;
}

export async function action(
  id: Identity,
  set: string,
  entityId: string,
  name: string,
  params: Record<string, unknown>,
): Promise<void> {
  await check(
    await fetch(
      `${config.temperUrl}/tdata/${set}('${encodeURIComponent(entityId)}')/KatagamiCommons.${name}`,
      { method: "POST", headers: headers(id), body: JSON.stringify(params) },
    ),
    `${name} on ${set}('${entityId}')`,
  );
}

/** Upload one file through the proven ladder: create → PUT $value → poll Ready. */
export async function uploadFile(
  id: Identity,
  name: string,
  mimeType: string,
  content: Uint8Array | string,
): Promise<string> {
  const created = await check(
    await fetch(`${config.temperUrl}/tdata/Files`, {
      method: "POST",
      headers: headers(id),
      body: JSON.stringify({
        fields: { Name: name, Path: `katagami-contrib/${name}`, MimeType: mimeType },
      }),
    }),
    "Create File",
  );
  const fileId = ((await created.json()) as { entity_id?: string }).entity_id;
  if (!fileId) throw new TemperError("Create File returned no entity_id", 500);

  const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
  await check(
    await fetch(`${config.temperUrl}/tdata/Files('${fileId}')/$value`, {
      method: "PUT",
      headers: { ...headers(id), "Content-Type": mimeType },
      body: bytes as unknown as BodyInit,
    }),
    `Upload File('${fileId}')`,
  );

  for (let i = 0; i < 30; i++) {
    const row = await getEntity(id, "Files", fileId);
    const s = row?.status ?? "";
    if (s === "Ready" || s === "Locked") return fileId;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new TemperError(`File('${fileId}') never became Ready`, 504);
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Fetch a contributor-supplied https image URL and store it as a File. */
export async function ingestImage(id: Identity, url: string, label: string): Promise<string> {
  const u = new URL(url);
  if (u.protocol !== "https:") throw new TemperError(`Image URLs must be https (${label})`, 400);
  const res = await fetch(u, { signal: AbortSignal.timeout(30_000), redirect: "follow" });
  if (!res.ok) throw new TemperError(`Fetching ${label} failed (${res.status})`, 502);
  const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!mime.startsWith("image/")) throw new TemperError(`${label} is not an image (${mime})`, 400);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > MAX_IMAGE_BYTES) throw new TemperError(`${label} exceeds 8MB`, 400);
  const ext = mime.split("/")[1]?.split("+")[0] || "img";
  return uploadFile(id, `${label}-${Date.now()}.${ext}`, mime, buf);
}
