// Typesafe Jev (System One) client — one bounded call: a textual state plus a
// fan-out of typed questions, answered together. Plain .mjs so the backfill
// scripts and the Next server share it. Server-side only: it reads
// TYPESAFE_API_KEY, which must never reach the browser.
//
// Jev answers; it does not generate or explain. A noul is "how true is this
// statement of the state" in 0..1; a score is an ordinal position in 0..1 with
// the distribution beside it. Neither is a probability that the answer is
// right — callers compare answers to each other, they do not threshold on them
// as truth.

const URL = "https://api.typesafe.ai/v1/systemone";
export const JEV_MODEL = process.env.JEV_MODEL || "jev-1.13.0";

export class JevUnavailableError extends Error {}

export const noul = (instructions) => ({ type: "noul", instructions });
export const score = (instructions, criteria) => ({ type: "score", instructions, criteria });

/**
 * Ask every question about one state. Returns { answers, model, inputTokens }.
 * Retries 429/5xx and network faults with backoff; anything else throws.
 */
export async function askJev(state, questions, { timeoutMs = 20_000, retries = 3 } = {}) {
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) throw new JevUnavailableError("TYPESAFE_API_KEY is not set");
  const body = JSON.stringify({ state, model: JEV_MODEL, questions });
  let last = "";
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * 2 ** (attempt - 1)));
    let res;
    try {
      res = await fetch(URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      last = String(err);
      continue;
    }
    if (res.ok) {
      const json = await res.json().catch(() => null);
      if (!json || typeof json.answers !== "object" || json.answers === null) {
        throw new JevUnavailableError("Jev returned no answers");
      }
      return {
        answers: json.answers,
        model: json.model ?? JEV_MODEL,
        inputTokens: json.usage?.input_tokens ?? 0,
      };
    }
    last = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
    if (![429, 500, 502, 503, 504].includes(res.status)) break;
  }
  throw new JevUnavailableError(last);
}
