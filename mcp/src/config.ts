// Configuration for the Katagami MCP adapter (ARN-152).
//
// The adapter is a protocol translator with no rules of its own: MCP on one
// side, Temper's OData action ladder on the other. All guards, lifecycle,
// and authorization live in the commons specs + Cedar; access tokens come
// from the katagami.ai authorization server (ARN-151) and carry both the
// owning human (sub) and the acting agent (client_id).

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`${name} is required`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  /** Public URL of this MCP server — the OAuth resource identifier (aud). */
  resourceUrl: req("MCP_RESOURCE_URL", "https://mcp.katagami.ai"),
  /** The authorization server (katagami.ai). */
  issuer: req("KATAGAMI_AS_ISSUER", "https://katagami.ai"),
  /** Temper backend. */
  temperUrl: req("TEMPER_API_URL", "https://openpaw-production.up.railway.app"),
  temperTenant: req("TEMPER_TENANT", "default"),
  /**
   * Shared service key. Used only for the ONE non-caller call: the grant
   * liveness read in auth.ts (verifying a token means checking the anchoring
   * grant is still Active, before any caller identity is established). There is
   * no anonymous sample tier — every /mcp route is bearer-gated, so all
   * tool-driven calls forward the caller's own token instead (RFC-0002 step 2 /
   * ARN-255).
   */
  temperApiKey: req("TEMPER_API_KEY", ""),
  /** Public gallery, for handing back human-viewable links. */
  galleryUrl: req("KATAGAMI_GALLERY_URL", "https://katagami.ai"),
};

export function jwksUrl(): string {
  return `${config.issuer}/.well-known/jwks.json`;
}
