import "server-only";
import { askJev, JevUnavailableError } from "@/lib/jev.mjs";
import { composePlan, fallbackPlan, planQuestions, type ScreenPlan } from "./catalogue";

// One Jev call turns a brief into a plan from the catalogue. Jev never writes
// markup or text: it answers "does this screen need a table?" and the like,
// and composePlan turns those answers into a plan. When Jev cannot be asked
// the keyword fallback answers instead and the plan says so.

export const BRIEF_MAX = 300;

export type Planned = { brief: string; plan: ScreenPlan; model: string | null; timings_ms: { jev: number }; error?: string };

// A plan is a paid call: the same brief within ten minutes is answered from
// memory, per server instance.
const recent = new Map<string, { at: number; body: Planned }>();
const RECENT_MS = 10 * 60_000;
const norm = (b: string) => b.toLowerCase().replace(/\s+/g, " ").replace(/[\s.!?…]+$/u, "");

export async function planScreen(briefIn: string): Promise<Planned> {
  const brief = briefIn.trim().slice(0, BRIEF_MAX);
  const key = norm(brief);
  const hit = recent.get(key);
  if (hit && Date.now() - hit.at < RECENT_MS) return hit.body;
  const started = Date.now();
  let body: Planned;
  try {
    const res = await askJev(`Screen wanted: ${brief}`, planQuestions(), { timeoutMs: 6_000, retries: 1 });
    body = { brief, plan: composePlan(res.answers), model: res.model, timings_ms: { jev: Date.now() - started } };
  } catch (err) {
    // No crash and no blank: the keyword rule composes a plan and the answer
    // carries why. A fallback is not remembered, so the next ask tries Jev again.
    const reason = err instanceof JevUnavailableError ? err.message : String(err);
    return { brief, plan: fallbackPlan(brief), model: null, timings_ms: { jev: Date.now() - started }, error: reason };
  }
  if (recent.size >= 500) recent.delete(recent.keys().next().value as string);
  recent.set(key, { at: Date.now(), body });
  return body;
}
