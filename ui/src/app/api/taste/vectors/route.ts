import { NextResponse } from "next/server";
import { listDesignLanguages, parseJson } from "@/lib/odata";
import {
  buildEmbeddingDocument,
  embedDocument,
  TASTE_EMBEDDING_DIM,
  TASTE_EMBEDDING_MODEL,
} from "@/lib/embeddings";

export const dynamic = "force-dynamic";

interface TokensLite {
  colors?: Record<string, string | undefined>;
  typography?: { heading_font?: string; body_font?: string };
}

/**
 * GET /api/taste/vectors — semantic vectors for the whole catalog,
 * keyed by entity id, for the taste deck.
 *
 * Per language: a stored `taste_vector` (written by the curation
 * finalizer or the backfill script) is used as-is when its model matches;
 * otherwise the vector is computed here from the same canonical document
 * and cached in-process. Either way the client receives one consistent
 * embedding space.
 */
export async function GET() {
  let languages: Awaited<ReturnType<typeof listDesignLanguages>>;
  try {
    languages = await listDesignLanguages("Status eq 'Published'", undefined, [
      "Id",
      "Status",
      "name",
      "slug",
      "tags",
      "tokens",
      "philosophy",
      "taste_vector",
      "taste_vector_model",
    ]);
  } catch {
    return NextResponse.json(
      { error: "catalog unavailable" },
      { status: 503 },
    );
  }

  const vectors: Record<string, number[]> = {};
  let stored = 0;
  let computed = 0;

  for (const lang of languages) {
    if (!lang.fields.name) continue;
    const storedVector =
      lang.fields.taste_vector_model === TASTE_EMBEDDING_MODEL
        ? parseJson<number[]>(lang.fields.taste_vector)
        : null;
    if (
      Array.isArray(storedVector) &&
      storedVector.length === TASTE_EMBEDDING_DIM &&
      storedVector.every((v) => typeof v === "number")
    ) {
      vectors[lang.entity_id] = storedVector;
      stored += 1;
      continue;
    }

    const tokens = parseJson<TokensLite>(lang.fields.tokens);
    const doc = buildEmbeddingDocument({
      name: lang.fields.name,
      slug: lang.fields.slug,
      tags: parseJson<string[]>(lang.fields.tags) ?? undefined,
      philosophySummary: parseJson<{ summary?: string }>(lang.fields.philosophy)
        ?.summary,
      headingFont: tokens?.typography?.heading_font,
      bodyFont: tokens?.typography?.body_font,
      colors: tokens?.colors,
    });
    if (!doc) continue;
    vectors[lang.entity_id] = await embedDocument(doc);
    computed += 1;
  }

  return NextResponse.json(
    {
      model: TASTE_EMBEDDING_MODEL,
      dim: TASTE_EMBEDDING_DIM,
      stored,
      computed,
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
