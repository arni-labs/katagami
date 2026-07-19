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
  temperApiKey: req("TEMPER_API_KEY", ""),
  /**
   * Forward the caller's own access token to Temper instead of swapping to
   * the shared TEMPER_API_KEY + self-asserted principal headers (RFC-0002
   * step 2). Requires a kernel that verifies katagami.ai as a TrustedIssuer
   * (ARN-255 step 1); until that is deployed this stays off, and once the
   * header path is retired the flag and the legacy branch go with it.
   */
  forwardCallerToken: (process.env.KATAGAMI_MCP_FORWARD_CALLER_TOKEN ?? "") === "1",
  /** Public gallery, for handing back human-viewable links. */
  galleryUrl: req("KATAGAMI_GALLERY_URL", "https://katagami.ai"),
};

export function jwksUrl(): string {
  return `${config.issuer}/.well-known/jwks.json`;
}
