import { NextResponse } from "next/server";
import {
  buildEmbeddingDocument,
  embedDocument,
  TASTE_DOC_VERSION,
  TASTE_EMBEDDING_DIM,
  TASTE_EMBEDDING_MODEL,
} from "@/lib/embeddings";

export const dynamic = "force-dynamic";

function cleanEnv(value: string | undefined): string {
  return (value ?? "").replace(/\\n/g, "").trim();
}

/**
 * POST /api/taste/embed — embedding service for the curation pipeline.
 *
 * The finalizer (katagami-curation wasm) calls this after quality review
 * to compute a language's taste vector, then dispatches AttachTasteVector
 * on the entity. Auth: the same bearer the finalizer already holds for
 * the Temper API (TEMPER_API_KEY), so no new secret is introduced.
 *
 * Body: either { doc: string } (pre-built canonical document) or the raw
 * field inputs { name, tags, philosophy_summary, heading_font, body_font,
 * colors } from which the canonical document is built server-side.
 */
export async function POST(request: Request) {
  const expected = cleanEnv(process.env.TEMPER_API_KEY);
  if (expected) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const doc =
    typeof body.doc === "string" && body.doc.trim()
      ? body.doc.trim()
      : buildEmbeddingDocument({
          name: typeof body.name === "string" ? body.name : undefined,
          tags: Array.isArray(body.tags)
            ? body.tags.map((t) => String(t))
            : undefined,
          philosophySummary:
            typeof body.philosophy_summary === "string"
              ? body.philosophy_summary
              : undefined,
          headingFont:
            typeof body.heading_font === "string" ? body.heading_font : undefined,
          bodyFont:
            typeof body.body_font === "string" ? body.body_font : undefined,
          colors:
            body.colors && typeof body.colors === "object"
              ? (body.colors as Record<string, string>)
              : undefined,
        });

  if (!doc) {
    return NextResponse.json(
      { error: "nothing to embed — provide doc or fields" },
      { status: 400 },
    );
  }

  const vector = await embedDocument(doc);
  return NextResponse.json({
    model: TASTE_EMBEDDING_MODEL,
    dim: TASTE_EMBEDDING_DIM,
    doc_version: TASTE_DOC_VERSION,
    vector,
  });
}
