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

/** A stored taste_vector is usable only when its model matches the current
 *  space — vectors from different models are not comparable. Used by the taste
 *  API (/api/taste/vectors) to serve pipeline vectors to the taste-deck. Ranking
 *  by similarity now lives in the kernel (Temper.Nearest), so there is no longer
 *  an app-side cosineSimilarity here. */
export function parseStoredTasteVector(fields: {
  taste_vector?: string;
  taste_vector_model?: string;
}): number[] | null {
  if (fields.taste_vector_model !== TASTE_EMBEDDING_MODEL) return null;
  if (!fields.taste_vector) return null;
  try {
    const vector = JSON.parse(fields.taste_vector) as unknown;
    if (
      Array.isArray(vector) &&
      vector.length === TASTE_EMBEDDING_DIM &&
      vector.every((v) => typeof v === "number")
    ) {
      return vector;
    }
  } catch {
    // malformed stored vector — treat as absent
  }
  return null;
}

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
    .map((role) =>
      typeof c[role] === "string" && c[role] ? `${role} ${c[role]}` : null,
    )
    .filter(Boolean)
    .join(", ");
  if (palette) lines.push(`palette: ${palette}`);
  return lines.join("\n");
}

/** Canonical text a palette system is embedded from (taste-doc-v1). */
export function buildPaletteEmbeddingDocument(fields: {
  name?: string;
  tags?: string[];
  signature?: Array<{ hex?: string; name?: string } | string>;
  neutrals?: Record<string, string>;
  semantic?: Record<string, string>;
  mood?: { temperature?: string; key_hue?: string; summary?: string };
}): string {
  const lines: string[] = [];
  if (fields.name) lines.push(`palette system: ${fields.name}`);
  const tags = (fields.tags ?? []).filter((t) => t !== "specimen");
  if (tags.length > 0) lines.push(`qualities: ${tags.join(", ")}`);
  if (fields.mood?.summary) lines.push(fields.mood.summary.trim());
  const moodBits = [fields.mood?.temperature, fields.mood?.key_hue]
    .filter(Boolean)
    .join(", ");
  if (moodBits) lines.push(`mood: ${moodBits}`);
  const signature = (fields.signature ?? [])
    .map((s) => (typeof s === "string" ? s : [s.name, s.hex].filter(Boolean).join(" ")))
    .filter(Boolean)
    .join(", ");
  if (signature) lines.push(`signature colors: ${signature}`);
  const neutrals = Object.entries(fields.neutrals ?? {})
    .filter(([, hex]) => typeof hex === "string" && hex)
    .map(([role, hex]) => `${role} ${hex}`)
    .join(", ");
  if (neutrals) lines.push(`neutrals: ${neutrals}`);
  return lines.join("\n");
}

/** Canonical text an art style is embedded from (taste-doc-v1). */
export function buildArtStyleEmbeddingDocument(fields: {
  name?: string;
  tags?: string[];
  medium?: string;
  promptTemplate?: string;
}): string {
  const lines: string[] = [];
  if (fields.name) lines.push(`art style: ${fields.name}`);
  const tags = (fields.tags ?? []).filter((t) => t !== "specimen");
  if (tags.length > 0) lines.push(`qualities: ${tags.join(", ")}`);
  if (fields.medium) lines.push(`medium: ${fields.medium}`);
  if (fields.promptTemplate) lines.push(`recipe: ${fields.promptTemplate.trim()}`);
  return lines.join("\n");
}

/** Canonical text a writing style is embedded from (taste-doc-v1).
 *
 *  A WritingStyle's identity lives in its human-legible voice layer, so the
 *  document is built from the text-bearing fields: persona, refusals (taste is
 *  what a voice rejects), rhetorical moves, per-channel register, and the
 *  use/ban vocabulary. tone_scales is deliberately excluded — it is numeric and
 *  carries little embedding signal, and raw numbers invite JS/Rust formatting
 *  drift. register iterates in object insertion order (matched on the Rust side
 *  by serde_json's preserve_order). */
export function buildWritingStyleEmbeddingDocument(fields: {
  name?: string;
  tags?: string[];
  persona?: string;
  refusals?: string[];
  moves?: string[];
  register?: Record<string, unknown>;
  vocabulary?: { use?: string[]; ban?: string[] };
}): string {
  const lines: string[] = [];
  if (fields.name) lines.push(`writing style: ${fields.name}`);
  const tags = (fields.tags ?? []).filter((t) => t !== "specimen");
  if (tags.length > 0) lines.push(`qualities: ${tags.join(", ")}`);
  if (fields.persona) lines.push(`persona: ${fields.persona.trim()}`);
  const clean = (arr: unknown): string[] =>
    (Array.isArray(arr) ? arr : [])
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim());
  const refusals = clean(fields.refusals);
  if (refusals.length > 0) lines.push(`refusals: ${refusals.join("; ")}`);
  const moves = clean(fields.moves);
  if (moves.length > 0) lines.push(`moves: ${moves.join("; ")}`);
  const register = Object.entries(fields.register ?? {})
    .filter(([, v]) => typeof v === "string" && v.trim().length > 0)
    .map(([k, v]) => `${k}: ${(v as string).trim()}`)
    .join("; ");
  if (register) lines.push(`register: ${register}`);
  const use = clean(fields.vocabulary?.use);
  if (use.length > 0) lines.push(`prefers: ${use.join(", ")}`);
  const ban = clean(fields.vocabulary?.ban);
  if (ban.length > 0) lines.push(`avoids: ${ban.join(", ")}`);
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
      const { pipeline, env } = await import("@xenova/transformers");
      // Serverless functions have a read-only filesystem except /tmp; the
      // default cache dir (inside node_modules) is not writable there, so the
      // model download would fail after loading the runtime.
      if (process.env.VERCEL) {
        env.cacheDir = "/tmp/xenova-transformers-cache";
      }
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
