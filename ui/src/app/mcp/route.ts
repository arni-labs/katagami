import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { verifyReadBearer, readMcpAuthInfo, whoamiFromAuth } from "@/lib/catalog-auth";
import { clampRejectionReason } from "@/lib/catalog-auth-core.mjs";
import { mcpPublicOrigin, MCP_RESOURCE_METADATA_PATH } from "@/lib/mcp-oauth.mjs";
import { trackMcpToolCall, trackServerEvent } from "@/lib/server-telemetry";
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

function authOf(extra: unknown): { extra?: { email?: string; sub?: string } } | undefined {
  return (extra as { http?: { authInfo?: { extra?: { email?: string; sub?: string } } } })?.http
    ?.authInfo;
}
function tierOf(extra: unknown): Tier {
  return authOf(extra) ? "full" : "sample";
}

// Datadog usage tracking (ARN-436), two layers so nothing is invisible:
//
// Layer 1 patches registerTool: every registered handler — including any
// added later — reports tool name, outcome (success / error / exception),
// and handler-only duration. Handlers pass through untouched (the
// mcp-handler overload gotcha: never re-annotate their params); the wrapper
// awaits, observes, and marks the call context as tracked.
//
// Layer 2 patches the SDK's tools/call request handler: the MCP SDK
// validates arguments against the zod inputSchema BEFORE the registered
// callback runs, so a client sending malformed calls never reaches layer 1 —
// it used to show zero usage AND zero errors. Layer 2 emits for exactly the
// calls layer 1 never saw (schema rejections, unknown/disabled tools —
// covering legacy server.tool() registrations too, should one appear), so a
// misbehaving client is a visible error-rate spike, not silence.
type ToolResult = { isError?: boolean; content?: { type?: string; text?: string }[] } | undefined;
type ToolHandler = (args: unknown, extra: unknown) => Promise<ToolResult> | ToolResult;
type ToolCallRequest = { params?: { name?: string } };
type RpcHandler = (request: ToolCallRequest, extra: unknown) => Promise<unknown> | unknown;

// A slow tool must not eat the telemetry budget: /mcp exports maxDuration 60
// and after() shares it, so a handler finishing at the kill line drops its
// own hash+emit — silently biasing the p95 latency widget DOWN by losing
// precisely the slowest calls. Cap handlers below maxDuration instead: the
// caller gets a clean isError result and the datapoint ships.
const TELEMETRY_RESERVE_MS = 5_000;
const TOOL_BUDGET_MS = maxDuration * 1000 - TELEMETRY_RESERVE_MS;

const TRACKED = Symbol("katagami.mcp.tracked");
function markTracked(extra: unknown): void {
  if (extra && typeof extra === "object") {
    (extra as Record<symbol, boolean>)[TRACKED] = true;
  }
}
function wasTracked(extra: unknown): boolean {
  return (
    !!extra && typeof extra === "object" && (extra as Record<symbol, boolean>)[TRACKED] === true
  );
}

function budgetExceeded(name: string): ToolResult {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: `Tool ${name} exceeded its ${Math.round(TOOL_BUDGET_MS / 1000)}s budget.`,
      },
    ],
  };
}

function withUsageTracking(server: McpServer): void {
  // Layer 1: per registered tool.
  const original = server.registerTool.bind(server) as unknown as (
    name: string,
    def: unknown,
    handler: ToolHandler,
  ) => unknown;
  (server as unknown as { registerTool: unknown }).registerTool = (
    name: string,
    def: unknown,
    handler: ToolHandler,
  ) =>
    original(name, def, async (args: unknown, extra: unknown) => {
      markTracked(extra);
      const started = Date.now();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let timedOut = false;
      try {
        const budget = new Promise<ToolResult>((resolveBudget) => {
          timer = setTimeout(() => {
            timedOut = true;
            resolveBudget(budgetExceeded(name));
          }, TOOL_BUDGET_MS);
        });
        const result = await Promise.race([Promise.resolve(handler(args, extra)), budget]);
        // Hash + emit only inside after() — a hash/intake throw must not
        // 500 the tool or inflate duration_ms.
        trackMcpToolCall({
          tool: name,
          outcome: result?.isError ? "error" : "success",
          durationMs: Date.now() - started,
          sub: authOf(extra)?.extra?.sub,
          errorKind: timedOut ? "tool_budget_exceeded" : undefined,
        });
        return result;
      } catch (err) {
        trackMcpToolCall({
          tool: name,
          outcome: "exception",
          durationMs: Date.now() - started,
          sub: authOf(extra)?.extra?.sub,
          errorKind: err instanceof Error ? err.name : "unknown",
        });
        throw err;
      } finally {
        clearTimeout(timer);
      }
    });

  // Layer 2: the tools/call request handler. The SDK installs it via
  // server.server.setRequestHandler("tools/call", …) on first registration,
  // which happens after this patch, so the interception always lands.
  const inner = (
    server as unknown as {
      server: { setRequestHandler: (method: string, handler: RpcHandler) => void };
    }
  ).server;
  const originalSet = inner.setRequestHandler.bind(inner);
  inner.setRequestHandler = (method: string, handler: RpcHandler) => {
    if (method !== "tools/call") return originalSet(method, handler);
    originalSet(method, async (request: ToolCallRequest, extra: unknown) => {
      const tool = request?.params?.name ?? "unknown";
      const started = Date.now();
      try {
        const result = (await handler(request, extra)) as ToolResult;
        if (!wasTracked(extra)) {
          // The registered handler never ran: this isError is the SDK's own
          // rejection — for us, always an inputSchema validation failure
          // (handler throws are converted to isError AFTER layer 1 tracked
          // them, so the flag filters those out).
          trackMcpToolCall({
            tool,
            outcome: result?.isError ? "error" : "success",
            durationMs: Date.now() - started,
            sub: authOf(extra)?.extra?.sub,
            errorKind: result?.isError ? "invalid_arguments" : undefined,
          });
        }
        return result;
      } catch (err) {
        // Unknown or disabled tool: the SDK throws a ProtocolError before
        // its own try/catch. Count it — a client calling missing tools is
        // a signal, not noise.
        if (!wasTracked(extra)) {
          trackMcpToolCall({
            tool,
            outcome: "exception",
            durationMs: Date.now() - started,
            sub: authOf(extra)?.extra?.sub,
            errorKind: err instanceof Error ? err.name : "unknown",
          });
        }
        throw err;
      }
    });
  };
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
    withUsageTracking(server);
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
//
// Rejection reasons (ARN-451): when a PRESENTED bearer is rejected, the
// verify callback stashes WHY (a value from AUTH_REJECTION_REASONS — closed,
// low-cardinality, never token material) keyed on the request, so the 401
// counter below can tell an expired token from a wrong audience from a
// probing bot. WeakMap: no cleanup needed, and a request that never 401s
// simply never reads it.
const authRejectionReasons = new WeakMap<Request, string>();

const handler = withMcpAuth(
  baseHandler,
  async (req: Request, bearer?: string): Promise<AuthInfo | undefined> => {
    try {
      return (await readMcpAuthInfo(bearer, verifyReadBearer)) as AuthInfo | undefined;
    } catch (err) {
      const reason = (err as { rejectionReason?: string }).rejectionReason;
      if (req && reason) authRejectionReasons.set(req, reason);
      throw err;
    }
  },
  {
    required: true,
    resourceMetadataPath: MCP_RESOURCE_METADATA_PATH,
    resourceUrl: mcpPublicOrigin(),
  },
);

// Anonymous demand must not be structurally invisible (ARN-436 review):
// every verb on /mcp requires auth, so if the OAuth connect flow breaks,
// calls just stop — indistinguishable from waning interest. Count each 401
// as mcp_auth_challenge: has_auth:false is a fresh client meeting the
// connect card (demand), has_auth:true is a rejected/expired token (a
// possibly broken flow). Emitted via after(); the 401 response is untouched.
function withAuthChallengeCount(
  wrapped: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const res = await wrapped(req);
    if (res.status === 401) {
      const hasAuth = (req.headers.get("authorization") ?? "") !== "";
      trackServerEvent("mcp_auth_challenge", {
        has_auth: hasAuth,
        method: req.method,
        // Only meaningful when a bearer WAS presented: the closed-vocabulary
        // rejection reason stashed by the verify callback (ARN-451). A 401
        // with a header the verifier never saw (e.g. non-Bearer scheme)
        // reads "unknown" — still enumerable.
        // Clamped AGAIN at the emit boundary (defense in depth): even if a
        // future throw stashes free text, only AUTH_REJECTION_REASONS values
        // can reach Datadog.
        reason: hasAuth ? clampRejectionReason(authRejectionReasons.get(req)) : undefined,
      });
    }
    return res;
  };
}
const trackedHandler = withAuthChallengeCount(handler);

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
  return trackedHandler(req);
}

export { get as GET, trackedHandler as POST, trackedHandler as DELETE };
