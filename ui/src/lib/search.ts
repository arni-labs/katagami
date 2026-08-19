import "server-only";

import { embedDocument, TASTE_EMBEDDING_MODEL } from "@/lib/embeddings";
import {
  nearestByVector,
  normalizeDesignLanguageRow,
  normalizeLaneRow,
  parseJson,
  type DesignLanguage,
  type VectorHit,
} from "@/lib/odata";
import { specSummary } from "@/lib/spec-summary";
import { toArtStyleItem, toPaletteItem } from "@/lib/lane-items";
import type { PaletteItem } from "@/components/palette-card";
import type { ArtStyleItem } from "@/components/art-style-card";

/**
 * Free-text semantic search (ARN-244) — the ONE place a text query becomes a
 * ranking. A query is embedded in-process with the same MiniLM model the whole
 * taste system uses, then the kernel ranks a lane's stored taste vectors against
 * it via `Temper.Nearest(vector=…)`. Both surfaces build on this: the human
 * "search by meaning" box (server actions → card items) and the agent surface
 * (`/api/search` + the `katagami_search` MCP tool → dense results).
 *
 * Ranking lives in the kernel, embedding lives here; there is no app-side cosine.
 */

export type SearchLane = "language" | "palette" | "art-style";

export const SEARCH_LANES: readonly SearchLane[] = [
  "language",
  "palette",
  "art-style",
] as const;

/** Lane → { OData set, gallery path segment } — the only lane lookup table. */
const LANE: Record<SearchLane, { set: string; path: string }> = {
  language: { set: "DesignLanguages", path: "language" },
  palette: { set: "PaletteSystems", path: "palettes" },
  "art-style": { set: "ArtStyles", path: "art-styles" },
};

export function isSearchLane(value: unknown): value is SearchLane {
  return typeof value === "string" && value in LANE;
}

/** A dense, url-less search hit — the shape agents rank on. The API route adds
 *  absolute URLs (it alone knows the request origin); the lib stays origin-free. */
export interface SearchHit {
  id: string;
  kind: SearchLane;
  name: string;
  slug: string;
  /** Kernel similarity in [0,1]-ish (cosine), rounded for transport. */
  score: number;
  tags: string[];
  /** Art styles only — the short medium noun. */
  medium?: string;
  /** A one-line human summary, present in the detailed projection. */
  summary?: string;
}

const MAX_QUERY_CHARS = 400;

/** Infrastructure failure (embed model or vector query down) — deliberately
 *  distinct from a genuine zero-hit result. Surfaces catch this to show
 *  "search unavailable" instead of the misleading "Nothing found" that hid
 *  the launch-week outage. */
export class SearchUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchUnavailableError";
  }
}

/** Fallback embedder: POST the query to /api/taste/embed — the one function
 *  whose onnxruntime binding has been production-proven since the taste
 *  pipeline shipped. Used when the in-process model fails (e.g. a function
 *  bundle missing the native binding), so meaning search degrades to one
 *  extra same-region hop instead of dying. */
async function embedViaService(text: string): Promise<number[] | null> {
  const base =
    process.env.KATAGAMI_EMBED_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (!base) return null;
  const key = (process.env.TEMPER_API_KEY ?? "").trim();
  const res = await fetch(`${base.replace(/\/$/, "")}/api/taste/embed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({ doc: text }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`embed service responded ${res.status}`);
  const j = (await res.json()) as { vector?: number[] };
  return Array.isArray(j.vector) ? j.vector : null;
}

/** Embed a raw query into the taste space. Returns null only for an empty
 *  query; an embedding-infrastructure failure throws SearchUnavailableError
 *  (after trying the service fallback) so it can never masquerade as
 *  "no results". */
async function embedQuery(query: string): Promise<number[] | null> {
  const text = query.trim().slice(0, MAX_QUERY_CHARS);
  if (!text) return null;
  try {
    return await embedDocument(text);
  } catch (localErr) {
    console.error("search: in-process embed failed, trying service:", localErr);
    try {
      const vector = await embedViaService(text);
      if (vector) return vector;
    } catch (serviceErr) {
      console.error("search: embed service fallback failed:", serviceErr);
    }
    throw new SearchUnavailableError("query embedding unavailable");
  }
}

/** Rank one lane by meaning, returning the raw ranked rows + scores (the shape
 *  the UI card mappers want). `[]` means a genuine zero-hit answer (or empty
 *  query); infrastructure failure throws SearchUnavailableError. */
export async function searchLaneRaw(
  lane: SearchLane,
  query: string,
  k: number,
): Promise<VectorHit[]> {
  const vector = await embedQuery(query);
  if (!vector) return [];
  const hits = await nearestByVector({
    set: LANE[lane].set,
    vector,
    model: TASTE_EMBEDDING_MODEL,
    k,
    filter: "Status eq 'Published'",
  });
  if (hits === null) {
    throw new SearchUnavailableError("vector ranking unavailable");
  }
  return hits;
}

function round(score: number): number {
  return Math.round(score * 1e4) / 1e4;
}

/** Project a ranked row to a dense hit. `detailed` adds a one-line summary. */
function toHit(lane: SearchLane, hit: VectorHit, detailed: boolean): SearchHit {
  const fields = (hit.raw.fields ?? hit.raw) as Record<string, unknown>;
  const id =
    (typeof hit.raw.entity_id === "string" && hit.raw.entity_id) ||
    (typeof fields.Id === "string" && fields.Id) ||
    "";
  const name =
    (typeof fields.name === "string" && fields.name) ||
    (typeof fields.Name === "string" && fields.Name) ||
    (typeof fields.slug === "string" && fields.slug) ||
    id;
  const base: SearchHit = {
    id,
    kind: lane,
    name,
    slug: (typeof fields.slug === "string" && fields.slug) || "",
    score: round(hit.score),
    tags: (parseJson<string[]>(fields.tags as string) ?? []).filter(
      (t) => typeof t === "string",
    ),
  };
  if (lane === "art-style" && typeof fields.medium === "string") {
    base.medium = fields.medium;
  }
  if (detailed) base.summary = summarize(lane, fields);
  return base;
}

/** A short, human-legible line per kind, drawn from public fields.
 *  Exported for the contract test — this is the integration the fix touches. */
export function summarize(lane: SearchLane, fields: Record<string, unknown>): string {
  // philosophy/mood may hold prose instead of JSON. Fall back to it so those
  // entries carry a summary line rather than dropping to the tag join.
  if (lane === "language") {
    const summary = specSummary(fields.philosophy);
    if (summary) return summary;
  }
  if (lane === "art-style") {
    const medium = typeof fields.medium === "string" ? fields.medium : "";
    return medium ? `${medium} art style` : "";
  }
  if (lane === "palette") {
    const summary = specSummary(fields.mood);
    if (summary) return summary;
  }
  const tags = parseJson<string[]>(fields.tags as string) ?? [];
  return tags.slice(0, 4).join(", ");
}

/** Dense hits for one lane (agent projection). */
export async function searchLane(
  lane: SearchLane,
  query: string,
  k: number,
  detailed = false,
): Promise<SearchHit[]> {
  const hits = await searchLaneRaw(lane, query, k);
  return hits.map((h) => toHit(lane, h, detailed));
}

/** Dense hits across ALL lanes, merged and re-ranked by score. Since every lane
 *  shares the one MiniLM space, a single query vector ranks each set and the
 *  scores are directly comparable. Over-fetches per lane, then keeps the top `k`.
 */
export async function searchAllLanes(
  query: string,
  k: number,
  detailed = false,
): Promise<SearchHit[]> {
  const perLane = Math.min(Math.max(k, 4), 25);
  const lanes = await Promise.all(
    SEARCH_LANES.map((lane) => searchLane(lane, query, perLane, detailed)),
  );
  return lanes
    .flat()
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

// ── UI card projections (human "search by meaning") ──────────────────────────
// The lane galleries render the same card items as keyword browse, so semantic
// results reuse the exact card mappers — the two paths never drift.

export async function searchLanguageCards(
  query: string,
  k: number,
): Promise<DesignLanguage[]> {
  const hits = await searchLaneRaw("language", query, k);
  return hits
    .map((h) => normalizeDesignLanguageRow(h.raw))
    .filter((l) => l.fields.name);
}

export async function searchPaletteCards(
  query: string,
  k: number,
): Promise<PaletteItem[]> {
  const hits = await searchLaneRaw("palette", query, k);
  return hits.map((h) => toPaletteItem(normalizeLaneRow(h.raw, "PaletteSystems")));
}

export async function searchArtStyleCards(
  query: string,
  k: number,
): Promise<ArtStyleItem[]> {
  const hits = await searchLaneRaw("art-style", query, k);
  return hits.map((h) => toArtStyleItem(normalizeLaneRow(h.raw, "ArtStyles")));
}

/** The gallery path segment for a lane — used by surfaces that build links. */
export function lanePath(lane: SearchLane): string {
  return LANE[lane].path;
}
