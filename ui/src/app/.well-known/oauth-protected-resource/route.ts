import {
  protectedResourceHandler,
  metadataCorsOptionsRequestHandler,
} from "mcp-handler";

// RFC 9728 protected-resource metadata for the read MCP (ARN-360). Points MCP
// clients at katagami.ai's authorization server (ARN-151) so a client that
// wants the full catalog can sign in with Google. Anonymous access still
// works without any of this — auth only upgrades the sample tier to full.

const handler = protectedResourceHandler({
  authServerUrls: [process.env.KATAGAMI_AS_ISSUER || "https://katagami.ai"],
});

export { handler as GET };
export const OPTIONS = metadataCorsOptionsRequestHandler();
