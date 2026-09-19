export const JEV_MODEL: string;
export class JevUnavailableError extends Error {}
export type JevQuestion =
  | { type: "noul"; instructions: string }
  | { type: "score"; instructions: string; criteria: string[] };
export type JevAnswer = { type: string; noul?: number; score?: number; confidence?: number };
export function noul(instructions: string): JevQuestion;
export function score(instructions: string, criteria: string[]): JevQuestion;
export function askJev(
  state: string,
  questions: Record<string, JevQuestion>,
  opts?: { timeoutMs?: number; retries?: number },
): Promise<{ answers: Record<string, JevAnswer>; model: string; inputTokens: number }>;
