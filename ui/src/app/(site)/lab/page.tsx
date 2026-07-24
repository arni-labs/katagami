import {
  HIDDEN_ROUND_IDS,
  listBakeoffModels,
  listBakeoffRounds,
} from "@/lib/bakeoff";
import { isOwner } from "@/lib/owner";
import { BakeoffIndex } from "./bakeoff-index";

// Unlisted on purpose — not added to header-nav, mobile-nav, or the search
// index. Reachable only by URL. Mirrors /model-bake-off.
// Rounds in HIDDEN_ROUND_IDS (active drafting) are stripped for non-owners.

export const dynamic = "force-dynamic";

export default async function LabIndex() {
  const [rounds, models, owner] = await Promise.all([
    listBakeoffRounds(),
    listBakeoffModels(),
    isOwner(),
  ]);
  const visibleRounds = owner
    ? rounds
    : rounds.filter((r) => !HIDDEN_ROUND_IDS.has(r.id));
  const visibleModels = owner
    ? models
    : models
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
