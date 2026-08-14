"use server";

import { createEntity, dispatchAction } from "@/lib/odata-mutations";
import { getUser } from "@/lib/user-auth";

// ARN-330: answers are stored as stable option KEYS (never display labels) so
// aggregates stay comparable as UI copy evolves. These sets are the single
// source of truth for valid keys — the server action whitelists against them,
// so a hand-crafted POST can't inject arbitrary strings into the dataset.
const PERSONA_KEYS = new Set([
  "developer_specs",
  "designer_research",
  "founder_looks",
  "curious",
]);
const USEFULNESS_KEYS = new Set([
  "more_variety",
  "more_export_formats",
  "better_search",
  "other",
]);
const FOUND_KEYS = new Set([
  "found_exact",
  "found_close",
  "none_fit_quality_good",
  "none_fit_quality_poor",
  "did_not_browse",
]);
const WANT_NEXT_KEYS = new Set(["writing_styles", "submit_own"]);
const RETURN_KEYS = new Set(["definitely", "probably", "maybe", "unlikely"]);
const SOURCE_KEYS = new Set(["footer", "launch-banner", "direct"]);

const USEFULNESS_MAX = 3;
const FREE_TEXT_MAX = 2000;

export interface FeedbackAnswers {
  persona?: string;
  usefulness?: string[];
  usefulnessOther?: string;
  foundLanguage?: string;
  wantNext?: string[];
  returnIntent?: string;
  comments?: string;
  source?: string;
}

const pickKey = (v: string | undefined, valid: Set<string>) =>
  v && valid.has(v) ? v : "";
const pickKeys = (v: string[] | undefined, valid: Set<string>, max: number) =>
  Array.from(new Set((v ?? []).filter((k) => valid.has(k)))).slice(0, max);
const pickText = (v: string | undefined) =>
  (v ?? "").trim().slice(0, FREE_TEXT_MAX);

export async function submitFeedback(
  answers: FeedbackAnswers,
): Promise<{ ok: boolean; error?: string }> {
  const persona = pickKey(answers.persona, PERSONA_KEYS);
  const usefulness = pickKeys(
    answers.usefulness,
    USEFULNESS_KEYS,
    USEFULNESS_MAX,
  );
  const usefulnessOther = usefulness.includes("other")
    ? pickText(answers.usefulnessOther)
    : "";
  const foundLanguage = pickKey(answers.foundLanguage, FOUND_KEYS);
  const wantNext = pickKeys(answers.wantNext, WANT_NEXT_KEYS, WANT_NEXT_KEYS.size);
  const returnIntent = pickKey(answers.returnIntent, RETURN_KEYS);
  const comments = pickText(answers.comments);
  const source = pickKey(answers.source, SOURCE_KEYS) || "direct";

  // Q1–Q5 are required; only the free-form comment is optional. Enforced here
  // as well as in the stepper UI, since a server action is a public endpoint.
  const missingRequired =
    !persona ||
    usefulness.length === 0 ||
    !foundLanguage ||
    wantNext.length === 0 ||
    !returnIntent;
  if (missingRequired) {
    return {
      ok: false,
      error: "All questions except the last one need an answer.",
    };
  }

  // Viewer context is derived server-side from the session cookie — a client
  // cannot claim someone else's identity by editing the payload.
  const user = await getUser();

  try {
    const created = await createEntity("FeedbackResponses", {});
    await dispatchAction("FeedbackResponses", created.entity_id, "SetAnswers", {
      persona,
      usefulness: JSON.stringify(usefulness),
      usefulness_other: usefulnessOther,
      found_language: foundLanguage,
      want_next: JSON.stringify(wantNext),
      return_intent: returnIntent,
      comments,
      signed_in: user ? "true" : "false",
      respondent_sub: user?.sub ?? "",
      source,
    });
    await dispatchAction("FeedbackResponses", created.entity_id, "Submit", {});
    return { ok: true };
  } catch (err) {
    console.error("submitFeedback failed:", err);
    return { ok: false, error: "Could not save your feedback — try again." };
  }
}
