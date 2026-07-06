import "server-only";

// Minimal OAuth 2.1 authorization server for the agent front door (ARN-151).
// Humans authenticate with the existing Google sign-in; agents (MCP clients,
// the katagami CLI) get short-lived ES256 access tokens bound to BOTH
// identities: the owning human's Google sub and the agent's client_id. The
// consent screen is the activation moment; revoking the AgentGrant is the
// human's kill switch. Clients are public (PKCE, no secrets) per the MCP spec.
//
// State lives in Temper (OAuthClients / AgentGrants / Members entities), not
// here: access tokens and authorization codes are stateless JWTs so the MCP
// adapter can verify them with nothing but the JWKS.

import { SignJWT, jwtVerify, importPKCS8, exportJWK, calculateJwkThumbprint, type JWK } from "jose";
import { createEntity, dispatchAction } from "@/lib/odata-mutations";

const API_BASE = process.env.NEXT_PUBLIC_TEMPER_API_URL || "http://localhost:3500";
const TENANT = process.env.NEXT_PUBLIC_TEMPER_TENANT || "default";
const API_KEY = process.env.TEMPER_API_KEY || "";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const AUTH_CODE_TTL_SECONDS = 60;
export const SCOPE_CONTRIBUTE = "contribute";

/** The protected resource this AS mints tokens for (the MCP front door). */
export function mcpResource(): string {
  return process.env.KATAGAMI_MCP_RESOURCE || "https://mcp.katagami.ai";
}

/** RFC 8707 resource indicators are honored only for known resources —
 *  this AS mints tokens for the Katagami front door, not for whatever a
 *  crafted authorize URL asks for. Extra entries (e.g. a localhost adapter
 *  in development) come from KATAGAMI_EXTRA_RESOURCES, comma-separated. */
export function resolveResource(requested: string): string {
  const allowed = new Set(
    [mcpResource(), ...(process.env.KATAGAMI_EXTRA_RESOURCES ?? "").split(",")]
      .map((r) => r.trim().replace(/\/$/, ""))
      .filter(Boolean),
  );
  const r = requested.trim().replace(/\/$/, "");
  return allowed.has(r) ? r : mcpResource();
}

export function issuer(origin: string): string {
  return process.env.KATAGAMI_AS_ISSUER || origin;
}

export function isAsConfigured(): boolean {
  return Boolean(process.env.KATAGAMI_AS_PRIVATE_KEY && API_KEY);
}

// --- Signing keys -----------------------------------------------------------

let keyCache: { key: CryptoKey; jwk: JWK; kid: string } | null = null;

async function signingKey(): Promise<{ key: CryptoKey; jwk: JWK; kid: string }> {
  if (keyCache) return keyCache;
  const pem = (process.env.KATAGAMI_AS_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  if (!pem) throw new Error("KATAGAMI_AS_PRIVATE_KEY is not set — the authorization server is off.");
  const key = await importPKCS8(pem, "ES256", { extractable: true });
  const privateJwk = await exportJWK(key);
  // Public half only: never expose d (or other private params) via JWKS.
  const jwk: JWK = { kty: privateJwk.kty, crv: privateJwk.crv, x: privateJwk.x, y: privateJwk.y };
  const kid = await calculateJwkThumbprint(jwk);
  keyCache = { key, jwk: { ...jwk, kid, alg: "ES256", use: "sig" }, kid };
  return keyCache;
}

export async function publicJwks(): Promise<{ keys: JWK[] }> {
  const { jwk } = await signingKey();
  return { keys: [jwk] };
}

// --- Temper-backed state ----------------------------------------------------

const headers: Record<string, string> = {
  "Content-Type": "application/json",
  "X-Tenant-Id": TENANT,
  ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
};

type EntityRow = {
  entity_id: string;
  status?: string;
  fields?: Record<string, unknown>;
};

async function queryEntities(set: string, filter: string): Promise<EntityRow[]> {
  const res = await fetch(
    `${API_BASE}/tdata/${set}?$filter=${encodeURIComponent(filter)}`,
    { headers, cache: "no-store" },
  );
  if (!res.ok) throw new Error(`Query ${set} failed ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { value?: EntityRow[] };
  return body.value ?? [];
}

function field(row: EntityRow, name: string): string {
  const v = row.fields?.[name];
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function randomToken(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Buffer.from(buf).toString("base64url");
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Buffer.from(digest).toString("hex");
}

// --- Members ----------------------------------------------------------------

/** Upsert the Member behind a Google sign-in. Fire-and-forget from the
 *  callback: account durability must never block the sign-in itself. */
export async function upsertMember(user: {
  sub: string;
  email: string;
  name: string;
  picture: string;
}): Promise<void> {
  // Temper's OData $filter matches raw (snake_case) field names, not the
  // PascalCase CSDL projections — verified live 2026-07-06.
  const existing = await queryEntities("Members", `sub eq '${user.sub}'`);
  const params = {
    sub: user.sub,
    email: user.email,
    display_name: user.name,
    avatar_url: user.picture,
  };
  if (existing.length > 0) {
    await dispatchAction("Members", existing[0].entity_id, "Register", params);
    return;
  }
  const created = await createEntity("Members");
  await dispatchAction("Members", created.entity_id, "Register", params);
}

export async function memberBySub(sub: string): Promise<EntityRow | null> {
  const rows = await queryEntities("Members", `sub eq '${sub}'`);
  return rows[0] ?? null;
}

// --- Clients (RFC 7591 dynamic registration) --------------------------------

export type RegisteredClient = {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
};

/** Loopback redirects (CLIs) may use http; everything else must be https. */
export function isAllowedRedirectUri(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.protocol === "https:") return true;
    return (
      u.protocol === "http:" &&
      (u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "::1")
    );
  } catch {
    return false;
  }
}

export async function registerClient(meta: {
  client_name: string;
  redirect_uris: string[];
  client_uri?: string;
  logo_uri?: string;
}): Promise<RegisteredClient> {
  const clientId = `kc_${randomToken(24)}`;
  const created = await createEntity("OAuthClients");
  await dispatchAction("OAuthClients", created.entity_id, "Register", {
    client_id: clientId,
    client_name: meta.client_name,
    redirect_uris: meta.redirect_uris,
    token_endpoint_auth_method: "none",
    client_uri: meta.client_uri ?? "",
    logo_uri: meta.logo_uri ?? "",
  });
  return {
    client_id: clientId,
    client_name: meta.client_name,
    redirect_uris: meta.redirect_uris,
  };
}

export async function clientById(clientId: string): Promise<RegisteredClient | null> {
  const rows = await queryEntities("OAuthClients", `client_id eq '${clientId}'`);
  const row = rows.find((r) => (r.status ?? "") !== "Disabled");
  if (!row) return null;
  // List-typed fields round-trip as native JSON arrays (the same engine
  // behavior the SubmitForReview guards depend on) — handle both shapes.
  const raw: unknown = row.fields?.["redirect_uris"];
  let uris: string[] = [];
  if (Array.isArray(raw)) {
    uris = raw.filter((u): u is string => typeof u === "string");
  } else if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw || "[]");
      if (Array.isArray(parsed)) uris = parsed.filter((u): u is string => typeof u === "string");
    } catch {
      uris = [];
    }
  }
  return {
    client_id: clientId,
    client_name: field(row, "client_name") || clientId,
    redirect_uris: uris,
  };
}

// --- Grants -----------------------------------------------------------------

export type GrantRow = {
  grantId: string;
  status: string;
  memberSub: string;
  memberEmail: string;
  clientId: string;
  clientName: string;
  grantKind: string;
};

function toGrant(row: EntityRow): GrantRow {
  return {
    grantId: row.entity_id,
    status: row.status ?? "",
    memberSub: field(row, "member_sub"),
    memberEmail: field(row, "member_email"),
    clientId: field(row, "client_id"),
    clientName: field(row, "client_name"),
    grantKind: field(row, "grant_kind"),
  };
}

export async function createGrant(args: {
  memberSub: string;
  memberEmail: string;
  clientId: string;
  clientName: string;
  grantKind: "consent" | "pre_authorized";
}): Promise<string> {
  const created = await createEntity("AgentGrants");
  await dispatchAction("AgentGrants", created.entity_id, "Approve", {
    member_sub: args.memberSub,
    member_email: args.memberEmail,
    client_id: args.clientId,
    client_name: args.clientName,
    scopes: [SCOPE_CONTRIBUTE],
    refresh_token_hash: "",
    grant_kind: args.grantKind,
  });
  return created.entity_id;
}

export async function grantById(grantId: string): Promise<GrantRow | null> {
  const res = await fetch(`${API_BASE}/tdata/AgentGrants('${grantId}')`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) return null;
  return toGrant((await res.json()) as EntityRow);
}

export async function grantsForMember(sub: string): Promise<GrantRow[]> {
  const rows = await queryEntities("AgentGrants", `member_sub eq '${sub}'`);
  return rows.map(toGrant);
}

export async function grantByRefreshHash(hash: string): Promise<GrantRow | null> {
  const rows = await queryEntities("AgentGrants", `refresh_token_hash eq '${hash}'`);
  const active = rows.find((r) => (r.status ?? "") === "Active");
  return active ? toGrant(active) : null;
}

/** Mint a fresh refresh token and anchor its hash on the grant (rotation). */
export async function issueRefreshToken(grantId: string): Promise<string> {
  const token = `krt_${randomToken(48)}`;
  await dispatchAction("AgentGrants", grantId, "RotateRefreshToken", {
    refresh_token_hash: await sha256Hex(token),
  });
  await dispatchAction("AgentGrants", grantId, "RecordUse", {});
  return token;
}

export async function revokeGrant(grantId: string, reason: string): Promise<void> {
  await dispatchAction("AgentGrants", grantId, "Revoke", { reason });
}

// --- Tokens -----------------------------------------------------------------

export type CodePayload = {
  sub: string;
  email: string;
  name: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  grant_id: string;
  resource: string;
};

/** Authorization codes are short-lived signed JWTs. PKCE binds each code to
 *  the client's verifier, which is what makes the stateless form safe: replay
 *  needs the verifier, and whoever has both already is the client. */
export async function issueAuthCode(origin: string, p: CodePayload): Promise<string> {
  const { key, kid } = await signingKey();
  return new SignJWT({ ...p, typ: "katagami_code" })
    .setProtectedHeader({ alg: "ES256", kid })
    .setIssuer(issuer(origin))
    .setAudience(issuer(origin))
    .setIssuedAt()
    .setJti(randomToken(12))
    .setExpirationTime(`${AUTH_CODE_TTL_SECONDS}s`)
    .sign(key);
}

export async function verifyAuthCode(origin: string, code: string): Promise<CodePayload | null> {
  try {
    const { jwk } = await signingKey();
    const { importJWK } = await import("jose");
    const pub = await importJWK(jwk, "ES256");
    const { payload } = await jwtVerify(code, pub, {
      issuer: issuer(origin),
      audience: issuer(origin),
    });
    if (payload.typ !== "katagami_code") return null;
    return {
      sub: String(payload.sub ?? ""),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      client_id: String(payload.client_id ?? ""),
      redirect_uri: String(payload.redirect_uri ?? ""),
      code_challenge: String(payload.code_challenge ?? ""),
      grant_id: String(payload.grant_id ?? ""),
      resource: String(payload.resource ?? ""),
    };
  } catch {
    return null;
  }
}

/** The access token both the MCP adapter and the OData front verify:
 *  sub = the owning human, client_id = the acting agent. */
export async function issueAccessToken(
  origin: string,
  p: { sub: string; email: string; name: string; client_id: string; grant_id: string; resource: string },
): Promise<{ token: string; expiresIn: number }> {
  const { key, kid } = await signingKey();
  const token = await new SignJWT({
    email: p.email,
    name: p.name,
    client_id: p.client_id,
    grant_id: p.grant_id,
    scope: SCOPE_CONTRIBUTE,
    agent_type: "contributor",
  })
    .setProtectedHeader({ alg: "ES256", kid })
    .setSubject(p.sub)
    .setIssuer(issuer(origin))
    .setAudience(p.resource || mcpResource())
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(key);
  return { token, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

export async function pkceMatches(verifier: string, challenge: string): Promise<boolean> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return Buffer.from(digest).toString("base64url") === challenge;
}
