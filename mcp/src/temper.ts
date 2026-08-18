// Temper backend client. Every call is made AS the contributor: the
// principal headers carry the owning human's sub and the acting agent's
// client id, and agent_type=contributor puts the request behind the Cedar
// contributor boundary (author and submit; never verify or publish).

import { config } from "./config.js";
import { createHash } from "node:crypto";

export type Identity = {
  sub: string;
  email: string;
  clientId: string;
  grantId: string;
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
  // ALWAYS paginate: Temper caps an un-$top'd list at 100 and returns an
  // @odata.nextLink for the rest (ARN-363). A bare read silently drops
  // everything past 100 — the contributor search must see the whole catalog.
  const filterQ = filter ? `$filter=${encodeURIComponent(filter)}&` : "";
  let url: string | null = `${config.temperUrl}/tdata/${set}?${filterQ}$top=500`;
  const out: EntityRow[] = [];
  let guard = 0;
  while (url && guard++ < 50) {
    const res: Response = await check(await fetch(url, { headers: headers(id) }), `List ${set}`);
    const body = (await res.json()) as { value?: EntityRow[]; "@odata.nextLink"?: string };
    out.push(...(body.value ?? []));
    const next = body["@odata.nextLink"] ?? null;
    url = next ? (next.startsWith("http") ? next : `${config.temperUrl}/${next.replace(/^\//, "")}`) : null;
  }
  return out;
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

/** Dispatch an action owned by the Katagami curation app. */
export async function curationAction(
  id: Identity,
  set: string,
  entityId: string,
  name: string,
  params: Record<string, unknown>,
): Promise<void> {
  for (const namespace of ["Temper", "Katagami.Curation", "Katagami"]) {
    const res = await fetch(
      `${config.temperUrl}/tdata/${set}('${encodeURIComponent(entityId)}')/${namespace}.${name}`,
      { method: "POST", headers: headers(id), body: JSON.stringify(params) },
    );
    if (res.ok) return;
    if (res.status !== 404) {
      await check(res, `${name} on ${set}('${entityId}')`);
    }
  }
  throw new TemperError(`${name} on ${set}('${entityId}') has no accepted action namespace`, 404);
}

export async function temperAction(
  id: Identity,
  set: string,
  entityId: string,
  name: string,
  params: Record<string, unknown> = {},
): Promise<void> {
  await check(
    await fetch(
      `${config.temperUrl}/tdata/${set}('${encodeURIComponent(entityId)}')/Temper.${name}`,
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

export type IngestedImage = {
  fileId: string;
  sha256: string;
  mimeType: string;
  sizeBytes: number;
};

const ACCEPTED_PROOF_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function hasExpectedImageSignature(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "image/png")
    return (
      bytes.length >= 8 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)
    );
  if (mimeType === "image/jpeg")
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/webp")
    return (
      bytes.length >= 12 &&
      Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "RIFF" &&
      Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP"
    );
  return false;
}

/** Hash and store contributor-supplied image bytes without invoking a generator. */
export async function ingestImageBytesWithDigest(
  id: Identity,
  bytes: Uint8Array,
  mimeType: string,
  label: string,
): Promise<IngestedImage> {
  const mime = mimeType.toLowerCase().trim();
  if (!ACCEPTED_PROOF_IMAGE_TYPES.has(mime))
    throw new TemperError(`${label} must be PNG, JPEG, or WebP`, 400);
  if (bytes.byteLength === 0) throw new TemperError(`${label} is empty`, 400);
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new TemperError(`${label} exceeds 8MB`, 400);
  if (!hasExpectedImageSignature(bytes, mime))
    throw new TemperError(`${label} bytes do not match ${mime}`, 400);
  const ext = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
  const fileId = await uploadFile(id, `${label}-${Date.now()}.${ext}`, mime, bytes);
  return {
    fileId,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    mimeType: mime,
    sizeBytes: bytes.byteLength,
  };
}

/** Fetch a contributor-supplied HTTPS image, hash the exact bytes, and store them. */
export async function ingestImageWithDigest(
  id: Identity,
  url: string,
  label: string,
): Promise<IngestedImage> {
  const u = new URL(url);
  if (u.protocol !== "https:") throw new TemperError(`Image URLs must be https (${label})`, 400);
  const res = await fetch(u, { signal: AbortSignal.timeout(60_000), redirect: "follow" });
  if (!res.ok) throw new TemperError(`Fetching ${label} failed (${res.status})`, 502);
  const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  const buf = new Uint8Array(await res.arrayBuffer());
  return ingestImageBytesWithDigest(id, buf, mime, label);
}

/** Fetch a contributor-supplied https image URL and store it as a File. */
export async function ingestImage(id: Identity, url: string, label: string): Promise<string> {
  return (await ingestImageWithDigest(id, url, label)).fileId;
}
