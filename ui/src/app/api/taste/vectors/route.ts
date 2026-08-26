import { NextResponse } from "next/server";
import {
  listArtStyles,
  listDesignLanguages,
  listPaletteSystems,
  paletteCore,
  parseJson,
  type LaneEntity,
} from "@/lib/odata";
import { specSummary } from "@/lib/spec-summary";
import {
  buildArtStyleEmbeddingDocument,
  buildEmbeddingDocument,
  buildPaletteEmbeddingDocument,
  embedDocument,
  parseStoredTasteVector,
  TASTE_EMBEDDING_DIM,
  TASTE_EMBEDDING_MODEL,
} from "@/lib/embeddings";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { featuredIds } from "@/lib/catalog";

export const dynamic = "force-dynamic";

interface TokensLite {
  colors?: Record<string, string | undefined>;
  typography?: { heading_font?: string; body_font?: string };
}

function storedVector(fields: {
  taste_vector?: string;
  taste_vector_model?: string;
}): number[] | null {
  return parseStoredTasteVector(fields);
}

/**
 * GET /api/taste/vectors — semantic vectors for the whole catalog across
 * all three lanes (design languages, palette systems, art styles), keyed
 * by entity id.
 *
 * Per entity: a stored `taste_vector` (written by the curation finalizer
 * or the backfill script) is used as-is when its model matches; otherwise
 * the vector is computed here from the same canonical document and cached
 * in-process. Either way the client receives one consistent space.
 */
export async function GET() {
  const vectors: Record<string, number[]> = {};
  const counts = { stored: 0, computed: 0 };

  // ARN-385: a signed-out visitor gets vectors only for the anonymous featured
  // portion — languages, art styles, AND palettes. Same featuredIds() primitive
  // as the gallery/MCP, so the set can never diverge.
  const full = await hasFullGalleryAccess();
  const [languageFeatured, paletteFeatured, artFeatured] = full
    ? [null, null, null]
    : await Promise.all([
        featuredIds("language"),
        featuredIds("palette"),
        featuredIds("art_style"),
      ]);

  const put = async (
    id: string,
    fields: { taste_vector?: string; taste_vector_model?: string },
    doc: string,
  ) => {
    const stored = storedVector(fields);
    if (stored) {
      vectors[id] = stored;
      counts.stored += 1;
      return;
    }
    if (!doc) return;
    vectors[id] = await embedDocument(doc);
    counts.computed += 1;
  };

  let anyLaneLoaded = false;

  try {
    // Full canonical read (no $select). The projected $select read omits some
    // published languages, which would drop them from the taste/embedding space.
    const languages = await listDesignLanguages("Status eq 'Published'");
    anyLaneLoaded = true;
    for (const lang of languages) {
      if (!lang.fields.name) continue;
      if (languageFeatured && !languageFeatured.has(lang.entity_id)) continue;
      const tokens = parseJson<TokensLite>(lang.fields.tokens);
      await put(
        lang.entity_id,
        lang.fields,
        buildEmbeddingDocument({
          name: lang.fields.name,
          slug: lang.fields.slug,
          tags: parseJson<string[]>(lang.fields.tags) ?? undefined,
          // The vector is what a language is RANKED by. Reading only
          // `philosophy.summary` left a prose philosophy out of the document
          // entirely, so such a language was embedded from name+tags+fonts
          // alone and could not be found by its own words — searching the
          // exact sentence it was written with would not surface it.
          philosophySummary: specSummary(lang.fields.philosophy) ?? undefined,
          headingFont: tokens?.typography?.heading_font,
          bodyFont: tokens?.typography?.body_font,
          colors: tokens?.colors,
        }),
      );
    }
  } catch (err) {
    // lane unavailable — the others may still load, but say so (a silent
    // catch here hid the onnxruntime load failure entirely)
    console.error("taste/vectors: design-language lane failed:", err);
  }

  try {
    const palettes: LaneEntity[] = await listPaletteSystems();
    anyLaneLoaded = true;
    for (const palette of palettes) {
      if (!palette.fields.name) continue;
      if (paletteFeatured && !paletteFeatured.has(palette.entity_id)) continue;
      const core = paletteCore(palette.fields);
      await put(
        palette.entity_id,
        palette.fields,
        buildPaletteEmbeddingDocument({
          name: palette.fields.name,
          tags: parseJson<string[]>(palette.fields.tags) ?? undefined,
          signature: core.signature,
          neutrals: core.neutrals,
          semantic: core.semantic,
          mood: core.mood,
        }),
      );
    }
  } catch (err) {
    console.error("taste/vectors: lane failed:", err);
  }

  try {
    const styles: LaneEntity[] = await listArtStyles();
    anyLaneLoaded = true;
    for (const style of styles) {
      if (!style.fields.name) continue;
      if (artFeatured && !artFeatured.has(style.entity_id)) continue;
      await put(
        style.entity_id,
        style.fields,
        buildArtStyleEmbeddingDocument({
          name: style.fields.name,
          tags: parseJson<string[]>(style.fields.tags) ?? undefined,
          medium: style.fields.medium,
          promptTemplate: style.fields.prompt_template,
        }),
      );
    }
  } catch (err) {
    console.error("taste/vectors: lane failed:", err);
  }

  if (!anyLaneLoaded) {
    return NextResponse.json({ error: "catalog unavailable" }, { status: 503 });
  }

  return NextResponse.json(
    {
      model: TASTE_EMBEDDING_MODEL,
      dim: TASTE_EMBEDDING_DIM,
      stored: counts.stored,
      computed: counts.computed,
      vectors,
    },
    {
      headers: {
        // vectors are stable per catalog state — let the browser hold them
        "Cache-Control": "private, max-age=300",
      },
    },
  );
}
