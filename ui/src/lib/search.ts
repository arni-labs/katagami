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

/** Embed a raw query into the taste space. Returns null for an empty query or
 *  when the local model fails to load — callers treat null as "no semantic
 *  answer" and fall back rather than erroring the surface. */
async function embedQuery(query: string): Promise<number[] | null> {
  const text = query.trim().slice(0, MAX_QUERY_CHARS);
  if (!text) return null;
  try {
    return await embedDocument(text);
  } catch (err) {
    console.error("search: query embed failed:", err);
    return null;
  }
}

/** Rank one lane by meaning, returning the raw ranked rows + scores (the shape
 *  the UI card mappers want). `[]` on any soft failure (empty query, embed down,
 *  vector path unavailable) so both surfaces degrade cleanly. */
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
  return hits ?? [];
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

/** A short, human-legible line per kind, drawn from public fields. */
function summarize(lane: SearchLane, fields: Record<string, unknown>): string {
  if (lane === "language") {
    const phil = parseJson<{ summary?: string }>(fields.philosophy as string);
    if (phil?.summary) return phil.summary.trim();
  }
  if (lane === "art-style") {
    const medium = typeof fields.medium === "string" ? fields.medium : "";
    return medium ? `${medium} art style` : "";
  }
  if (lane === "palette") {
    const mood = parseJson<{ summary?: string }>(fields.mood as string);
    if (mood?.summary) return mood.summary.trim();
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
