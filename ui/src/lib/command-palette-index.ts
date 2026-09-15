import "server-only";
import { unstable_cache } from "next/cache";
import type { PaletteIndexItem } from "@/components/command-palette";
import { listArtStyles, listDesignLanguages, listPaletteSystems, paletteCore, parseJson } from "@/lib/odata";
import { featuredIds } from "@/lib/catalog";
import { isShownToVisitorsRecord } from "@/lib/featured.mjs";

interface TokensLite {
  colors?: Record<string, string | undefined>;
}

// Built only when the visitor opens search. Cache the compact derived index,
// not the unbounded catalog rows, separately for each visibility tier.
// Anonymous visitors get a GATED index: languages, art styles, AND palettes are
// limited to the visitor shelf (shown_to_visitors — identical to the
// /art-styles + /palettes + /language teasers and the read MCP), so ⌘K can't
// enumerate the full catalog from page source. Signed-in visitors get
// everything. Cached per tier.
export const buildSearchIndex = unstable_cache(
  async (tier: "sample" | "full"): Promise<PaletteIndexItem[]> => {
    const items: PaletteIndexItem[] = [];
    const featuredOnly = tier === "sample";
    const palFeatured = featuredOnly ? await featuredIds("palette") : null;

  try {
    // Search surfaces the public catalog (Published only). For anonymous
    // visitors, languages and art styles are further limited to the visitor
    // shelf (shown_to_visitors) so the palette matches the teaser + MCP sample.
    const languages = await listDesignLanguages("Status eq 'Published'");
    for (const lang of languages) {
      if (!lang.fields.name) continue;
      if (featuredOnly && !isShownToVisitorsRecord(lang)) continue;
      const colors = parseJson<TokensLite>(lang.fields.tokens)?.colors ?? {};
      const swatch = [colors.primary, colors.secondary, colors.accent].filter(
        (c): c is string => Boolean(c),
      );
      items.push({
        id: lang.entity_id,
        kind: "language",
        name: lang.fields.name,
        href: `/language/${lang.entity_id}`,
        tags: parseJson<string[]>(lang.fields.tags) ?? undefined,
        swatch,
      });
    }
  } catch {
    // search degrades to whatever lanes loaded
  }

  try {
    for (const palette of await listPaletteSystems()) {
      if (!palette.fields.name) continue;
      if (palFeatured && !palFeatured.has(palette.entity_id)) continue;
      const core = paletteCore(palette.fields);
      items.push({
        id: palette.entity_id,
        kind: "palette",
        name: palette.fields.name,
        href: `/palettes/${palette.entity_id}`,
        tags: parseJson<string[]>(palette.fields.tags) ?? undefined,
        swatch: core.signature.slice(0, 4).map((s) => s.hex),
      });
    }
  } catch {
    // ignore
  }

  try {
    for (const style of await listArtStyles()) {
      if (!style.fields.name) continue;
      if (featuredOnly && !isShownToVisitorsRecord(style)) continue;
      items.push({
        id: style.entity_id,
        kind: "art-style",
        name: style.fields.name,
        href: `/art-styles/${style.entity_id}`,
        tags: parseJson<string[]>(style.fields.tags) ?? undefined,
      });
    }
  } catch {
    // ignore
  }

  for (const page of [
    { name: "Gallery", href: "/" },
    { name: "Palettes", href: "/palettes" },
    { name: "Art Styles", href: "/art-styles" },
    { name: "Studio", href: "/studio" },
    { name: "Taxonomy", href: "/taxonomy" },
    { name: "Model bake-off", href: "/model-bake-off" },
    // Under Review is the owner's desk — not in the public search index
    // (owner-gated page + OWNER_NAV_LINKS entry).
    // Lineage + Compare hidden for now (see lib/nav.ts).
  ]) {
    items.push({
      id: page.href,
      kind: "page",
      name: page.name,
      href: page.href,
    });
  }

    return items;
  },
  ["site-search-index-v3"],
  { revalidate: 60 },
);

