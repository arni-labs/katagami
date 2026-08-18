import {
  HIDDEN_ROUND_IDS,
  listBakeoffModels,
  listBakeoffRounds,
} from "@/lib/bakeoff";
import { BakeoffIndex } from "../lab/bakeoff-index";

// The published model bake-off — the rounds index. Unlisted on purpose;
// reachable at /model-bake-off. Each round is a Direction (a reimagine brief)
// with its submitted Katagami languages.

// ISR: serve the assembled rounds index from the edge cache, revalidating in the
// background. It was force-dynamic, re-scanning the catalog on every open (slow).
export const revalidate = 60;

export const metadata = {
  title: "Model Bake Off — Katagami",
  description:
    "Blind comparison: guess which model reimagined each Katagami design language.",
};

// Public ISR: live submissions (UnderReview + Published). Drafting rounds
// stripped. No cookie read, so the cache holds. View language is omitted
// for unpublished languages because this route cannot know the owner.
export default async function ModelBakeOffPage() {
  const [rounds, models] = await Promise.all([
    listBakeoffRounds(),
    listBakeoffModels(),
  ]);
  const visibleRounds = rounds.filter((r) => !HIDDEN_ROUND_IDS.has(r.id));
  const visibleModels = models
    .map((m) => ({
      ...m,
      submissions: m.submissions.filter(
        (s) => !HIDDEN_ROUND_IDS.has(s.roundId),
      ),
    }))
    .map((m) => ({ ...m, count: m.submissions.length }))
    .filter((m) => m.submissions.length > 0);
  return <BakeoffIndex rounds={visibleRounds} models={visibleModels} />;
}
