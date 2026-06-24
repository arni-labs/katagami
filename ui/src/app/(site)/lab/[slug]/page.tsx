import { notFound } from "next/navigation";
import { getComparison } from "../comparisons";
import { LabComparison } from "../lab-comparison";

export const dynamic = "force-static";

export default async function LabComparisonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const comparison = getComparison(slug);
  if (!comparison) notFound();
  return <LabComparison comparison={comparison} />;
}
