import { notFound } from "next/navigation";
import { HIDDEN_ROUND_IDS, getBakeoffRound } from "@/lib/bakeoff";
import { isOwner } from "@/lib/owner";
import { LabComparison } from "../lab-comparison";

// One bake-off round: slug is the Direction id. Builds the game from the live
// commons (the round's submitted languages), so it reflects submissions as they
// land — including those still UnderReview. Rounds in HIDDEN_ROUND_IDS
// (active drafting) 404 for everyone except the owner.

// The hidden-round check reads the session cookie, so the route is dynamic;
// round assembly stays cached via unstable_cache inside getBakeoffRound.
export const dynamic = "force-dynamic";

export default async function LabComparisonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (HIDDEN_ROUND_IDS.has(slug) && !(await isOwner())) notFound();
  const comparison = await getBakeoffRound(slug);
  if (!comparison) notFound();
  return <LabComparison comparison={comparison} />;
}
