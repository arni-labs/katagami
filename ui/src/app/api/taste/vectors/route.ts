import { NextResponse } from "next/server";
import {
  listArtStyles,
  listDesignLanguages,
  listPaletteSystems,
  paletteCore,
  parseJson,
  type LaneEntity,
} from "@/lib/odata";
import {
  buildArtStyleEmbeddingDocument,
  buildEmbeddingDocument,
  buildPaletteEmbeddingDocument,
  embedDocument,
  TASTE_EMBEDDING_DIM,
  TASTE_EMBEDDING_MODEL,
} from "@/lib/embeddings";

export const dynamic = "force-dynamic";

interface TokensLite {
  colors?: Record<string, string | undefined>;
  typography?: { heading_font?: string; body_font?: string };
}

function storedVector(fields: {
  taste_vector?: string;
  taste_vector_model?: string;
}): number[] | null {
  if (fields.taste_vector_model !== TASTE_EMBEDDING_MODEL) return null;
  const vector = parseJson<number[]>(fields.taste_vector);
  if (
    Array.isArray(vector) &&
    vector.length === TASTE_EMBEDDING_DIM &&
    vector.every((v) => typeof v === "number")
  ) {
    return vector;
  }
  return null;
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
      const tokens = parseJson<TokensLite>(lang.fields.tokens);
      await put(
        lang.entity_id,
        lang.fields,
        buildEmbeddingDocument({
          name: lang.fields.name,
          slug: lang.fields.slug,
          tags: parseJson<string[]>(lang.fields.tags) ?? undefined,
          philosophySummary: parseJson<{ summary?: string }>(
            lang.fields.philosophy,
          )?.summary,
          headingFont: tokens?.typography?.heading_font,
          bodyFont: tokens?.typography?.body_font,
          colors: tokens?.colors,
        }),
      );
    }
  } catch {
    // lane unavailable — the others may still load
  }

  try {
    const palettes: LaneEntity[] = await listPaletteSystems();
    anyLaneLoaded = true;
    for (const palette of palettes) {
      if (!palette.fields.name) continue;
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
  } catch {
    // ignore
  }

  try {
    const styles: LaneEntity[] = await listArtStyles();
    anyLaneLoaded = true;
    for (const style of styles) {
      if (!style.fields.name) continue;
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
  } catch {
    // ignore
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
