import { notFound } from "next/navigation";
import {
  HIDDEN_ROUND_IDS,
  getBakeoffRound,
  getBakeoffRoundWithPending,
} from "@/lib/bakeoff";
import { isOwner } from "@/lib/owner";
import { LabComparison } from "../lab-comparison";

// One bake-off round: slug is the Direction id. Builds the game from the live
// commons (UnderReview + Published). Rounds in HIDDEN_ROUND_IDS (active drafting)
// 404 for everyone except the owner. View language stays off for visitors
// when /language/[id] would 404.

// The owner check reads the session cookie, so the route is dynamic;
// round assembly stays cached via unstable_cache inside the round getters.
export const dynamic = "force-dynamic";

export default async function LabComparisonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const owner = await isOwner();
  if (HIDDEN_ROUND_IDS.has(slug) && !owner) notFound();
  const comparison = owner
    ? await getBakeoffRoundWithPending(slug)
    : await getBakeoffRound(slug);
  if (!comparison) notFound();
  return (
    <LabComparison
      comparison={comparison}
      linkUnpublishedLanguages={owner}
    />
  );
}
