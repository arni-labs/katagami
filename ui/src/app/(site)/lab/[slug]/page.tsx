import { notFound } from "next/navigation";
import { getBakeoffRound } from "@/lib/bakeoff";
import { isOwner } from "@/lib/owner";
import { LabComparison } from "../lab-comparison";

// One bake-off round: slug is the Direction id. Builds the game from the live
// commons (the round's submitted languages), so it reflects submissions as they
// land — including those still UnderReview. Because rounds show work in
// progress (including rejected/ugly attempts), they are OWNER-ONLY; the
// public, curated bake-off lives at /model-bake-off.

// Owner gating reads the session cookie, so the route is dynamic; the round
// assembly itself stays cached via unstable_cache inside getBakeoffRound.
export const dynamic = "force-dynamic";

export default async function LabComparisonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!(await isOwner())) notFound();
  const { slug } = await params;
  const comparison = await getBakeoffRound(slug);
  if (!comparison) notFound();
  return <LabComparison comparison={comparison} />;
}
