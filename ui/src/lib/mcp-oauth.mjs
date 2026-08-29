// Shared MCP OAuth helpers for the gallery read server at /mcp.
// Grok Bot (and other MCP hosts) only draw a connect card when an
// unauthenticated request 401s with WWW-Authenticate pointing at RFC 9728
// protected-resource metadata whose `resource` is the MCP URL itself.

/** Gallery /mcp tokens carry this scope. Contribute-adapter tokens do not. */
export const SCOPE_READ = "read";

/** Contribution adapter tokens (mcp.katagami.ai). Must not unlock gallery /mcp. */
export const SCOPE_CONTRIBUTE = "contribute";

/** Private-use schemes Cursor and Grok Bot actually register. */
export const NATIVE_REDIRECT_SCHEMES = new Set(["cursor", "grok"]);

/** Public origin of the authorization server / gallery (no trailing slash). */
export function mcpPublicOrigin() {
  return (
    process.env.KATAGAMI_AS_ISSUER ||
    process.env.KATAGAMI_PUBLIC_URL ||
    "https://katagami.ai"
  ).replace(/\/$/, "");
}

/** The read-MCP resource identifier. Must be the URL the host adds, not just the origin. */
export function readMcpResource() {
  const gallery = (process.env.KATAGAMI_PUBLIC_URL || "https://katagami.ai").replace(
    /\/$/,
    "",
  );
  return `${gallery}/mcp`;
}

export const MCP_RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource";

export function mcpResourceMetadataUrl() {
  return `${mcpPublicOrigin()}${MCP_RESOURCE_METADATA_PATH}`;
}

/** RFC 9728 WWW-Authenticate challenge that makes Grok Bot draw the login card. */
export function wwwAuthenticateHeader() {
  return `Bearer resource_metadata="${mcpResourceMetadataUrl()}"`;
}

/** RFC 9728 protected-resource document for /mcp. Same body at origin and path-scoped URLs. */
export function protectedResourceDocument() {
  return {
    resource: readMcpResource(),
    authorization_servers: [mcpPublicOrigin()],
    bearer_methods_supported: ["header"],
    scopes_supported: [SCOPE_READ],
  };
}

/**
 * DCR redirect allow-list: https, loopback http, and the private-use
 * schemes Cursor / Grok Bot register. ftp and other schemes are rejected.
 */
export function isAllowedRedirectUri(uri) {
  if (typeof uri !== "string" || uri.length === 0 || uri.length > 2048) return false;
  let u;
  try {
    u = new URL(uri);
  } catch {
    return false;
  }
  const scheme = u.protocol.replace(/:$/, "").toLowerCase();
  if (scheme === "https") return Boolean(u.hostname);
  if (scheme === "http") {
    return (
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      u.hostname === "[::1]" ||
      u.hostname === "::1"
    );
  }
  return NATIVE_REDIRECT_SCHEMES.has(scheme);
}

const REGISTER_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(status, body) {
  return Response.json(body, { status, headers: REGISTER_CORS });
}

/**
 * RFC 7591 DCR handler. Validates redirect_uris before the AS-configured
 * check so a bad URI is 400 even when Temper is down. `deps.register` is
 * the Temper-backed client write; tests POST this function directly.
 */
export async function handleOauthRegister(req, deps) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_client_metadata" });
  }

  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((u) => typeof u === "string")
    : [];
  if (
    redirectUris.length === 0 ||
    redirectUris.length > 10 ||
    !redirectUris.every(isAllowedRedirectUri)
  ) {
    return json(400, {
      error: "invalid_redirect_uri",
      error_description:
        "redirect_uris must be https URLs, loopback http URLs, or cursor:// / grok://.",
    });
  }

  if (!deps.isConfigured()) {
    return json(503, { error: "temporarily_unavailable" });
  }

  const clientName =
    typeof body.client_name === "string" && body.client_name.trim()
      ? body.client_name.trim().slice(0, 120)
      : "Unnamed agent";

  const client = await deps.register({
    client_name: clientName,
    redirect_uris: redirectUris,
    client_uri: typeof body.client_uri === "string" ? body.client_uri : "",
    logo_uri: typeof body.logo_uri === "string" ? body.logo_uri : "",
  });

  return json(201, {
    client_id: client.client_id,
    client_name: client.client_name,
    redirect_uris: client.redirect_uris,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
  });
}
