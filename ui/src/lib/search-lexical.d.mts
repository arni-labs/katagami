export type LexicalLane = "language" | "palette" | "art-style";

export interface LexicalDoc {
  id: string;
  kind: LexicalLane;
  name: string;
  slug?: string;
  tags?: string[];
}

export interface LexicalHit {
  id: string;
  kind: LexicalLane;
  name: string;
  slug: string;
  score: number;
  tags: string[];
}

/** 0–1 name/slug/tag score. Exact name or slug is 1. */
export function lexicalScore(query: string, doc: LexicalDoc): number;

/** Rank docs by lexicalScore; drop non-matches; keep top `k`. */
export function lexicalHits(
  query: string,
  docs: LexicalDoc[],
  k: number,
): LexicalHit[];

/** Union lexical then semantic hits, de-duped by kind+id, clipped to `k`. */
export function mergeSearchHits<T extends { id?: string; kind?: string }>(
  lexical: T[],
  semantic: T[],
  k: number,
): T[];
