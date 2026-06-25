import { notFound } from "next/navigation";
import { getBakeoffRound } from "@/lib/bakeoff";
import { LabComparison } from "../lab-comparison";

// One bake-off round: slug is the Direction id. Builds the game from the live
// commons (the round's submitted languages), so it reflects submissions as they
// land — including those still UnderReview.

// ISR: cache the assembled round per slug and revalidate in the background. It
// was force-dynamic, re-scanning the catalog on every open (slow TTFB).
export const revalidate = 60;

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
