"use server";

import {
  pageArtStyles,
  pageDesignLanguages,
  pagePaletteSystems,
  type DesignLanguage,
  type PageResult,
} from "@/lib/odata";
import {
  searchArtStyleCards,
  searchLanguageCards,
  searchPaletteCards,
} from "@/lib/search";
import { toArtStyleItem, toPaletteItem } from "@/lib/lane-items";
import type { PaletteItem } from "@/components/palette-card";
import type { ArtStyleItem } from "@/components/art-style-card";

const LIMIT = 48;
// Semantic search returns one ranked, un-paginated set — a generous first-page
// worth of the most relevant matches (the kernel clamps to its own budget).
const MEANING_LIMIT = 48;

// Each loads ONE bounded keyset page (cursor) with optional server-side search —
// called by the infinite-scroll galleries as the user scrolls or searches. None
// of them ever fetch or hold the whole catalog.

export async function loadLanguagePage(input: {
  cursor?: string | null;
  search?: string;
  hue?: string;
  family?: string;
}): Promise<PageResult<DesignLanguage>> {
  return pageDesignLanguages({
    cursor: input.cursor ?? undefined,
    search: input.search,
    hue: input.hue,
    family: input.family,
    limit: LIMIT,
  });
}

export async function loadPalettePage(input: {
  cursor?: string | null;
  search?: string;
}): Promise<PageResult<PaletteItem>> {
  const page = await pagePaletteSystems({
    cursor: input.cursor ?? undefined,
    search: input.search,
    limit: LIMIT,
  });
  return { items: page.items.map(toPaletteItem), nextCursor: page.nextCursor };
}

export async function loadArtStylePage(input: {
  cursor?: string | null;
  search?: string;
}): Promise<PageResult<ArtStyleItem>> {
  const page = await pageArtStyles({
    cursor: input.cursor ?? undefined,
    search: input.search,
    limit: LIMIT,
  });
  return { items: page.items.map(toArtStyleItem), nextCursor: page.nextCursor };
}

// ── Search by meaning (ARN-244) ──────────────────────────────────────────────
// The "meaning" mode of the gallery search box: the typed phrase is embedded and
// the lane's stored taste vectors are ranked against it in the kernel. Same card
// items as keyword browse, so the two modes render identically — only the order
// (and what counts as a match) differs.

export async function searchLanguagesByMeaning(input: {
  query: string;
  k?: number;
}): Promise<DesignLanguage[]> {
  return searchLanguageCards(input.query, input.k ?? MEANING_LIMIT);
}

export async function searchPalettesByMeaning(input: {
  query: string;
  k?: number;
}): Promise<PaletteItem[]> {
  return searchPaletteCards(input.query, input.k ?? MEANING_LIMIT);
}

export async function searchArtStylesByMeaning(input: {
  query: string;
  k?: number;
}): Promise<ArtStyleItem[]> {
  return searchArtStyleCards(input.query, input.k ?? MEANING_LIMIT);
}
