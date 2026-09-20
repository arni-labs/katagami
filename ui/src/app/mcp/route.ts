import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { verifyReadBearer, readMcpAuthInfo, whoamiFromAuth } from "@/lib/catalog-auth";
import { clampRejectionReason } from "@/lib/catalog-auth-core.mjs";
import { mcpPublicOrigin, MCP_RESOURCE_METADATA_PATH } from "@/lib/mcp-oauth.mjs";
import { trackMcpToolCall, trackServerEvent } from "@/lib/server-telemetry";
import { AsyncLocalStorage } from "node:async_hooks";
import { callerOf, mayStart, TOO_MANY } from "@/lib/spend-guard";
import {
  describeCatalog,
  askLibrary,
  composeKit,
  checkAgainstLanguage,
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

// Zod strips keys the schema does not declare, so by the time a registered
// handler runs, the very name we want to see — the one the agent reached for
// and we do not accept — is already gone. Layer 2 still holds the raw request,
// so it stashes the clamped key list there for layer 1 to report.
const RAW_ARG_KEYS = Symbol("katagami.mcp.rawArgKeys");
function stashRawArgKeys(extra: unknown, keys: string | undefined): void {
  if (extra && typeof extra === "object") {
    (extra as Record<symbol, string | undefined>)[RAW_ARG_KEYS] = keys;
  }
}
function rawArgKeys(extra: unknown): string | undefined {
  if (!extra || typeof extra !== "object") return undefined;
  return (extra as Record<symbol, string | undefined>)[RAW_ARG_KEYS];
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

// @tool is caller-controlled on the tools/call path: an unknown-tool call
// copies the REQUESTED name into telemetry, so "alice@example.com" (or a
// pasted token) would ship to Datadog as @tool. Only names this server
// actually registered may travel; anything else collapses to one bucket.
const REGISTERED_TOOL_NAMES = new Set<string>();

function clampToolName(requested: string): string {
  return REGISTERED_TOOL_NAMES.has(requested) ? requested : "(unregistered)";
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
  ) => {
    REGISTERED_TOOL_NAMES.add(name);
    return original(name, def, async (args: unknown, extra: unknown) => {
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
        const missing = isMissingId(result);
        trackMcpToolCall({
          tool: name,
          outcome: result?.isError ? "error" : "success",
          durationMs: Date.now() - started,
          sub: authOf(extra)?.extra?.sub,
          errorKind: timedOut
            ? "tool_budget_exceeded"
            : missing
              ? "missing_id"
              : undefined,
          argKeys: missing ? (rawArgKeys(extra) ?? argKeysOf(args)) : undefined,
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
  };

  // When the SDK rejects a call we know only THAT the arguments were invalid,
  // not WHICH. That gap cost a real diagnosis: 8 failed get_* calls read as
  // "invalid_arguments" and the cause (an agent passing `id`, the field search
  // hands back, where the schema wanted `id_or_slug`) had to be inferred from
  // reading the schemas. Report the argument KEY NAMES the caller sent —
  // never values, clamped to a known vocabulary so an arbitrary key cannot
  // blow up cardinality or smuggle content.

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
      const tool = clampToolName(request?.params?.name ?? "unknown");
      const started = Date.now();
      stashRawArgKeys(extra, argKeysOf((request?.params as { arguments?: unknown })?.arguments));
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
            argKeys: result?.isError ? rawArgKeys(extra) : undefined,
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
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    ...(data && typeof data === "object" && !Array.isArray(data) ? { structuredContent: data as Record<string, unknown> } : {}),
  };
}

// A style is a picture before it is a description, and an assistant answering a
// person should be able to show one. The first few cards' thumbnails ride along
// as image content; every thumbnail stays in the JSON as `thumbnail_url` for a
// host that would rather fetch its own. A picture that is slow, large or missing
// is left out — the answer never waits on it or fails for it.
const PICTURES = 3;
const PICTURE_MAX_BYTES = 400_000;
const PICTURE_TIMEOUT_MS = 2_500;
type Pictured = { name?: string; thumbnail_url?: string | null };

async function picture(card: Pictured) {
  const url = card.thumbnail_url;
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(PICTURE_TIMEOUT_MS) });
    const mimeType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!res.ok || !/^image\/(png|jpeg|webp|gif)$/.test(mimeType)) return null;
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > PICTURE_MAX_BYTES) return null;
    return [
      { type: "text" as const, text: card.name ?? "" },
      { type: "image" as const, data: Buffer.from(bytes).toString("base64"), mimeType },
    ];
  } catch {
    return null;
  }
}

async function okWithPictures(data: unknown, cards: Pictured[], wanted: boolean) {
  const base = ok(data);
  if (!wanted) return base;
  const pictures = (await Promise.all(cards.slice(0, PICTURES).map(picture))).flatMap((p) => p ?? []);
  return { ...base, content: [...base.content, ...pictures] };
}

// Every tool here reads. None writes to the commons, to the caller's account or
// to anything outside Katagami, and asking twice gives the same kind of answer.
const READS = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

const picturesArg = z
  .boolean()
  .optional()
  .describe("Attach thumbnails of the first three results as images (default true). Pass false when only the JSON is needed.");

const INSTRUCTIONS = `Katagami is a curated library of complete visual styles: design languages (tokens, rules, layout, a DESIGN.md), palette systems and art styles (prompt recipes for image generation). Everything here is read-only.

How to use it:
- Someone describes a product, a mood or a brief: call ask_library. It judges fit, returns pictures, and says how it read the sentence. To adjust ("quieter", "less corporate"), call ask_library again with the returned \`reading\` and \`changes\` plus \`refine\` — do not re-ask from scratch.
- Someone wants a whole look at once: call compose_kit for a language, palette and art style that belong together, with a build brief.
- Someone names a style, tag, family or medium: call the search_* tool for that kind. describe_catalog lists the families, mediums and tags that exist.
- To build with a design language: get_design_md gives the URL to hand a coding agent; get_tokens gives Tailwind or CSS variables; get_design_language has every rule. Honour the tokens exactly.
- To generate images in an art style: get_art_style returns the prompt template. Use it verbatim, then add the subject.
- After building a page in a language: check_against_language lists what breaks the language, worst first. Fix those before handing over.

Show people the picture and the katagami.ai link for anything you recommend. whoami says whether this connection sees the visitor shelf or the full library; results never include styles the caller may not see.`;
// A miss means different things per tier: on the sample tier the design may
// simply be outside the anonymous portion (sign in), but a full-tier caller has
// the whole catalog, so a miss is a genuine not-found — never tell them to sign in.
function gone(tier: Tier) {
  const body = tier === "full" ? NOT_FOUND : NEEDS_SIGN_IN;
  return { content: [{ type: "text" as const, text: JSON.stringify(body, null, 2) }], isError: true };
}

// When the SDK rejects a call we know only THAT the arguments were invalid,
// not WHICH. That gap cost a real diagnosis: 8 failed get_* calls read as
// "invalid_arguments" and the cause (an agent passing `id`, the field search
// hands back, where the schema wanted `id_or_slug`) had to be inferred from
// reading the schemas. Report the argument KEY NAMES the caller sent — never
// values, clamped to a known vocabulary so an arbitrary key cannot blow up
// cardinality or smuggle content.
const KNOWN_ARG_KEYS = new Set([
  "id_or_slug", "id", "slug", "kind", "format", "query", "medium", "tag",
  "taxonomy", "family", "limit", "cursor", "color", "role", "page",
]);
function argKeysOf(args: unknown): string | undefined {
  if (!args || typeof args !== "object") return "(none)";
  const keys = Object.keys(args as Record<string, unknown>)
    .map((k) => (KNOWN_ARG_KEYS.has(k) ? k : "(other)"))
    .filter((k, i, a) => a.indexOf(k) === i)
    .sort()
    .slice(0, 6);
  return keys.length ? keys.join(",") : "(none)";
}

// Agents reach for the field name search HANDED them. Search results carry
// `id` (lib/catalog.ts toRow), so `get_art_style({id})` is the natural next
// call — and it used to be rejected by the SDK before our handler ran, which
// is how 8 of one real user's 26 get_* calls failed in a single session
// (ARN-514). Accept the three names an agent will actually try. All optional
// at the schema layer so a missing id reaches OUR error message instead of a
// bare SDK validation failure the caller cannot act on.
// The one other field an agent has to guess. Its values are the ones our own
// responses carry (`"kind": "art_style"`), but nothing said so in the schema, so
// a caller reaching for the entity-set name — `design_language` — got a bare
// SDK rejection. Naming the values in the description is the same fix as the
// identifier aliases, one field over.
const kindArg = z
  .enum(["language", "palette", "art_style"])
  .describe(
    'Which kind of entry: "language", "palette" or "art_style" — the same values search results and get_* responses carry in their own `kind` field.',
  );

// `.nullish()`, not `.optional()`: clients that materialize every declared
// property send the unused aliases as JSON null. Rejecting those would refuse
// get_art_style({id_or_slug: "…", id: null, slug: null}) — a call carrying a
// perfectly good identifier, and one that worked before these keys existed.
const idArg = z
  .string()
  .describe("The entity id (en-…) or the slug")
  .nullish();
const ID_ALIASES = { id_or_slug: idArg, id: idArg, slug: idArg };

/** The one place an id is resolved. Returns the caller's value, or null with
 *  the message to hand back. */
function idOf(a: unknown): string | null {
  const o = (a ?? {}) as Record<string, unknown>;
  for (const k of ["id_or_slug", "id", "slug"]) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

const MISSING_ID_TEXT = JSON.stringify(
  {
    error: "missing_id",
    message:
      "Pass the entity id or slug. Any of `id_or_slug`, `id` or `slug` works — search results return it as `id`.",
  },
  null,
  2,
);

/** Who is spending a paid model call: the signed-in person, so one caller's loop cannot rate-limit everyone else. */
function spenderOf(extra: unknown): string {
  const who = authOf(extra)?.extra;
  return who?.sub || who?.email || openCaller.getStore() || "mcp";
}
/** On the open door nobody is signed in, so the spender is the address — otherwise every anonymous caller would share one allowance. */
const openCaller = new AsyncLocalStorage<string>();

function tooMany() {
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: "rate_limited", message: TOO_MANY }) }], isError: true };
}

function missingId() {
  return { content: [{ type: "text" as const, text: MISSING_ID_TEXT }], isError: true };
}

/** A caller reached a get_* handler with no identifier under any of the three
 *  names. Since the schema accepts the call, this no longer surfaces as an SDK
 *  `invalid_arguments` rejection — and without its own error_kind it would sit
 *  in telemetry as an ordinary handler error, invisible to the monitor whose
 *  whole job is to catch a schema/caller disagreement. It is the same event,
 *  so it carries the same diagnostics. */
function isMissingId(result: ToolResult | undefined): boolean {
  if (!result?.isError) return false;
  const first = (result.content as { text?: unknown }[] | undefined)?.[0];
  return first?.text === MISSING_ID_TEXT;
}

const baseHandler = createMcpHandler(
  (server: McpServer) => {
    withUsageTracking(server);
    // --- discovery ---------------------------------------------------------
    server.registerTool(
      "describe_catalog",
      {
        title: "Describe the catalog",
        annotations: READS,
        description:
          "Call this FIRST. Returns Katagami's three content kinds (design languages, palette systems, art styles) with live counts, the families you can browse (with counts), the art-style mediums, common tags per kind, and which facets each kind supports. This is how you learn what you can search by.",
        inputSchema: {},
      },
      async (_args, extra) => ok(await describeCatalog(tierOf(extra))),
    );

    // --- ask: judgment over the whole library --------------------------------
    server.registerTool(
      "ask_library",
      {
        title: "Ask the library",
        annotations: READS,
        description:
          "Find styles for a product, mood or brief. Describe what is being designed in one sentence and get the design languages and art styles that fit it, judged against each style's description rather than matched on keywords, with thumbnails. Returns `results` (best fit first: `fit` 0..1, strongest `traits`, `url`, `thumbnail_url`), `strange` (styles unlike the rest of the library that still fit — for when something unexpected is wanted), how the sentence was read (`wants`, `avoids`), and `reading`. To adjust an answer — \"quieter\", \"warmer, less corporate\" — call again with the same `query`, the returned `reading` and `changes`, and the adjustment in `refine`: the reading is moved rather than re-read, and `moved` says which traits went where. Use this before search_* whenever there is a brief rather than a name or tag. Palettes are not judged here yet; use search_palettes.",
        inputSchema: {
          query: z.string().min(8).max(400).describe("One sentence: what the product is and who it is for"),
          kind: z.enum(["language", "art_style"]).optional().describe("Omit to look through both"),
          limit: z.number().int().min(1).max(20).optional().describe("How many results (default 8)"),
          refine: z.string().min(2).max(400).optional().describe("A change to the previous answer, e.g. \"quieter and warmer\". Pass `reading` from that answer with it."),
          reading: z.record(z.string(), z.number()).optional().describe("The `reading` object from a previous ask_library answer, passed back unchanged"),
          changes: z.string().max(400).optional().describe("The `changes` string from a previous answer, passed back unchanged"),
          images: picturesArg,
        },
      },
      async (a, extra) => {
        const tier = tierOf(extra);
        if (!mayStart("mcp-ask", spenderOf(extra), tier)) return tooMany();
        const { want, ...answer } = await askLibrary(tier, {
          query: a.query,
          kind: a.kind,
          limit: a.limit,
          want: a.reading,
          refine: a.refine,
          changes: a.changes,
        });
        return okWithPictures({ ...answer, reading: want }, answer.results, a.images !== false);
      },
    );

    server.registerTool(
      "compose_kit",
      {
        title: "Compose a kit",
        annotations: READS,
        description:
          "Get a complete starting point for a product in one call: a design language (UI tokens and rules), a palette system and an art style (for imagery), each judged to fit the product and judged to belong together. Returns up to three `kits`, one per language, each with the three parts (`url`, `thumbnail_url`, `fit`), `belongs_together` and `fits_product` (0..1), and a `brief_url` — the build brief for that exact combination, ready to hand to a coding agent. Use this when someone wants a whole look; use ask_library or the search_* tools to choose one kind at a time, then compose the same URLs yourself.",
        inputSchema: {
          query: z.string().min(8).max(400).describe("One sentence: what the product is and who it is for"),
          limit: z.number().int().min(1).max(4).optional().describe("How many kits (default 3)"),
          images: picturesArg,
        },
      },
      async (a, extra) => {
        const tier = tierOf(extra);
        if (!mayStart("mcp-kit", spenderOf(extra), tier)) return tooMany();
        const kits = await composeKit(tier, a);
        const first = kits.kits[0];
        return okWithPictures(kits, first ? [first.language, first.palette, first.art_style] : [], a.images !== false);
      },
    );

    server.registerTool(
      "check_against_language",
      {
        title: "Check a page against a design language",
        annotations: READS,
        description:
          "After building a page with a Katagami design language, pass the language and the page's source (HTML with its CSS) to get a scorecard: exact checks of colours, typefaces and corner radii against the language's tokens, and each of the language's rules, do's and don'ts judged against the page (pass / unclear / fail, worst first). Use it to find what to fix before you hand the page over. It reads source, not pixels, so include the CSS.",
        inputSchema: {
          ...ID_ALIASES,
          page: z.string().min(40).max(200_000).describe("The page's HTML source, CSS included"),
        },
      },
      async (a, extra) => {
        const tier = tierOf(extra);
        const id = idOf(a);
        if (!id) return missingId();
        if (!mayStart("mcp-check", spenderOf(extra), tier)) return tooMany();
        const card = await checkAgainstLanguage(tier, id, a.page);
        return card ? ok(card) : gone(tier);
      },
    );

    // --- design languages --------------------------------------------------
    server.registerTool(
      "search_design_languages",
      {
        title: "Search design languages",
        annotations: READS,
        description:
          "Search complete design systems (tokens, rules, layout, philosophy). Facets: family, taxonomy, tag (names from describe_catalog), plus free-text query. Each result carries its facets back so you can refine.",
        inputSchema: {
          query: z.string().optional(),
          family: z.string().optional().describe("A family name from describe_catalog"),
          taxonomy: z.string().optional(),
          tag: z.string().optional(),
          limit: z.number().int().min(1).max(100).optional(),
          cursor: z.number().int().min(0).optional().describe("`next_cursor` from the previous page"),
          images: picturesArg,
        },
      },
      async ({ images, ...a }, extra) => {
        const found = await searchDesigns("language", tierOf(extra), a);
        return okWithPictures(found, found.results, images !== false);
      },
    );
    server.registerTool(
      "get_design_language",
      {
        title: "Get a design language",
        annotations: READS,
        description:
          "Full spec of one design language: tokens (color/type/spacing/radii/shadows/motion), rules, layout principles, philosophy, guidance, plus its gallery and DESIGN.md URLs.",
        inputSchema: { ...ID_ALIASES },
      },
      async (a, extra) => {
        const tier = tierOf(extra);
        const id = idOf(a);
        if (!id) return missingId();
        const d = await getDesign("language", id, tier);
        return d ? ok(d) : gone(tier);
      },
    );
    server.registerTool(
      "get_design_md",
      {
        title: "Get DESIGN.md",
        annotations: READS,
        description:
          "The portable DESIGN.md for a design language (Google's format) — the URL to drop straight into a coding agent's working directory so it builds in that style.",
        inputSchema: { ...ID_ALIASES },
      },
      async (a, extra) => {
        const tier = tierOf(extra);
        const id = idOf(a);
        if (!id) return missingId();
        const d = await getDesignMd(id, tier);
        return d ? ok(d) : gone(tier);
      },
    );
    server.registerTool(
      "get_tokens",
      {
        title: "Get design tokens",
        annotations: READS,
        description:
          "Just the design tokens for a language (or palette/art_style), optionally emitted as a ready-to-paste Tailwind config or CSS variables.",
        inputSchema: {
          kind: kindArg.optional(),
          ...ID_ALIASES,
          format: z.enum(["json", "tailwind", "css"]).optional(),
        },
      },
      async (a, extra) => {
        const tier = tierOf(extra);
        const id = idOf(a);
        if (!id) return missingId();
        const d = await getTokens(a.kind ?? "language", id, tier, a.format ?? "json");
        return d ? ok(d) : gone(tier);
      },
    );

    // --- palettes ----------------------------------------------------------
    server.registerTool(
      "search_palettes",
      {
        title: "Search palette systems",
        annotations: READS,
        description:
          "Search color systems (signature colors, ramps, semantic roles, proof scenes). Facets: taxonomy, tag, free-text query.",
        inputSchema: {
          query: z.string().optional(),
          taxonomy: z.string().optional(),
          tag: z.string().optional(),
          limit: z.number().int().min(1).max(100).optional(),
          cursor: z.number().int().min(0).optional().describe("`next_cursor` from the previous page"),
          images: picturesArg,
        },
      },
      async ({ images, ...a }, extra) => {
        const found = await searchDesigns("palette", tierOf(extra), a);
        return okWithPictures(found, found.results, images !== false);
      },
    );
    server.registerTool(
      "get_palette",
      {
        title: "Get a palette system",
        annotations: READS,
        description:
          "Full spec of one palette system: signature colors, neutrals, semantic roles, ramps, tokens, guidance.",
        inputSchema: { ...ID_ALIASES },
      },
      async (a, extra) => {
        const tier = tierOf(extra);
        const id = idOf(a);
        if (!id) return missingId();
        const d = await getDesign("palette", id, tier);
        return d ? ok(d) : gone(tier);
      },
    );

    // --- art styles --------------------------------------------------------
    server.registerTool(
      "search_art_styles",
      {
        title: "Search art styles",
        annotations: READS,
        description:
          "Search image / illustration styles for image-generation. Facets: medium (illustration/photography/print/painting/3d/collage/mixed), tag, taxonomy, free-text query.",
        inputSchema: {
          query: z.string().optional(),
          medium: z.string().optional(),
          tag: z.string().optional(),
          taxonomy: z.string().optional(),
          limit: z.number().int().min(1).max(100).optional(),
          cursor: z.number().int().min(0).optional().describe("`next_cursor` from the previous page"),
          images: picturesArg,
        },
      },
      async ({ images, ...a }, extra) => {
        const found = await searchDesigns("art_style", tierOf(extra), a);
        return okWithPictures(found, found.results, images !== false);
      },
    );
    server.registerTool(
      "get_art_style",
      {
        title: "Get an art style",
        annotations: READS,
        description:
          "Full spec of one art style: its medium, prompt template, slot recipes, negative prompt, guidance, tags — everything an image-gen agent needs to render in-style.",
        inputSchema: { ...ID_ALIASES },
      },
      async (a, extra) => {
        const tier = tierOf(extra);
        const id = idOf(a);
        if (!id) return missingId();
        const d = await getDesign("art_style", id, tier);
        return d ? ok(d) : gone(tier);
      },
    );

    // --- any kind ----------------------------------------------------------
    server.registerTool(
      "get_embodiment",
      {
        title: "Get the rendered reference page",
        annotations: READS,
        description:
          "The URL of the rendered reference page for a language/palette/art_style — open it to see the style across real UI elements before using it.",
        inputSchema: { kind: kindArg, ...ID_ALIASES },
      },
      async (a, extra) => {
        const tier = tierOf(extra);
        const id = idOf(a);
        if (!id) return missingId();
        const d = await getEmbodiment(a.kind, id, tier);
        return d ? ok(d) : gone(tier);
      },
    );
    server.registerTool(
      "whoami",
      {
        title: "Who am I / my access",
        annotations: READS,
        description: "Shows your access tier (sample vs full) and how to unlock the full catalog.",
        inputSchema: {},
      },
      async (_args, extra) => ok(whoamiFromAuth(authOf(extra))),
    );
  },
  { serverInfo: { name: "katagami", version: "1.0.0" }, instructions: INSTRUCTIONS },
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

// The open door (/mcp/open, rewritten here with ?door=open): the same server and
// tools with no identity at all, so every call is answered from the visitor shelf
// — exactly what a signed-out person sees on the website, through the same gate
// in lib/catalog.ts. A bearer sent here is dropped, not verified: this door never
// grants more than the shelf, and a host that wants the full library connects to
// /mcp, where the 401 starts the sign-in. Asking directly for /mcp?door=open is
// the same request and gets the same answer.
function isOpenDoor(req: Request): boolean {
  const url = new URL(req.url);
  return url.searchParams.get("door") === "open" || url.pathname.replace(/\/+$/, "").endsWith("/mcp/open");
}
async function openDoor(req: Request): Promise<Response> {
  const headers = new Headers(req.headers);
  headers.delete("authorization");
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();
  return openCaller.run(`open:${callerOf(req)}`, () => baseHandler(new Request(req.url, { method: req.method, headers, body })));
}
const door = (req: Request) => (isOpenDoor(req) ? openDoor(req) : trackedHandler(req));

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
  return door(req);
}

export { get as GET, door as POST, door as DELETE };
