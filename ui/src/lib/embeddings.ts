/**
 * Taste embeddings — the shared semantic layer of the taste system.
 * Server-side only: imported from API routes and scripts, never client code.
 *
 * One model everywhere: all-MiniLM-L6-v2 (384 dims) running locally via
 * transformers.js. The curation finalizer, the backfill script, and the
 * taste API all embed the SAME canonical document format so vectors are
 * comparable regardless of where they were computed. The model id is
 * stored alongside every vector; vectors from other models are ignored
 * rather than mixed.
 */

export const TASTE_EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
export const TASTE_EMBEDDING_DIM = 384;
export const TASTE_DOC_VERSION = "taste-doc-v1";

export interface EmbeddingDocInput {
  name?: string;
  slug?: string;
  tags?: string[];
  philosophySummary?: string;
  headingFont?: string;
  bodyFont?: string;
  colors?: Record<string, string | undefined>;
}

/** Canonical text a language is embedded from. Deterministic and stable:
 *  changing this format invalidates stored vectors, so it is versioned. */
export function buildEmbeddingDocument(input: EmbeddingDocInput): string {
  const lines: string[] = [];
  if (input.name) lines.push(`design language: ${input.name}`);
  const tags = (input.tags ?? []).filter((t) => t !== "specimen");
  if (tags.length > 0) lines.push(`movements and qualities: ${tags.join(", ")}`);
  if (input.philosophySummary) lines.push(input.philosophySummary.trim());
  const type: string[] = [];
  if (input.headingFont) type.push(`headings in ${input.headingFont}`);
  if (input.bodyFont) type.push(`body in ${input.bodyFont}`);
  if (type.length > 0) lines.push(`typography: ${type.join(", ")}`);
  const c = input.colors ?? {};
  const palette = ["primary", "secondary", "accent", "background", "text"]
    .map((role) => (c[role] ? `${role} ${c[role]}` : null))
    .filter(Boolean)
    .join(", ");
  if (palette) lines.push(`palette: ${palette}`);
  return lines.join("\n");
}

type FeatureExtractor = (
  text: string,
  opts: { pooling: "mean"; normalize: boolean },
) => Promise<{ data: Float32Array }>;

let extractorPromise: Promise<FeatureExtractor> | null = null;

async function getExtractor(): Promise<FeatureExtractor> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import("@xenova/transformers");
      const extractor = await pipeline("feature-extraction", TASTE_EMBEDDING_MODEL, {
        quantized: true,
      });
      return extractor as unknown as FeatureExtractor;
    })();
  }
  return extractorPromise;
}

const vectorCache = new Map<string, number[]>();

/** Embed one document. Cached per process by document text. */
export async function embedDocument(doc: string): Promise<number[]> {
  const cached = vectorCache.get(doc);
  if (cached) return cached;
  const extractor = await getExtractor();
  const output = await extractor(doc, { pooling: "mean", normalize: true });
  const vector = Array.from(output.data).map((v) => Number(v.toFixed(6)));
  vectorCache.set(doc, vector);
  return vector;
}
