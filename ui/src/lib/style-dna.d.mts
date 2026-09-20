import type { JevAnswer, JevQuestion } from "./jev.mjs";
export type StyleDna = Record<string, number>;
export const STYLE_DNA_SET: string;
export const STYLE_DNA_QUESTIONS: { id: string; label: string; style: string; want: string }[];
export function buildStyleDoc(kind: "language" | "art_style", fields: Record<string, unknown> | undefined): string;
export function styleQuestions(): Record<string, JevQuestion>;
export function wantQuestions(): Record<string, JevQuestion>;
export function dnaFromAnswers(answers: Record<string, JevAnswer>): StyleDna | null;
export const REFINE_MOVES_AT: number;
export function refineQuestions(): Record<string, JevQuestion>;
export function applyRefinement(
  reading: StyleDna,
  answers: Record<string, JevAnswer>,
): { reading: StyleDna; moved: { id: string; label: string; from: number; to: number }[] } | null;
export function dnaVersion(model: string): string;
export function storedDna(fields: Record<string, unknown> | undefined, model: string): StyleDna | null;
export function matchScore(want: StyleDna, dna: StyleDna): number;
export function centroid(dnas: StyleDna[]): StyleDna;
export function oddness(dna: StyleDna, crowd: StyleDna): number;
export function topTraits(dna: StyleDna, n?: number): { id: string; label: string; value: number }[];
export const TRAIT_AT: number;
export function traitsField(dna: StyleDna): string;
export function cardTraits(fields: Record<string, unknown> | undefined, n?: number): string[];
