// Shared MCP OAuth helpers for the gallery read server at /mcp.
// Grok Bot (and other MCP hosts) only draw a connect card when an
// unauthenticated request 401s with WWW-Authenticate pointing at RFC 9728
// protected-resource metadata whose `resource` is the MCP URL itself.

const BLOCKED_REDIRECT_SCHEMES = new Set([
  "javascript",
  "data",
  "file",
  "vbscript",
  "blob",
]);

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
  };
}

/**
 * DCR redirect allow-list. MCP hosts register whatever they use:
 * https callbacks, loopback http, and private-use schemes (Cursor's
 * cursor://…, VS Code, Grok Bot). Block only dangerous schemes.
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
  if (BLOCKED_REDIRECT_SCHEMES.has(scheme)) return false;
  if (scheme === "https") return Boolean(u.hostname);
  if (scheme === "http") {
    return (
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      u.hostname === "[::1]" ||
      u.hostname === "::1"
    );
  }
  return /^[a-z][a-z0-9+.-]*$/.test(scheme);
}
