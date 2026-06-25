"use server";

import {
  pageArtStyles,
  pageDesignLanguages,
  pagePaletteSystems,
  type DesignLanguage,
  type PageResult,
} from "@/lib/odata";
import { toArtStyleItem, toPaletteItem } from "@/lib/lane-items";
import type { PaletteItem } from "@/components/palette-card";
import type { ArtStyleItem } from "@/components/art-style-card";

const LIMIT = 48;

// Each loads ONE bounded keyset page (cursor) with optional server-side search —
// called by the infinite-scroll galleries as the user scrolls or searches. None
// of them ever fetch or hold the whole catalog.

export async function loadLanguagePage(input: {
  cursor?: string | null;
  search?: string;
}): Promise<PageResult<DesignLanguage>> {
  return pageDesignLanguages({
    cursor: input.cursor ?? undefined,
    search: input.search,
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
