import { GET as originGET, OPTIONS } from "../route";

// RFC 9728 path-scoped metadata for https://katagami.ai/mcp.
// Same document as /.well-known/oauth-protected-resource so a host that
// probes the path-scoped well-known URI still sees resource=/mcp.

export const dynamic = "force-dynamic";

export { originGET as GET, OPTIONS };
