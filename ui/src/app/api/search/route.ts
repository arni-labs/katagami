import { NextResponse } from "next/server";
import {
  isSearchLane,
  lanePath,
  searchAllLanes,
  searchLane,
  SearchUnavailableError,
  type SearchHit,
} from "@/lib/search";
import { TASTE_EMBEDDING_MODEL } from "@/lib/embeddings";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { featuredIds } from "@/lib/catalog";

export const dynamic = "force-dynamic";

/**
 * GET /api/search — free-text semantic search over the commons (ARN-244).
 * The documented agent surface: a text query is embedded (MiniLM) and ranked
 * against each lane's stored taste vectors in the Temper kernel.
 *
 * ARN-385: anonymous callers rank the same featured portion the website
 * teaser and the read-MCP sample show — languages, art styles, AND palettes.
 * Signed-in callers rank the full Published catalog. The embed + kernel calls
 * use the server's own credentials, never exposed.
 *
 *   ?q=<text>              required — the phrase to rank by meaning
 *   ?lane=language|palette|art-style   optional — omit to search across all lanes
 *   ?k=<1..25>             optional — how many results (default 8)
 *   ?format=concise|detailed           optional — concise (default) or +tags/summary
 *
 * Response: { query, model, lane, count, results: [{ id, kind, name, score, url,
 * design_md_url?, ... }] } — a few high-signal rows with stable ids and working
 * gallery/DESIGN.md links, per the tool-design playbook.
 */

const DEFAULT_K = 8;
const MAX_K = 25;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  if (!query) {
    return NextResponse.json(
      { error: "missing 'q' — provide a text query to rank by meaning" },
      { status: 400 },
    );
  }

  const laneParam = url.searchParams.get("lane");
  if (laneParam && !isSearchLane(laneParam)) {
    return NextResponse.json(
      {
        error: `unknown lane '${laneParam}' — use one of language | palette | art-style, or omit to search all lanes`,
      },
      { status: 400 },
    );
  }
  const lane = laneParam && isSearchLane(laneParam) ? laneParam : null;

  const kRaw = Number.parseInt(url.searchParams.get("k") ?? "", 10);
  const k = Number.isFinite(kRaw) ? Math.min(Math.max(kRaw, 1), MAX_K) : DEFAULT_K;
  const detailed = url.searchParams.get("format") === "detailed";

  const full = await hasFullGalleryAccess();
  const featuredOnly = !full;

  let hits;
  try {
    hits = lane
      ? await searchLane(lane, query, k, detailed, { featuredOnly })
      : await searchAllLanes(query, k, detailed, { featuredOnly });
  } catch (err) {
    if (err instanceof SearchUnavailableError) {
      return NextResponse.json(
        { error: "search temporarily unavailable — try again shortly" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    throw err;
  }

  // Membership is the source of truth (same as the HTML detail gate). The
  // kernel featured filter can be non-honored; never return an off-shelf id of
  // any kind to an anonymous caller — those detail/DESIGN.md links would 404,
  // and the names themselves are the leak. Palettes gate the same way now.
  //
  // Compute each present kind's visitor-shelf id set ONCE — featuredIds() reads
  // the full published set and THROWS on a backend fault (unlike listVisible*,
  // which fail-closed to []). A failed lookup must surface as "unavailable", not
  // a silent 200 with count:0 that masquerades as "no results".
  if (featuredOnly) {
    let shelfByKind: Map<SearchHit["kind"], Set<string>>;
    try {
      const kinds = [...new Set(hits.map((hit) => hit.kind))];
      const sets = await Promise.all(
        kinds.map((kind) =>
          featuredIds(kind === "art-style" ? "art_style" : kind),
        ),
      );
      shelfByKind = new Map(kinds.map((kind, i) => [kind, sets[i]]));
    } catch {
      return NextResponse.json(
        { error: "search temporarily unavailable — try again shortly" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    hits = hits.filter((hit) => shelfByKind.get(hit.kind)?.has(hit.id));
  }

  const base = siteBase(request);
  const results = hits.map((hit) => withLinks(hit, base, detailed));

  return NextResponse.json(
    {
      query,
      model: TASTE_EMBEDDING_MODEL,
      lane: lane ?? "all",
      count: results.length,
      results,
    },
    {
      headers: {
        // Signed-in ranking is the full catalog — never a shared cache, or
        // an anonymous replay would inherit those ids. The featured sample
        // is public.
        "Cache-Control": full ? "private, no-store" : "public, max-age=60",
      },
    },
  );
}

/** The absolute base for gallery + DESIGN.md links. Prefer an explicit site URL
 *  (so prod links are always canonical katagami.ai), else the request origin
 *  (correct for local e2e). */
function siteBase(request: Request): string {
  const configured = (
    process.env.KATAGAMI_SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    ""
  ).replace(/\/+$/, "");
  if (configured) return configured;
  return new URL(request.url).origin;
}

/** Concise = the high-signal minimum (id, name, score, links). Detailed adds
 *  slug/tags/medium/summary. Both carry stable ids and working links. */
function withLinks(hit: SearchHit, base: string, detailed: boolean) {
  const url = `${base}/${lanePath(hit.kind)}/${hit.id}`;
  const out: Record<string, unknown> = {
    id: hit.id,
    kind: hit.kind,
    name: hit.name,
    score: hit.score,
    url,
  };
  if (hit.kind === "language") out.design_md_url = `${url}/DESIGN.md`;
  if (detailed) {
    out.slug = hit.slug;
    out.tags = hit.tags;
    if (hit.medium) out.medium = hit.medium;
    if (hit.summary) out.summary = hit.summary;
  }
  return out;
}
