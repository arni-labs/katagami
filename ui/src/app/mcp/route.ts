import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { verifyReadBearer, readMcpAuthInfo, whoamiFromAuth } from "@/lib/catalog-auth";
import { mcpPublicOrigin, MCP_RESOURCE_METADATA_PATH } from "@/lib/mcp-oauth.mjs";
import {
  describeCatalog,
  searchDesigns,
  getDesign,
  getDesignMd,
  getEmbodiment,
  getTokens,
  NEEDS_SIGN_IN,
  NOT_FOUND,
  type Kind,
  type Tier,
} from "@/lib/catalog";

// The Katagami read MCP (ARN-360), served at /mcp on katagami.ai — the same
// Next.js app that serves the website, reading the commons through the one
// shared gate in lib/catalog.ts. Auth is REQUIRED: no bearer → HTTP 401 with
// WWW-Authenticate pointing at protected-resource metadata, which is how
// Grok Bot (and other MCP hosts) draw a connect card. A valid Google-backed
// OAuth token → the full catalog. Read-only: no remix/submit/nominate.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authOf(extra: unknown): { extra?: { email?: string } } | undefined {
  return (extra as { http?: { authInfo?: { extra?: { email?: string } } } })?.http?.authInfo;
}
function tierOf(extra: unknown): Tier {
  return authOf(extra) ? "full" : "sample";
}
function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
// A miss means different things per tier: on the sample tier the design may
// simply be outside the anonymous portion (sign in), but a full-tier caller has
// the whole catalog, so a miss is a genuine not-found — never tell them to sign in.
function gone(tier: Tier) {
  const body = tier === "full" ? NOT_FOUND : NEEDS_SIGN_IN;
  return { content: [{ type: "text" as const, text: JSON.stringify(body, null, 2) }], isError: true };
}

const idArg = z.string().describe("The entity id (en-…) or the slug");

const baseHandler = createMcpHandler(
  (server: McpServer) => {
    // --- discovery ---------------------------------------------------------
    server.registerTool(
      "describe_catalog",
      {
        title: "Describe the catalog",
        description:
          "Call this FIRST. Returns Katagami's three content kinds (design languages, palette systems, art styles) with live counts, the families you can browse (with counts), the art-style mediums, common tags per kind, and which facets each kind supports. This is how you learn what you can search by.",
        inputSchema: {},
      },
      async (_args, extra) => ok(await describeCatalog(tierOf(extra))),
    );

    // --- design languages --------------------------------------------------
    server.registerTool(
      "search_design_languages",
      {
        title: "Search design languages",
        description:
          "Search complete design systems (tokens, rules, layout, philosophy). Facets: family, taxonomy, tag (names from describe_catalog), plus free-text query. Each result carries its facets back so you can refine.",
        inputSchema: {
          query: z.string().optional(),
          family: z.string().optional().describe("A family name from describe_catalog"),
          taxonomy: z.string().optional(),
          tag: z.string().optional(),
          limit: z.number().int().min(1).max(100).optional(),
          cursor: z.number().int().min(0).optional(),
        },
      },
      async (a, extra) =>
        ok(await searchDesigns("language", tierOf(extra), a)),
    );
    server.registerTool(
      "get_design_language",
      {
        title: "Get a design language",
        description:
          "Full spec of one design language: tokens (color/type/spacing/radii/shadows/motion), rules, layout principles, philosophy, guidance, plus its gallery and DESIGN.md URLs.",
        inputSchema: { id_or_slug: idArg },
      },
      async (a, extra) => {
        const tier = tierOf(extra);
        const d = await getDesign("language", a.id_or_slug, tier);
        return d ? ok(d) : gone(tier);
      },
    );
    server.registerTool(
      "get_design_md",
      {
        title: "Get DESIGN.md",
        description:
          "The portable DESIGN.md for a design language (Google's format) — the URL to drop straight into a coding agent's working directory so it builds in that style.",
        inputSchema: { id_or_slug: idArg },
      },
      async (a, extra) => {
        const tier = tierOf(extra);
        const d = await getDesignMd(a.id_or_slug, tier);
        return d ? ok(d) : gone(tier);
      },
    );
    server.registerTool(
      "get_tokens",
      {
        title: "Get design tokens",
        description:
          "Just the design tokens for a language (or palette/art_style), optionally emitted as a ready-to-paste Tailwind config or CSS variables.",
        inputSchema: {
          kind: z.enum(["language", "palette", "art_style"]).optional(),
          id_or_slug: idArg,
          format: z.enum(["json", "tailwind", "css"]).optional(),
        },
      },
      async (a, extra) => {
        const tier = tierOf(extra);
        const d = await getTokens(a.kind ?? "language", a.id_or_slug, tier, a.format ?? "json");
        return d ? ok(d) : gone(tier);
      },
    );

    // --- palettes ----------------------------------------------------------
    server.registerTool(
      "search_palettes",
      {
        title: "Search palette systems",
        description:
          "Search color systems (signature colors, ramps, semantic roles, proof scenes). Facets: taxonomy, tag, free-text query.",
        inputSchema: {
          query: z.string().optional(),
          taxonomy: z.string().optional(),
          tag: z.string().optional(),
          limit: z.number().int().min(1).max(100).optional(),
          cursor: z.number().int().min(0).optional(),
        },
      },
      async (a, extra) => ok(await searchDesigns("palette", tierOf(extra), a)),
    );
    server.registerTool(
      "get_palette",
      {
        title: "Get a palette system",
        description:
          "Full spec of one palette system: signature colors, neutrals, semantic roles, ramps, tokens, guidance.",
        inputSchema: { id_or_slug: idArg },
      },
      async (a, extra) => {
        const tier = tierOf(extra);
        const d = await getDesign("palette", a.id_or_slug, tier);
        return d ? ok(d) : gone(tier);
      },
    );

    // --- art styles --------------------------------------------------------
    server.registerTool(
      "search_art_styles",
      {
        title: "Search art styles",
        description:
          "Search image / illustration styles for image-generation. Facets: medium (illustration/photography/print/painting/3d/collage/mixed), tag, taxonomy, free-text query.",
        inputSchema: {
          query: z.string().optional(),
          medium: z.string().optional(),
          tag: z.string().optional(),
          taxonomy: z.string().optional(),
          limit: z.number().int().min(1).max(100).optional(),
          cursor: z.number().int().min(0).optional(),
        },
      },
      async (a, extra) => ok(await searchDesigns("art_style", tierOf(extra), a)),
    );
    server.registerTool(
      "get_art_style",
      {
        title: "Get an art style",
        description:
          "Full spec of one art style: its medium, prompt template, slot recipes, negative prompt, guidance, tags — everything an image-gen agent needs to render in-style.",
        inputSchema: { id_or_slug: idArg },
      },
      async (a, extra) => {
        const tier = tierOf(extra);
        const d = await getDesign("art_style", a.id_or_slug, tier);
        return d ? ok(d) : gone(tier);
      },
    );

    // --- any kind ----------------------------------------------------------
    server.registerTool(
      "get_embodiment",
      {
        title: "Get the rendered reference page",
        description:
          "The URL of the rendered reference page for a language/palette/art_style — open it to see the style across real UI elements before using it.",
        inputSchema: { kind: z.enum(["language", "palette", "art_style"]), id_or_slug: idArg },
      },
      async (a, extra) => {
        const tier = tierOf(extra);
        const d = await getEmbodiment(a.kind, a.id_or_slug, tier);
        return d ? ok(d) : gone(tier);
      },
    );
    server.registerTool(
      "whoami",
      {
        title: "Who am I / my access",
        description: "Shows your access tier (sample vs full) and how to unlock the full catalog.",
        inputSchema: {},
      },
      async (_args, extra) => ok(whoamiFromAuth(authOf(extra))),
    );
  },
  { serverInfo: { name: "katagami", version: "0.1.0" } },
);

// Required auth: no/invalid token → 401 + WWW-Authenticate (the connect card).
// A valid token → full catalog. Do not answer initialize 200 anonymously —
// that is why Grok Bot's AuthenticateMcpServer returned no_auth_link.
const handler = withMcpAuth(
  baseHandler,
  async (_req: Request, bearer?: string): Promise<AuthInfo | undefined> =>
    readMcpAuthInfo(bearer, verifyReadBearer) as Promise<AuthInfo | undefined>,
  {
    required: true,
    resourceMetadataPath: MCP_RESOURCE_METADATA_PATH,
    resourceUrl: mcpPublicOrigin(),
  },
);

// A human pasting the MCP URL into a browser sends a plain-HTML GET; a real
// MCP client opening the optional SSE stream MUST send
// `Accept: text/event-stream` (Streamable HTTP spec), and POST/DELETE — the
// actual protocol path — are untouched. So: browsers land on the setup page,
// MCP clients never notice.
async function get(req: Request): Promise<Response> {
  const accept = req.headers.get("accept") ?? "";
  if (!accept.toLowerCase().includes("text/event-stream")) {
    return new Response(null, { status: 302, headers: { Location: "/connect" } });
  }
  return handler(req);
}

export { get as GET, handler as POST, handler as DELETE };
