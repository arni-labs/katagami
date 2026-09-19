import type { JevQuestion } from "./jev.mjs";
export const PAGE_MAX_CHARS: number;
export type Verdict = "pass" | "unclear" | "fail";
export type JudgedCheck = { kind: "rule" | "do" | "dont"; name: string; text: string; expect: "follows" | "breaks" };
export function pageState(page: string): string;
export function judgedChecks(design: unknown): JudgedCheck[];
export function judgedQuestions(checks: JudgedCheck[]): Record<string, JevQuestion>;
export function verdictOf(noul: number, expect: "follows" | "breaks"): { follows: number; verdict: Verdict };
export function measuredChecks(design: unknown, page: string): { check: string; verdict: Verdict; detail: string }[];
