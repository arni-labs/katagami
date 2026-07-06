import { NextResponse } from "next/server";
import {
  buildArtStyleEmbeddingDocument,
  buildEmbeddingDocument,
  buildPaletteEmbeddingDocument,
  buildWritingStyleEmbeddingDocument,
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
 * Body: either { doc: string } (pre-built canonical document) or raw field
 * inputs plus an optional kind ("language" default | "palette" | "art-style" |
 * "writing-style") from which the matching canonical document is built
 * server-side:
 *   language:      { name, tags, philosophy_summary, heading_font, body_font, colors }
 *   palette:       { name, tags, signature, neutrals, semantic, mood }
 *   art-style:     { name, tags, medium, prompt_template }
 *   writing-style: { name, tags, persona, refusals, moves, register, vocabulary }
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

  const name = typeof body.name === "string" ? body.name : undefined;
  const tags = Array.isArray(body.tags)
    ? body.tags.map((t) => String(t))
    : undefined;
  const kind = typeof body.kind === "string" ? body.kind : "language";

  let doc: string;
  if (typeof body.doc === "string" && body.doc.trim()) {
    doc = body.doc.trim();
  } else if (kind === "palette") {
    doc = buildPaletteEmbeddingDocument({
      name,
      tags,
      signature: Array.isArray(body.signature)
        ? (body.signature as Array<{ hex?: string; name?: string } | string>)
        : undefined,
      neutrals:
        body.neutrals && typeof body.neutrals === "object"
          ? (body.neutrals as Record<string, string>)
          : undefined,
      semantic:
        body.semantic && typeof body.semantic === "object"
          ? (body.semantic as Record<string, string>)
          : undefined,
      mood:
        body.mood && typeof body.mood === "object"
          ? (body.mood as { temperature?: string; key_hue?: string; summary?: string })
          : undefined,
    });
  } else if (kind === "art-style") {
    doc = buildArtStyleEmbeddingDocument({
      name,
      tags,
      medium: typeof body.medium === "string" ? body.medium : undefined,
      promptTemplate:
        typeof body.prompt_template === "string"
          ? body.prompt_template
          : undefined,
    });
  } else if (kind === "writing-style") {
    doc = buildWritingStyleEmbeddingDocument({
      name,
      tags,
      persona: typeof body.persona === "string" ? body.persona : undefined,
      // The builder defensively filters non-strings, so raw arrays/objects are safe.
      refusals: Array.isArray(body.refusals) ? (body.refusals as string[]) : undefined,
      moves: Array.isArray(body.moves) ? (body.moves as string[]) : undefined,
      register:
        body.register && typeof body.register === "object"
          ? (body.register as Record<string, unknown>)
          : undefined,
      vocabulary:
        body.vocabulary && typeof body.vocabulary === "object"
          ? (body.vocabulary as { use?: string[]; ban?: string[] })
          : undefined,
    });
  } else {
    doc = buildEmbeddingDocument({
      name,
      tags,
      philosophySummary:
        typeof body.philosophy_summary === "string"
          ? body.philosophy_summary
          : undefined,
      headingFont:
        typeof body.heading_font === "string" ? body.heading_font : undefined,
      bodyFont: typeof body.body_font === "string" ? body.body_font : undefined,
      colors:
        body.colors && typeof body.colors === "object"
          ? (body.colors as Record<string, string>)
          : undefined,
    });
  }

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
