import { notFound } from "next/navigation";
import { getBakeoffRound } from "@/lib/bakeoff";
import { LabComparison } from "../lab-comparison";

// One bake-off round: slug is the Direction id. Builds the game from the live
// commons (the round's submitted languages), so it reflects submissions as they
// land — including those still UnderReview.

export const dynamic = "force-dynamic";

export default async function LabComparisonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const comparison = await getBakeoffRound(slug);
  if (!comparison) notFound();
  return <LabComparison comparison={comparison} />;
}
